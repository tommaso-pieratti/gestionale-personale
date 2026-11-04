import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getStatus() {
    return {
      application: 'Gestionale Personale',
      status: 'online',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
  }
}