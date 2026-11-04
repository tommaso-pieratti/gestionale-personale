
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Conto } from './entities/conto.entity';
import { Salvadanaio } from './entities/salvadanaio.entity';
import {
  OperazioneSalvadanaio,
  TipoOperazioneSalvadanaio,
} from './entities/operazione-salvadanaio.entity';

import { CreaSalvadanaioDto } from './dto/crea-salvadanaio.dto';
import { OperazioneSalvadanaioDto } from './dto/operazione-salvadanaio.dto';

@Injectable()
export class FinanzeService {
  constructor(
    @InjectRepository(Conto)
    private readonly contiRepository: Repository<Conto>,

    @InjectRepository(Salvadanaio)
    private readonly salvadanaiRepository: Repository<Salvadanaio>,

    @InjectRepository(OperazioneSalvadanaio)
    private readonly operazioniRepository: Repository<OperazioneSalvadanaio>,

    private readonly dataSource: DataSource,
  ) {}

  private inCentesimi(importo: string): bigint {
    if (!/^\d{1,13}(\.\d{1,2})?$/.test(importo)) {
      throw new BadRequestException('Importo non valido');
    }

    const [euro, decimali = ''] = importo.split('.');

    return (
      BigInt(euro) * 100n +
      BigInt(decimali.padEnd(2, '0'))
    );
  }

  private inEuro(centesimi: bigint): string {
    const segno = centesimi < 0n ? '-' : '';
    const valore = centesimi < 0n ? -centesimi : centesimi;

    return (
      segno +
      (valore / 100n).toString() +
      '.' +
      (valore % 100n).toString().padStart(2, '0')
    );
  }

  private async trovaConto(
    manager: EntityManager,
    blocca = false,
  ): Promise<Conto> {
    const query = manager
      .getRepository(Conto)
      .createQueryBuilder('conto')
      .orderBy('conto.id', 'ASC');

    if (blocca) {
      query.setLock('pessimistic_write');
    }

    const conto = await query.getOne();

    if (!conto) {
      throw new NotFoundException('Conto personale non trovato');
    }

    return conto;
  }

  private async totaleAccantonato(
    manager: EntityManager,
    contoId: number,
  ): Promise<bigint> {
    const salvadanai = await manager.find(Salvadanaio, {
      where: { contoId },
    });

    return salvadanai.reduce(
      (totale, salvadanaio) =>
        totale + this.inCentesimi(salvadanaio.saldo),
      0n,
    );
  }

  async getRiepilogo() {
    const conto = await this.trovaConto(this.dataSource.manager);

    const saldo = this.inCentesimi(conto.saldoIniziale);

    const accantonato = await this.totaleAccantonato(
      this.dataSource.manager,
      conto.id,
    );

    return {
      conto: {
        id: conto.id,
        nome: conto.nome,
        valuta: conto.valuta,
      },
      saldoConto: this.inEuro(saldo),
      totaleSalvadanai: this.inEuro(accantonato),
      disponibilitaLibera: this.inEuro(saldo - accantonato),
    };
  }

  async getSalvadanai() {
    const conto = await this.trovaConto(this.dataSource.manager);

    return this.salvadanaiRepository.find({
      where: { contoId: conto.id },
      order: { id: 'DESC' },
    });
  }

  async getSalvadanaio(id: number) {
    const conto = await this.trovaConto(this.dataSource.manager);

    const salvadanaio = await this.salvadanaiRepository.findOneBy({
      id,
      contoId: conto.id,
    });

    if (!salvadanaio) {
      throw new NotFoundException('Salvadanaio non trovato');
    }

    return salvadanaio;
  }

  async creaSalvadanaio(dto: CreaSalvadanaioDto) {
    const conto = await this.trovaConto(this.dataSource.manager);

    if (this.inCentesimi(dto.obiettivo) <= 0n) {
      throw new BadRequestException(
        'L’obiettivo deve essere maggiore di zero',
      );
    }

    const salvadanaio = this.salvadanaiRepository.create({
      contoId: conto.id,
      nome: dto.nome.trim(),
      descrizione: dto.descrizione?.trim() || null,
      obiettivo: this.inEuro(this.inCentesimi(dto.obiettivo)),
      saldo: '0.00',
      dataObiettivo: dto.dataObiettivo || null,
      attivo: true,
    });

    if (!salvadanaio.nome) {
      throw new BadRequestException('Il nome è obbligatorio');
    }

    return this.salvadanaiRepository.save(salvadanaio);
  }

  async accantona(id: number, dto: OperazioneSalvadanaioDto) {
    return this.eseguiOperazione(
      id,
      dto,
      TipoOperazioneSalvadanaio.ACCANTONAMENTO,
    );
  }

  async preleva(id: number, dto: OperazioneSalvadanaioDto) {
    return this.eseguiOperazione(
      id,
      dto,
      TipoOperazioneSalvadanaio.PRELIEVO,
    );
  }

  private async eseguiOperazione(
    id: number,
    dto: OperazioneSalvadanaioDto,
    tipo: TipoOperazioneSalvadanaio,
  ) {
    const importo = this.inCentesimi(dto.importo);

    if (importo <= 0n) {
      throw new BadRequestException(
        'L’importo deve essere maggiore di zero',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const conto = await this.trovaConto(manager, true);

      const salvadanaio = await manager
        .getRepository(Salvadanaio)
        .createQueryBuilder('salvadanaio')
        .where('salvadanaio.id = :id', { id })
        .andWhere('salvadanaio.conto_id = :contoId', {
          contoId: conto.id,
        })
        .setLock('pessimistic_write')
        .getOne();

      if (!salvadanaio) {
        throw new NotFoundException('Salvadanaio non trovato');
      }

      if (!salvadanaio.attivo) {
        throw new BadRequestException(
          'Il salvadanaio non è attivo',
        );
      }

      const saldoSalvadanaio = this.inCentesimi(
        salvadanaio.saldo,
      );

      if (tipo === TipoOperazioneSalvadanaio.ACCANTONAMENTO) {
        const saldoConto = this.inCentesimi(
          conto.saldoIniziale,
        );

        const totaleRiservato = await this.totaleAccantonato(
          manager,
          conto.id,
        );

        const disponibile = saldoConto - totaleRiservato;

        if (importo > disponibile) {
          throw new BadRequestException(
            'Disponibilità libera insufficiente',
          );
        }

        salvadanaio.saldo = this.inEuro(
          saldoSalvadanaio + importo,
        );
      } else {
        if (importo > saldoSalvadanaio) {
          throw new BadRequestException(
            'Saldo del salvadanaio insufficiente',
          );
        }

        salvadanaio.saldo = this.inEuro(
          saldoSalvadanaio - importo,
        );
      }

      await manager.save(Salvadanaio, salvadanaio);

      const operazione = manager.create(
        OperazioneSalvadanaio,
        {
          salvadanaioId: salvadanaio.id,
          tipo,
          importo: this.inEuro(importo),
          nota: dto.nota?.trim() || null,
        },
      );

      const operazioneSalvata = await manager.save(
        OperazioneSalvadanaio,
        operazione,
      );

      return {
        salvadanaio,
        operazione: operazioneSalvata,
      };
    });
  }

  async getOperazioni(id: number) {
    await this.getSalvadanaio(id);

    return this.operazioniRepository.find({
      where: { salvadanaioId: id },
      order: {
        creatoIl: 'DESC',
        id: 'DESC',
      },
    });
  }
}
