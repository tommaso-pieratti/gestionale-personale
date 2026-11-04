
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreaSalvadanaioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nome: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descrizione?: string;

  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/, {
    message: 'Obiettivo non valido',
  })
  obiettivo: string;

  @IsOptional()
  @IsDateString({ strict: true })
  dataObiettivo?: string;
}
