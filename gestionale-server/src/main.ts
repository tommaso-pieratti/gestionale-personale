
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefisso globale delle API
  app.setGlobalPrefix('api');

  // Consente l'accesso dal Mac e dai dispositivi
  // collegati alla stessa rete Wi-Fi.
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://127.0.0.1:4200',
      'http://192.168.1.13:4200',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Validazione globale delle richieste
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Porta del backend
  const port = Number(process.env.PORT || 3000);

  // Ascolta anche le connessioni dalla rete locale
  await app.listen(port, '0.0.0.0');

  console.log(
    `Backend disponibile sul Mac: http://localhost:${port}/api`,
  );

  console.log(
    `Backend disponibile in Wi-Fi: http://192.168.1.13:${port}/api`,
  );
}

bootstrap();
