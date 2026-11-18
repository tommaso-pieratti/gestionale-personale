import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface ArchivioDocumento {
  id: string;
  nomeOriginale: string;
  mimeType: string;
  dimensioneOriginale: string;
  creatoIl: string;
}

@Injectable({ providedIn: 'root' })
export class ArchivioApiService {
  private readonly base = '/api/archivio-documenti';
  private token: string | null = null;
  constructor(private readonly http: HttpClient) {}
  get autenticato(): boolean { return !!this.token; }
  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.token ?? ''}` });
  }
  login(password: string): Observable<{ token: string; expiresInSeconds: number }> {
    return this.http.post<{ token: string; expiresInSeconds: number }>(`${this.base}/login`, { password })
      .pipe(tap(response => { this.token = response.token; }));
  }
  logout(): Observable<void> {
    const headers = this.headers();
    this.token = null;
    return this.http.post<void>(`${this.base}/logout`, {}, { headers });
  }
  blocca(): void { this.token = null; }
  elenco(): Observable<ArchivioDocumento[]> {
    return this.http.get<ArchivioDocumento[]>(this.base, { headers: this.headers() });
  }
  carica(file: File): Observable<ArchivioDocumento> {
    const data = new FormData(); data.append('file', file, file.name);
    return this.http.post<ArchivioDocumento>(`${this.base}/upload`, data, { headers: this.headers() });
  }
  file(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${encodeURIComponent(id)}/file`, {
      headers: this.headers(), responseType: 'blob'
    });
  }
  elimina(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`, { headers: this.headers() });
  }
}
