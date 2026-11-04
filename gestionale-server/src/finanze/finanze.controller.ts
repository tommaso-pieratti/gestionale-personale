
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { FinanzeService } from './finanze.service';
import { CreaSalvadanaioDto } from './dto/crea-salvadanaio.dto';
import { OperazioneSalvadanaioDto } from './dto/operazione-salvadanaio.dto';

@Controller('finanze')
export class FinanzeController {
  constructor(
    private readonly finanzeService: FinanzeService,
  ) {}

  @Get('riepilogo')
  getRiepilogo() {
    return this.finanzeService.getRiepilogo();
  }

  @Get('salvadanai')
  getSalvadanai() {
    return this.finanzeService.getSalvadanai();
  }

  @Get('salvadanai/:id')
  getSalvadanaio(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.finanzeService.getSalvadanaio(id);
  }

  @Post('salvadanai')
  creaSalvadanaio(
    @Body() dto: CreaSalvadanaioDto,
  ) {
    return this.finanzeService.creaSalvadanaio(dto);
  }

  @Post('salvadanai/:id/accantona')
  accantona(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OperazioneSalvadanaioDto,
  ) {
    return this.finanzeService.accantona(id, dto);
  }

  @Post('salvadanai/:id/preleva')
  preleva(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OperazioneSalvadanaioDto,
  ) {
    return this.finanzeService.preleva(id, dto);
  }

  @Get('salvadanai/:id/operazioni')
  getOperazioni(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.finanzeService.getOperazioni(id);
  }
}
