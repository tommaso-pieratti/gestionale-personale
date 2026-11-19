
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ArchivioDocumento } from './entities/archivio-documento.entity';
import { ArchivioSessione } from './entities/archivio-sessione.entity';
import { ArchivioCartella } from './entities/archivio-cartella.entity';

import { ArchivioDocumentiService } from './archivio-documenti.service';
import { ArchivioDocumentiController } from './archivio-documenti.controller';
import { ArchivioAuthGuard } from './archivio-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ArchivioDocumento,
      ArchivioSessione,
      ArchivioCartella,
    ]),
  ],
  controllers: [
    ArchivioDocumentiController,
  ],
  providers: [
    ArchivioDocumentiService,
    ArchivioAuthGuard,
  ],
})
export class ArchivioDocumentiModule {}
