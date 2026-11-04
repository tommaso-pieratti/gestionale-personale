
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  Repository,
} from 'typeorm';

import { Conto } from './entities/conto.entity';
import {
  Movimento,
  TipoMovimento,
} from './entities/movimento.entity';
import { Salvadanaio } from './entities/salvadanaio.entity';
import {
  OperazioneSalvadanaio,
  TipoOperazioneSalvadanaio,
} from './entities/operazione-salvadanaio.entity';

import { ImpostaSaldoInizialeDto } from './dto/imposta-saldo-iniziale.dto';
import { CreaMovimentoDto } from './dto/crea-movimento.dto';
import { ModificaMovimentoDto } from './dto/modifica-movimento.dto';
import { CreaSalvadanaioDto } from './dto/crea-salvadanaio.dto';
import { OperazioneSalvadanaioDto } from './dto/operazione-salvadanaio.dto';

@Injectable()
export class FinanzeService {
  constructor(
    @InjectRepository(Conto)
    private readonly contiRepository: Repository<Conto>,

    @InjectRepository(Movimento)
    private readonly movimentiRepository: Repository<Movimento>,

    @InjectRepository(Salvadanaio)
    private readonly salvadanaiRepository: Repository<Salvadanaio>,

    @InjectRepository(OperazioneSalvadanaio)
    private readonly operazioniRepository: Repository<OperazioneSalvadanaio>,

    private readonly dataSource: DataSource,
  ) {}

  // =====================================================
  // UTILITÀ MONETARIE
  // =====================================================

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
    const negativo = centesimi < 0n;
    const valore = negativo ? -centesimi : centesimi;

    const euro = valore / 100n;
    const cent = valore % 100n;

