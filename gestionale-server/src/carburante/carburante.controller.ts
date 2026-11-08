
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';

import { CarburanteService } from './carburante.service';
import { AutoDto } from './dto/auto.dto';
import { RifornimentoDto } from './dto/rifornimento.dto';

@Controller('carburante')
export class CarburanteController {
  constructor(
    private readonly carburanteService: CarburanteService,
  ) {}

  // RIEPILOGO

  @Get('riepilogo')
  riepilogo() {
    return this.carburanteService.riepilogo();
  }

  // AUTO

  @Get('auto')
  elencoAuto() {
    return this.carburanteService.elencoAuto();
  }

  @Get('auto/:id')
  trovaAuto(@Param('id', ParseIntPipe) id: number) {
    return this.carburanteService.trovaAuto(id);
  }

  @Post('auto')
  creaAuto(@Body() dati: AutoDto) {
    return this.carburanteService.creaAuto(dati);
  }

  @Put('auto/:id')
  modificaAuto(
    @Param('id', ParseIntPipe) id: number,
    @Body() dati: AutoDto,
  ) {
    return this.carburanteService.modificaAuto(id, dati);
  }

  @Delete('auto/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminaAuto(@Param('id', ParseIntPipe) id: number) {
    return this.carburanteService.eliminaAuto(id);
  }

  // RIFORNIMENTI

  @Get('rifornimenti')
  elencoRifornimenti() {
    return this.carburanteService.elencoRifornimenti();
  }

  @Get('rifornimenti/:id')
  trovaRifornimento(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.carburanteService.dettaglioRifornimento(id);
  }

  @Post('rifornimenti')
  creaRifornimento(@Body() dati: RifornimentoDto) {
    return this.carburanteService.creaRifornimento(dati);
  }

  @Put('rifornimenti/:id')
  modificaRifornimento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dati: RifornimentoDto,
  ) {
    return this.carburanteService.modificaRifornimento(
      id,
      dati,
    );
  }

  @Delete('rifornimenti/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  eliminaRifornimento(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.carburanteService.eliminaRifornimento(id);
  }
}
