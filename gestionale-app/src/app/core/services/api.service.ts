import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiStatus {
  application: string;
  status: string;
  version: string;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  getStatus(): Observable<ApiStatus> {
    return this.http.get<ApiStatus>(`${this.apiUrl}/status`);
  }
}