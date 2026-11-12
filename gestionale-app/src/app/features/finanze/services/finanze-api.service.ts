
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TipoMovimento = 'ENTRATA' | 'USCITA';

export interface Conto {
  id: number;
  nome: string;
  valuta: string;
  saldoIniziale: string;
  configurato: boolean;
  saldoInizialeConfermatoIl: string | null;
}

export interface RiepilogoFinanze {
  conto: {
    id: number;
    nome: string;
    valuta: string;
    configurato: boolean;
  };
  saldoIniziale: string;
  entrate: string;
  uscite: string;
  saldoConto: string;
  totaleSalvadanai: string;
  disponibilitaLibera: string;
}

export interface Movimento {
  id: number;
  contoId: number;
  tipo: TipoMovimento;
  importo: string;
  descrizione: string;
  categoria: string | null;
  dataMovimento: string;
  note: string | null;
  annullatoIl: string | null;
  creatoIl: string;
  aggiornatoIl: string;
}

export interface MovimentoPayload {
  tipo: TipoMovimento;
  importo: string;
  descrizione: string;
  categoria?: string;
  dataMovimento: string;
  note?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FinanzeApiService {
  private readonly baseUrl =
    '/api/finanze';

  constructor(private http: HttpClient) {}

  getConto(): Observable<Conto> {
    return this.http.get<Conto>(
      `${this.baseUrl}/conto`
    );
  }

  getRiepilogo(): Observable<RiepilogoFinanze> {
    return this.http.get<RiepilogoFinanze>(
      `${this.baseUrl}/riepilogo`
    );
  }

  impostaSaldoIniziale(saldoIniziale: string) {
    return this.http.post(
      `${this.baseUrl}/conto/saldo-iniziale`,
      { saldoIniziale }
    );
  }

  getMovimenti(): Observable<Movimento[]> {
    return this.http.get<Movimento[]>(
      `${this.baseUrl}/movimenti`
    );
  }

  creaMovimento(dati: MovimentoPayload) {
    return this.http.post<Movimento>(
      `${this.baseUrl}/movimenti`,
      dati
    );
  }

  modificaMovimento(
    id: number,
    dati: MovimentoPayload
  ) {
    return this.http.patch<Movimento>(
      `${this.baseUrl}/movimenti/${id}`,
      dati
    );
  }

  annullaMovimento(id: number) {
    return this.http.delete(
      `${this.baseUrl}/movimenti/${id}`
    );
  }
}
