
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Salvadanaio {
  id: number;
  contoId: number;
  nome: string;
  descrizione: string | null;
  obiettivo: string;
  saldo: string;
  dataObiettivo: string | null;
  attivo: boolean;
  creatoIl: string;
}

export interface OperazioneSalvadanaio {
  id: number;
  salvadanaioId: number;
  tipo: 'ACCANTONAMENTO' | 'PRELIEVO';
  importo: string;
  nota: string | null;
  creatoIl: string;
}

export interface CreaSalvadanaio {
  nome: string;
  descrizione?: string;
  obiettivo: string;
  dataObiettivo?: string;
}

export interface RiepilogoSalvadanai {
  saldoIniziale: string;
  entrate: string;
  uscite: string;
  saldoConto: string;
  totaleSalvadanai: string;
  disponibilitaLibera: string;
  conto: {
    id: number;
    nome: string;
    valuta: string;
    configurato: boolean;
  };
}

export interface RisultatoOperazioneSalvadanaio {
  salvadanaio: Salvadanaio;
  operazione: OperazioneSalvadanaio;
}

@Injectable({
  providedIn: 'root'
})
export class SalvadanaiApiService {

  private readonly baseUrl =
    '/api/finanze';

  constructor(private http: HttpClient) {}

  getRiepilogo(): Observable<RiepilogoSalvadanai> {
    return this.http.get<RiepilogoSalvadanai>(
      `${this.baseUrl}/riepilogo`
    );
  }

  getSalvadanai(): Observable<Salvadanaio[]> {
    return this.http.get<Salvadanaio[]>(
      `${this.baseUrl}/salvadanai`
    );
  }

  getSalvadanaio(
    id: number
  ): Observable<Salvadanaio> {
    return this.http.get<Salvadanaio>(
      `${this.baseUrl}/salvadanai/${id}`
    );
  }

  creaSalvadanaio(
    dati: CreaSalvadanaio
  ): Observable<Salvadanaio> {
    return this.http.post<Salvadanaio>(
      `${this.baseUrl}/salvadanai`,
      dati
    );
  }

  accantona(
    id: number,
    importo: string,
    nota?: string
  ): Observable<RisultatoOperazioneSalvadanaio> {
    return this.http.post<RisultatoOperazioneSalvadanaio>(
      `${this.baseUrl}/salvadanai/${id}/accantona`,
      { importo, nota }
    );
  }

  preleva(
    id: number,
    importo: string,
    nota?: string
  ): Observable<RisultatoOperazioneSalvadanaio> {
    return this.http.post<RisultatoOperazioneSalvadanaio>(
      `${this.baseUrl}/salvadanai/${id}/preleva`,
      { importo, nota }
    );
  }

  getOperazioni(
    id: number
  ): Observable<OperazioneSalvadanaio[]> {
    return this.http.get<OperazioneSalvadanaio[]>(
      `${this.baseUrl}/salvadanai/${id}/operazioni`
    );
  }
}
