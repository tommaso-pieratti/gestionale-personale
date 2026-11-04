
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

import {
  TipoMovimento,
} from '../entities/movimento.entity';

export class ModificaMovimentoDto {
  @IsOptional()
  @IsEnum(TipoMovimento)
  tipo?: TipoMovimento;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/, {
    message: 'Importo non valido',
  })
  importo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  descrizione?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  categoria?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La data deve avere formato YYYY-MM-DD',
  })
  dataMovimento?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
