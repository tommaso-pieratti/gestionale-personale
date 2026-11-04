
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { FinanzeService } from './finanze.service';

import { ImpostaSaldoInizialeDto } from './dto/imposta-saldo-iniziale.dto';
import { CreaMovimentoDto } from './dto/crea-movimento.dto';
import { ModificaMovimentoDto } from './dto/modifica-movimento.dto';
import { CreaSalvadanaioDto } from './dto/crea-salvadanaio.dto';
import { OperazioneSalvadanaioDto } from './dto/operazione-salvadanaio.dto';

@Controller('finanze')
export class FinanzeController {
  constructor(
    private readonly finanzeService: FinanzeService,
  ) {}

  // =====================================================
  // CONTO
  // =====================================================

  @Get('conto')
  getConto() {
    return this.finanzeService.getConto();
  }

  @Post('conto/saldo-iniziale')
  impostaSaldoIniziale(
    @Body() dto: ImpostaSaldoInizialeDto,
  ) {
    return this.finanzeService.impostaSaldoIniziale(
      dto,
    );
  }

  @Get('riepilogo')
  getRiepilogo() {
    return this.finanzeService.getRiepilogo();
  }

  // =====================================================
  // MOVIMENTI
  // =====================================================

  @Get('movimenti')
  getMovimenti() {
    return this.finanzeService.getMovimenti();
  }

  @Post('movimenti')
  creaMovimento(
    @Body() dto: CreaMovimentoDto,
  ) {
    return this.finanzeService.creaMovimento(dto);
  }

  @Patch('movimenti/:id')
  modificaMovimento(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ModificaMovimentoDto,
  ) {
    return this.finanzeService.modificaMovimento(
      id,
      dto,
    );
  }

  @Delete('movimenti/:id')
  annullaMovimento(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.finanzeService.annullaMovimento(
      id,
    );
  }

  // =====================================================
  // SALVADANAI
  // =====================================================

  @Get('salvadanai')
  getSalvadanai() {
    return this.finanzeService.getSalvadanai();
  }

  @Get('salvadanai/:id')
  getSalvadanaio(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.finanzeService.getSalvadanaio(
      id,
    );
  }

  @Post('salvadanai')
  creaSalvadanaio(
    @Body() dto: CreaSalvadanaioDto,
  ) {
    return this.finanzeService.creaSalvadanaio(
      dto,
    );
  }

  @Post('salvadanai/:id/accantona')
  accantona(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OperazioneSalvadanaioDto,
  ) {
    return this.finanzeService.accantona(
      id,
      dto,
    );
  }

  @Post('salvadanai/:id/preleva')
  preleva(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: OperazioneSalvadanaioDto,
  ) {
    return this.finanzeService.preleva(
      id,
      dto,
    );
  }

  @Get('salvadanai/:id/operazioni')
  getOperazioni(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.finanzeService.getOperazioni(
      id,
    );
  }
}
