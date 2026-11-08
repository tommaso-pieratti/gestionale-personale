
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Auto } from './entities/auto.entity';
import { Rifornimento } from './entities/rifornimento.entity';

import { CarburanteController } from './carburante.controller';
import { CarburanteService } from './carburante.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Auto,
      Rifornimento,
    ]),
  ],
  controllers: [
    CarburanteController,
  ],
  providers: [
    CarburanteService,
  ],
})
export class CarburanteModule {}
