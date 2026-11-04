
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FinanzeController } from './finanze.controller';
import { FinanzeService } from './finanze.service';

import { Conto } from './entities/conto.entity';
import { Salvadanaio } from './entities/salvadanaio.entity';
import { OperazioneSalvadanaio } from './entities/operazione-salvadanaio.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conto,
      Salvadanaio,
      OperazioneSalvadanaio,
    ]),
  ],
  controllers: [FinanzeController],
  providers: [FinanzeService],
  exports: [FinanzeService],
})
export class FinanzeModule {}
