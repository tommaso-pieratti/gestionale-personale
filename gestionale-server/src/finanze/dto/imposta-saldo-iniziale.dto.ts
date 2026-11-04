
import {
  IsString,
  Matches,
} from 'class-validator';

export class ImpostaSaldoInizialeDto {
  @IsString()
  @Matches(/^\d{1,13}(\.\d{1,2})?$/, {
    message:
      'Il saldo deve essere un importo valido, ad esempio 1500.00',
  })
  saldoIniziale: string;
}
