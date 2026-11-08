
import { TipoRifornimento } from '../entities/rifornimento.entity';

export interface RifornimentoDto {
  autoId: number;
  dataRifornimento: string;
  importo: number | string;
  litri: number | string;
  tipoRifornimento?: TipoRifornimento | null;
  kmAttuali?: number | null;
  distributore?: string | null;
}
