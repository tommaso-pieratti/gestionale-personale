
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  Auto,
  AutoPayload,
  Rifornimento,
  RifornimentoPayload,
  RiepilogoCarburante,
} from '../models/carburante.models';

@Injectable({
  providedIn: 'root',
})
export class CarburanteApiService {
  private readonly apiUrl =
    '/api/carburante';

  constructor(private readonly http: HttpClient) {}

  getRiepilogo(): Observable<RiepilogoCarburante> {
    return this.http.get<RiepilogoCarburante>(
      `${this.apiUrl}/riepilogo`
    );
  }

  getAuto(): Observable<Auto[]> {
    return this.http.get<Auto[]>(
      `${this.apiUrl}/auto`
    );
  }

  creaAuto(dati: AutoPayload): Observable<Auto> {
    return this.http.post<Auto>(
      `${this.apiUrl}/auto`,
      dati
    );
  }

  modificaAuto(
    id: number,
    dati: AutoPayload
  ): Observable<Auto> {
    return this.http.put<Auto>(
      `${this.apiUrl}/auto/${id}`,
      dati
    );
  }

  eliminaAuto(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/auto/${id}`
    );
  }

  getRifornimenti(): Observable<Rifornimento[]> {
    return this.http.get<Rifornimento[]>(
      `${this.apiUrl}/rifornimenti`
    );
  }

  creaRifornimento(
    dati: RifornimentoPayload
  ): Observable<Rifornimento> {
    return this.http.post<Rifornimento>(
      `${this.apiUrl}/rifornimenti`,
      dati
    );
  }

  modificaRifornimento(
    id: number,
    dati: RifornimentoPayload
  ): Observable<Rifornimento> {
    return this.http.put<Rifornimento>(
      `${this.apiUrl}/rifornimenti/${id}`,
      dati
    );
  }

  eliminaRifornimento(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/rifornimenti/${id}`
    );
  }
}
