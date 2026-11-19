
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type CategoriaArchivio = 'pdf' | 'foto' | 'zip';

export interface ArchivioDocumento {
  id: string;
  nomeOriginale: string;
  mimeType: string;
  dimensioneOriginale: string;
  creatoIl: string;
  cartellaId: string | null;
}

export interface ArchivioCartella {
  id: string;
  nome: string;
  categoria: CategoriaArchivio;
  creatoIl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ArchivioApiService {
  private readonly base = '/api/archivio-documenti';
  private token: string | null = null;

  constructor(private readonly http: HttpClient) {}

  get autenticato(): boolean {
    return !!this.token;
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.token ?? ''}`
    });
  }

  login(password: string): Observable<{
    token: string;
    expiresInSeconds: number;
  }> {
    return this.http.post<{
      token: string;
      expiresInSeconds: number;
    }>(
      `${this.base}/login`,
      { password }
    ).pipe(
      tap(response => {
        this.token = response.token;
      })
    );
  }

  logout(): Observable<void> {
    const headers = this.headers();
    this.token = null;

    return this.http.post<void>(
      `${this.base}/logout`,
      {},
      { headers }
    );
  }

  blocca(): void {
    this.token = null;
  }

  elenco(): Observable<ArchivioDocumento[]> {
    return this.http.get<ArchivioDocumento[]>(
      this.base,
      { headers: this.headers() }
    );
  }

  elencoCartelle(): Observable<ArchivioCartella[]> {
    return this.http.get<ArchivioCartella[]>(
      `${this.base}/cartelle`,
      { headers: this.headers() }
    );
  }

  creaCartella(
    nome: string,
    categoria: CategoriaArchivio
  ): Observable<ArchivioCartella> {
    return this.http.post<ArchivioCartella>(
      `${this.base}/cartelle`,
      { nome, categoria },
      { headers: this.headers() }
    );
  }

  rinominaCartella(
    id: string,
    nome: string
  ): Observable<ArchivioCartella> {
    return this.http.patch<ArchivioCartella>(
      `${this.base}/cartelle/${encodeURIComponent(id)}`,
      { nome },
      { headers: this.headers() }
    );
  }

  eliminaCartella(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/cartelle/${encodeURIComponent(id)}`,
      { headers: this.headers() }
    );
  }

  carica(
    file: File,
    cartellaId: string | null = null
  ): Observable<ArchivioDocumento> {
    const data = new FormData();

    data.append('file', file, file.name);

    if (cartellaId) {
      data.append('cartellaId', cartellaId);
    }

    return this.http.post<ArchivioDocumento>(
      `${this.base}/upload`,
      data,
      { headers: this.headers() }
    );
  }

  spostaDocumento(
    id: string,
    cartellaId: string | null
  ): Observable<ArchivioDocumento> {
    return this.http.patch<ArchivioDocumento>(
      `${this.base}/${encodeURIComponent(id)}/cartella`,
      { cartellaId },
      { headers: this.headers() }
    );
  }

  file(id: string): Observable<Blob> {
    return this.http.get(
      `${this.base}/${encodeURIComponent(id)}/file`,
      {
        headers: this.headers(),
        responseType: 'blob'
      }
    );
  }

  elimina(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.base}/${encodeURIComponent(id)}`,
      { headers: this.headers() }
    );
  }
}
