
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class OperazioneSalvadanaioDto {
  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/, {
    message: 'Importo non valido',
  })
  importo: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string;
}
