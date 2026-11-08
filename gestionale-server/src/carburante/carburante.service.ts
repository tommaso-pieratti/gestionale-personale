
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';

import { AutoDto } from './dto/auto.dto';
import { RifornimentoDto } from './dto/rifornimento.dto';
import { Auto } from './entities/auto.entity';
import {
  Rifornimento,
  TipoRifornimento,
} from './entities/rifornimento.entity';

@Injectable()
export class CarburanteService {
  constructor(
    @InjectRepository(Auto)
    private readonly autoRepository: Repository<Auto>,

    @InjectRepository(Rifornimento)
    private readonly rifornimentoRepository: Repository<Rifornimento>,
  ) {}

  private validaId(id: number): void {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new BadRequestException('ID non valido');
    }
  }

  private testo(
    valore: unknown,
    massimo: number,
    obbligatorio = false,
  ): string | null {
    if (valore === null || valore === undefined) {
      if (obbligatorio) {
        throw new BadRequestException('Campo obbligatorio mancante');
      }
      return null;
    }

    if (typeof valore !== 'string') {
      throw new BadRequestException('Il campo deve essere un testo');
    }

    const testo = valore.trim();

    if (!testo) {
      if (obbligatorio) {
        throw new BadRequestException('Campo obbligatorio mancante');
      }
      return null;
    }

    if (testo.length > massimo) {
      throw new BadRequestException(
        `Il campo non può superare ${massimo} caratteri`,
      );
    }

    return testo;
  }

  private decimale(
    valore: unknown,
    precisione: number,
    scala: number,
  ): string {
    if (
      (typeof valore !== 'string' &&
        typeof valore !== 'number') ||
      (typeof valore === 'number' && !Number.isFinite(valore))
    ) {
      throw new BadRequestException('Valore numerico non valido');
    }

    const testo = String(valore).trim();
    const parti = testo.match(/^(\d+)(?:\.(\d+))?$/);

    if (!parti) {
      throw new BadRequestException(
        'Inserire un numero positivo usando il punto decimale',
      );
    }

    const interi = parti[1].replace(/^0+/, '') || '0';
    const decimali = parti[2] || '';

    if (
      decimali.length > scala ||
      interi.length > precisione - scala ||
      !/[1-9]/.test(interi + decimali)
    ) {
      throw new BadRequestException(
        `Valore non valido: massimo ${precisione - scala} cifre intere e ${scala} decimali`,
      );
    }

    return `${interi}.${decimali.padEnd(scala, '0')}`;
  }

  private data(valore: unknown): string {
    if (
      typeof valore !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(valore)
    ) {
      throw new BadRequestException(
        'La data deve avere formato YYYY-MM-DD',
      );
    }

    const [anno, mese, giorno] = valore.split('-').map(Number);

    if (anno < 1000 || anno > 9999) {
      throw new BadRequestException('Anno non valido');
    }

    const verifica = new Date(Date.UTC(anno, mese - 1, giorno));

    if (
      verifica.getUTCFullYear() !== anno ||
      verifica.getUTCMonth() !== mese - 1 ||
      verifica.getUTCDate() !== giorno
    ) {
      throw new BadRequestException('Data non valida');
    }

    return valore;
  }

  private validaAuto(dati: AutoDto): Partial<Auto> {
    if (!dati || typeof dati !== 'object' || Array.isArray(dati)) {
      throw new BadRequestException('Dati auto non validi');
    }

    return {
      nome: this.testo(dati.nome, 100, true)!,
      marca: this.testo(dati.marca, 100),
      modello: this.testo(dati.modello, 100),
      targa: this.testo(dati.targa, 20),
      alimentazione: this.testo(dati.alimentazione, 50),
      note: this.testo(dati.note, 65535),
    };
  }

  private async validaRifornimento(
    dati: RifornimentoDto,
  ): Promise<Partial<Rifornimento>> {
    if (!dati || typeof dati !== 'object' || Array.isArray(dati)) {
      throw new BadRequestException('Dati rifornimento non validi');
    }

    if (
      typeof dati.autoId !== 'number' ||
      !Number.isSafeInteger(dati.autoId)
    ) {
      throw new BadRequestException('Selezionare un’auto valida');
    }

    await this.trovaAuto(dati.autoId);

    let tipoRifornimento: TipoRifornimento | null = null;

    if (
      dati.tipoRifornimento !== null &&
      dati.tipoRifornimento !== undefined &&
      dati.tipoRifornimento !== ('' as TipoRifornimento)
    ) {
      if (
        dati.tipoRifornimento !== TipoRifornimento.PIENO &&
        dati.tipoRifornimento !== TipoRifornimento.PARZIALE
      ) {
        throw new BadRequestException(
          'Il tipo deve essere PIENO o PARZIALE',
        );
      }

      tipoRifornimento = dati.tipoRifornimento;
    }

    let kmAttuali: number | null = null;

    if (
      dati.kmAttuali !== null &&
      dati.kmAttuali !== undefined &&
      dati.kmAttuali !== ('' as unknown)
    ) {
      if (
        typeof dati.kmAttuali !== 'number' ||
        !Number.isSafeInteger(dati.kmAttuali) ||
        dati.kmAttuali < 0 ||
        dati.kmAttuali > 4294967295
      ) {
        throw new BadRequestException(
          'I chilometri devono essere un numero intero non negativo',
        );
      }

      kmAttuali = dati.kmAttuali;
    }

    return {
      autoId: dati.autoId,
      dataRifornimento: this.data(dati.dataRifornimento),
      importo: this.decimale(dati.importo, 12, 2),
      litri: this.decimale(dati.litri, 12, 3),
      tipoRifornimento,
      kmAttuali,
      distributore: this.testo(dati.distributore, 150),
    };
  }

  // AUTO

  elencoAuto(): Promise<Auto[]> {
    return this.autoRepository.find({
      order: {
        nome: 'ASC',
        id: 'ASC',
      },
    });
  }

  async trovaAuto(id: number): Promise<Auto> {
    this.validaId(id);

    const auto = await this.autoRepository.findOneBy({ id });

    if (!auto) {
      throw new NotFoundException('Auto non trovata');
    }

    return auto;
  }

  async creaAuto(dati: AutoDto): Promise<Auto> {
    const auto = this.autoRepository.create(
      this.validaAuto(dati),
    );

    return this.autoRepository.save(auto);
  }

  async modificaAuto(id: number, dati: AutoDto): Promise<Auto> {
    const auto = await this.trovaAuto(id);

    Object.assign(auto, this.validaAuto(dati));

    return this.autoRepository.save(auto);
  }

  async eliminaAuto(id: number): Promise<void> {
    await this.trovaAuto(id);

    const totale = await this.rifornimentoRepository.count({
      where: { autoId: id },
    });

    if (totale > 0) {
      throw new ConflictException(
        'Impossibile eliminare l’auto: esistono rifornimenti associati',
      );
    }

    try {
      await this.autoRepository.delete(id);
    } catch (errore) {
      if (errore instanceof QueryFailedError) {
        const codice = (
          errore.driverError as { code?: string }
        )?.code;

        if (codice === 'ER_ROW_IS_REFERENCED_2') {
          throw new ConflictException(
            'Impossibile eliminare l’auto: esistono rifornimenti associati',
          );
        }
      }

      throw errore;
    }
  }

  // RIFORNIMENTI

  private formattaRifornimento(rifornimento: Rifornimento) {
    return {
      ...rifornimento,
      prezzoAlLitro: (
        Number(rifornimento.importo) /
        Number(rifornimento.litri)
      ).toFixed(3),
    };
  }

  async elencoRifornimenti() {
    const elenco = await this.rifornimentoRepository.find({
      relations: { auto: true },
      order: {
        dataRifornimento: 'DESC',
        id: 'DESC',
      },
    });

    return elenco.map((rifornimento) =>
      this.formattaRifornimento(rifornimento),
    );
  }

  async trovaRifornimento(id: number): Promise<Rifornimento> {
    this.validaId(id);

    const rifornimento = await this.rifornimentoRepository.findOne({
      where: { id },
      relations: { auto: true },
    });

    if (!rifornimento) {
      throw new NotFoundException('Rifornimento non trovato');
    }

    return rifornimento;
  }

  async dettaglioRifornimento(id: number) {
    return this.formattaRifornimento(
      await this.trovaRifornimento(id),
    );
  }

  async creaRifornimento(dati: RifornimentoDto) {
    const valori = await this.validaRifornimento(dati);
    const nuovo = this.rifornimentoRepository.create(valori);
    const salvato = await this.rifornimentoRepository.save(nuovo);

    return this.dettaglioRifornimento(salvato.id);
  }

  async modificaRifornimento(
    id: number,
    dati: RifornimentoDto,
  ) {
    const rifornimento = await this.trovaRifornimento(id);
    const valori = await this.validaRifornimento(dati);

    Object.assign(rifornimento, valori);

    await this.rifornimentoRepository.save(rifornimento);

    return this.dettaglioRifornimento(id);
  }

  async eliminaRifornimento(id: number): Promise<void> {
    await this.trovaRifornimento(id);
    await this.rifornimentoRepository.delete(id);
  }

  // RIEPILOGO

  async riepilogo() {
    const risultato = await this.rifornimentoRepository
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.importo), 0)', 'totaleSpeso')
      .addSelect('COALESCE(SUM(r.litri), 0)', 'totaleLitri')
      .getRawOne<{
        totaleSpeso: string;
        totaleLitri: string;
      }>();

    return {
      totaleSpeso: Number(
        risultato?.totaleSpeso ?? '0',
      ).toFixed(2),
      totaleLitri: Number(
        risultato?.totaleLitri ?? '0',
      ).toFixed(3),
    };
  }
}
