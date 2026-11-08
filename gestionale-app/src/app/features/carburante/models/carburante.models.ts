
export type TipoRifornimento = 'PIENO' | 'PARZIALE';

export interface Auto {
  id: number;
  nome: string;
  marca: string | null;
  modello: string | null;
  targa: string | null;
  alimentazione: string | null;
  note: string | null;
  creatoIl: string;
  aggiornatoIl: string;
}

export interface AutoPayload {
  nome: string;
  marca: string | null;
  modello: string | null;
  targa: string | null;
  alimentazione: string | null;
  note: string | null;
}

export interface Rifornimento {
  id: number;
  autoId: number;
  auto: Auto;
  dataRifornimento: string;
  importo: string;
  litri: string;
  prezzoAlLitro: string;
  tipoRifornimento: TipoRifornimento | null;
  kmAttuali: number | null;
  distributore: string | null;
  creatoIl: string;
  aggiornatoIl: string;
}

export interface RifornimentoPayload {
  autoId: number;
  dataRifornimento: string;
  importo: string;
  litri: string;
  tipoRifornimento: TipoRifornimento | null;
  kmAttuali: number | null;
  distributore: string | null;
}

export interface RiepilogoCarburante {
  totaleSpeso: string;
  totaleLitri: string;
}