    return (
      (negativo ? '-' : '') +
      euro.toString() +
      '.' +
      cent.toString().padStart(2, '0')
    );
  }

  private controllaLimite(importo: bigint): void {
    const massimo = 999999999999999n;

    if (importo > massimo || importo < -massimo) {
      throw new BadRequestException(
        'Importo fuori dai limiti consentiti',
      );
    }
  }

  private controllaData(data: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      throw new BadRequestException(
        'Data non valida: usare YYYY-MM-DD',
      );
    }

    const [anno, mese, giorno] = data
      .split('-')
      .map(Number);

    const verifica = new Date(
      Date.UTC(anno, mese - 1, giorno),
    );

    if (
      verifica.getUTCFullYear() !== anno ||
      verifica.getUTCMonth() + 1 !== mese ||
      verifica.getUTCDate() !== giorno
    ) {
      throw new BadRequestException(
        'La data indicata non esiste',
      );
    }
  }

  // =====================================================
  // CONTO PERSONALE
  // =====================================================

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
      throw new NotFoundException(
        'Conto personale non trovato',
      );
    }

    return conto;
  }

  private controllaContoConfigurato(conto: Conto): void {
    if (!conto.saldoInizialeConfermatoIl) {
      throw new BadRequestException(
        'Devi prima confermare il saldo iniziale',
      );
    }
  }

  async getConto() {
    const conto = await this.trovaConto(
      this.dataSource.manager,
    );

    return {
      id: conto.id,
      nome: conto.nome,
      valuta: conto.valuta,
      saldoIniziale: conto.saldoIniziale,
      configurato: Boolean(
        conto.saldoInizialeConfermatoIl,
      ),
      saldoInizialeConfermatoIl:
        conto.saldoInizialeConfermatoIl,
    };
  }

  async impostaSaldoIniziale(
    dto: ImpostaSaldoInizialeDto,
  ) {
    const importo = this.inCentesimi(
      dto.saldoIniziale,
    );

    this.controllaLimite(importo);

    return this.dataSource.transaction(
      async (manager) => {
        const conto = await this.trovaConto(
          manager,
          true,
        );

        if (conto.saldoInizialeConfermatoIl) {
          throw new ConflictException(
            'Il saldo iniziale è già stato confermato',
          );
        }

        const movimentiPresenti = await manager.count(
          Movimento,
          {
            where: { contoId: conto.id },
          },
        );

        if (movimentiPresenti > 0) {
          throw new ConflictException(
            'Esistono già movimenti sul conto',
          );
        }

        const accantonato =
          await this.totaleAccantonato(
            manager,
            conto.id,
          );

        if (importo < accantonato) {
          throw new BadRequestException(
            'Il saldo iniziale non può essere inferiore agli accantonamenti esistenti',
          );
        }

        conto.saldoIniziale = this.inEuro(importo);
        conto.saldoInizialeConfermatoIl =
          new Date();

        await manager.save(Conto, conto);

        return {
          messaggio:
            'Saldo iniziale confermato definitivamente',
          contoId: conto.id,
          saldoIniziale: conto.saldoIniziale,
          confermatoIl:
            conto.saldoInizialeConfermatoIl,
        };
      },
    );
  }

  // =====================================================
  // CALCOLI FINANZIARI
  // =====================================================

  private async calcolaMovimenti(
    manager: EntityManager,
    contoId: number,
  ) {
    const movimenti = await manager.find(Movimento, {
      where: {
        contoId,
        annullatoIl: IsNull(),
      },
    });

    let entrate = 0n;
    let uscite = 0n;

    for (const movimento of movimenti) {
      const importo = this.inCentesimi(
        movimento.importo,
      );

      if (movimento.tipo === TipoMovimento.ENTRATA) {
        entrate += importo;
      } else {
        uscite += importo;
      }
    }

    return { entrate, uscite };
  }

  private async totaleAccantonato(
    manager: EntityManager,
    contoId: number,
  ): Promise<bigint> {
    const salvadanai = await manager.find(
      Salvadanaio,
      {
        where: { contoId },
      },
    );

    return salvadanai.reduce(
      (totale, salvadanaio) =>
        totale +
        this.inCentesimi(salvadanaio.saldo),
      0n,
    );
  }

  private async situazioneFinanziaria(
    manager: EntityManager,
    conto: Conto,
  ) {
    const saldoIniziale = this.inCentesimi(
      conto.saldoIniziale,
    );

    const { entrate, uscite } =
      await this.calcolaMovimenti(
        manager,
        conto.id,
      );

    const totaleSalvadanai =
      await this.totaleAccantonato(
        manager,
        conto.id,
      );

    const saldoAttuale =
      saldoIniziale + entrate - uscite;

    const disponibilitaLibera =
      saldoAttuale - totaleSalvadanai;

    return {
      saldoIniziale,
      entrate,
      uscite,
      saldoAttuale,
      totaleSalvadanai,
      disponibilitaLibera,
    };
  }

  async getRiepilogo() {
    const conto = await this.trovaConto(
      this.dataSource.manager,
    );

    const situazione =
      await this.situazioneFinanziaria(
        this.dataSource.manager,
        conto,
      );

    return {
      conto: {
        id: conto.id,
        nome: conto.nome,
        valuta: conto.valuta,
        configurato: Boolean(
          conto.saldoInizialeConfermatoIl,
        ),
      },
      saldoIniziale: this.inEuro(
        situazione.saldoIniziale,
      ),
      entrate: this.inEuro(
        situazione.entrate,
      ),
      uscite: this.inEuro(
        situazione.uscite,
      ),
      saldoConto: this.inEuro(
        situazione.saldoAttuale,
      ),
      totaleSalvadanai: this.inEuro(
        situazione.totaleSalvadanai,
      ),
      disponibilitaLibera: this.inEuro(
        situazione.disponibilitaLibera,
      ),
    };
  }

  // =====================================================
  // MOVIMENTI
  // =====================================================

  async getMovimenti() {
    const conto = await this.trovaConto(
      this.dataSource.manager,
    );

    return this.movimentiRepository.find({
      where: {
        contoId: conto.id,
      },
      order: {
        dataMovimento: 'DESC',
        id: 'DESC',
      },
    });
  }

  private async trovaMovimento(
    manager: EntityManager,
    id: number,
    contoId: number,
  ): Promise<Movimento> {
    const movimento = await manager.findOne(
      Movimento,
      {
        where: {
          id,
          contoId,
        },
      },
    );

    if (!movimento) {
      throw new NotFoundException(
        'Movimento non trovato',
      );
    }

    return movimento;
  }

  private async verificaDisponibilita(
    manager: EntityManager,
    conto: Conto,
  ): Promise<void> {
    const situazione =
      await this.situazioneFinanziaria(
        manager,
        conto,
      );

    if (situazione.disponibilitaLibera < 0n) {
      throw new BadRequestException(
        'Operazione non consentita: il saldo disponibile diventerebbe negativo',
      );
    }

    this.controllaLimite(
      situazione.saldoAttuale,
    );
  }

  async creaMovimento(dto: CreaMovimentoDto) {
    const importo = this.inCentesimi(
      dto.importo,
    );

    if (importo <= 0n) {
      throw new BadRequestException(
        'L’importo deve essere maggiore di zero',
      );
    }

    this.controllaData(dto.dataMovimento);

    const descrizione =
      dto.descrizione.trim();

    if (!descrizione) {
      throw new BadRequestException(
        'La descrizione è obbligatoria',
      );
    }

    return this.dataSource.transaction(
      async (manager) => {
        const conto = await this.trovaConto(
          manager,
          true,
        );

        this.controllaContoConfigurato(conto);

        const movimento = manager.create(
          Movimento,
          {
            contoId: conto.id,
            tipo: dto.tipo,
            importo: this.inEuro(importo),
            descrizione,
            categoria:
              dto.categoria?.trim() || null,
            dataMovimento: dto.dataMovimento,
            note: dto.note?.trim() || null,
            annullatoIl: null,
          },
        );

        const salvato = await manager.save(
          Movimento,
          movimento,
        );

        await this.verificaDisponibilita(
          manager,
          conto,
        );

        return salvato;
      },
    );
  }

  async modificaMovimento(
    id: number,
    dto: ModificaMovimentoDto,
  ) {
    return this.dataSource.transaction(
      async (manager) => {
        const conto = await this.trovaConto(
          manager,
          true,
        );

        this.controllaContoConfigurato(conto);

        const movimento =
          await this.trovaMovimento(
            manager,
            id,
            conto.id,
          );

        if (movimento.annullatoIl) {
          throw new ConflictException(
            'Non puoi modificare un movimento annullato',
          );
        }

        if (dto.tipo !== undefined) {
          movimento.tipo = dto.tipo;
        }

        if (dto.importo !== undefined) {
          const importo = this.inCentesimi(
            dto.importo,
          );

          if (importo <= 0n) {
            throw new BadRequestException(
              'L’importo deve essere maggiore di zero',
            );
          }

          movimento.importo = this.inEuro(
            importo,
          );
        }

        if (dto.descrizione !== undefined) {
          const descrizione =
            dto.descrizione.trim();

          if (!descrizione) {
            throw new BadRequestException(
              'La descrizione è obbligatoria',
            );
          }

          movimento.descrizione = descrizione;
        }

        if (dto.categoria !== undefined) {
          movimento.categoria =
            dto.categoria.trim() || null;
        }

        if (dto.dataMovimento !== undefined) {
          this.controllaData(
            dto.dataMovimento,
          );

          movimento.dataMovimento =
            dto.dataMovimento;
        }

        if (dto.note !== undefined) {
          movimento.note =
            dto.note.trim() || null;
        }

        const salvato = await manager.save(
          Movimento,
          movimento,
        );

        await this.verificaDisponibilita(
          manager,
          conto,
        );

        return salvato;
      },
    );
  }

  async annullaMovimento(id: number) {
    return this.dataSource.transaction(
      async (manager) => {
        const conto = await this.trovaConto(
          manager,
          true,
        );

        const movimento =
          await this.trovaMovimento(
            manager,
            id,
            conto.id,
          );

        if (movimento.annullatoIl) {
          throw new ConflictException(
            'Il movimento è già annullato',
          );
        }

        movimento.annullatoIl = new Date();

        await manager.save(
          Movimento,
          movimento,
        );

        await this.verificaDisponibilita(
          manager,
          conto,
        );

        return {
          messaggio: 'Movimento annullato',
          movimentoId: id,
        };
      },
    );
  }

  // =====================================================
  // SALVADANAI
  // =====================================================

  async getSalvadanai() {
    const conto = await this.trovaConto(
      this.dataSource.manager,
    );

    return this.salvadanaiRepository.find({
      where: { contoId: conto.id },
      order: { id: 'DESC' },
    });
  }

  async getSalvadanaio(id: number) {
    const conto = await this.trovaConto(
      this.dataSource.manager,
    );

    const salvadanaio =
      await this.salvadanaiRepository.findOneBy({
        id,
        contoId: conto.id,
      });

    if (!salvadanaio) {
      throw new NotFoundException(
        'Salvadanaio non trovato',
      );
    }

    return salvadanaio;
  }

  async creaSalvadanaio(
    dto: CreaSalvadanaioDto,
  ) {
    const conto = await this.trovaConto(
      this.dataSource.manager,
    );

    const obiettivo = this.inCentesimi(
      dto.obiettivo,
    );

    if (obiettivo <= 0n) {
      throw new BadRequestException(
        'L’obiettivo deve essere maggiore di zero',
      );
    }

    const nome = dto.nome.trim();

    if (!nome) {
      throw new BadRequestException(
        'Il nome è obbligatorio',
      );
    }

    if (dto.dataObiettivo) {
      this.controllaData(
        dto.dataObiettivo,
      );
    }

    const salvadanaio =
      this.salvadanaiRepository.create({
        contoId: conto.id,
        nome,
        descrizione:
          dto.descrizione?.trim() || null,
        obiettivo: this.inEuro(obiettivo),
        saldo: '0.00',
        dataObiettivo:
          dto.dataObiettivo || null,
        attivo: true,
      });

    return this.salvadanaiRepository.save(
      salvadanaio,
    );
  }

  async accantona(
    id: number,
    dto: OperazioneSalvadanaioDto,
  ) {
    return this.eseguiOperazioneSalvadanaio(
      id,
      dto,
      TipoOperazioneSalvadanaio.ACCANTONAMENTO,
    );
  }

  async preleva(
    id: number,
    dto: OperazioneSalvadanaioDto,
  ) {
    return this.eseguiOperazioneSalvadanaio(
      id,
      dto,
      TipoOperazioneSalvadanaio.PRELIEVO,
    );
  }

  private async eseguiOperazioneSalvadanaio(
    id: number,
    dto: OperazioneSalvadanaioDto,
    tipo: TipoOperazioneSalvadanaio,
  ) {
    const importo = this.inCentesimi(
      dto.importo,
    );

    if (importo <= 0n) {
      throw new BadRequestException(
        'L’importo deve essere maggiore di zero',
      );
    }

    return this.dataSource.transaction(
      async (manager) => {
        const conto = await this.trovaConto(
          manager,
          true,
        );

        this.controllaContoConfigurato(conto);

        const salvadanaio = await manager
          .getRepository(Salvadanaio)
          .createQueryBuilder('salvadanaio')
          .where('salvadanaio.id = :id', {
            id,
          })
          .andWhere(
            'salvadanaio.conto_id = :contoId',
            { contoId: conto.id },
          )
          .setLock('pessimistic_write')
          .getOne();

        if (!salvadanaio) {
          throw new NotFoundException(
            'Salvadanaio non trovato',
          );
        }

        if (!salvadanaio.attivo) {
          throw new BadRequestException(
            'Il salvadanaio non è attivo',
          );
        }

        const saldoSalvadanaio =
          this.inCentesimi(
            salvadanaio.saldo,
          );

        if (
          tipo ===
          TipoOperazioneSalvadanaio.ACCANTONAMENTO
        ) {
          const situazione =
            await this.situazioneFinanziaria(
              manager,
              conto,
            );

          if (
            importo >
            situazione.disponibilitaLibera
          ) {
            throw new BadRequestException(
              'Disponibilità libera insufficiente',
            );
          }

          const nuovoSaldo =
            saldoSalvadanaio + importo;

          this.controllaLimite(nuovoSaldo);

          salvadanaio.saldo = this.inEuro(
            nuovoSaldo,
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

        await manager.save(
          Salvadanaio,
          salvadanaio,
        );

        const operazione = manager.create(
          OperazioneSalvadanaio,
          {
            salvadanaioId: salvadanaio.id,
            tipo,
            importo: this.inEuro(importo),
            nota: dto.nota?.trim() || null,
          },
        );

        const operazioneSalvata =
          await manager.save(
            OperazioneSalvadanaio,
            operazione,
          );

        return {
          salvadanaio,
          operazione: operazioneSalvata,
        };
      },
    );
  }

  async getOperazioni(id: number) {
    await this.getSalvadanaio(id);

    return this.operazioniRepository.find({
      where: {
        salvadanaioId: id,
      },
      order: {
        creatoIl: 'DESC',
        id: 'DESC',
      },
    });
  }
}
