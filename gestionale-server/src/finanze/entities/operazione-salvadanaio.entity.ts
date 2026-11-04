
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum TipoOperazioneSalvadanaio {
  ACCANTONAMENTO = 'ACCANTONAMENTO',
  PRELIEVO = 'PRELIEVO',
}

@Entity('operazioni_salvadanai')
export class OperazioneSalvadanaio {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({
    name: 'salvadanaio_id',
    type: 'int',
    unsigned: true,
  })
  salvadanaioId: number;

  @Column({
    type: 'enum',
    enum: TipoOperazioneSalvadanaio,
  })
  tipo: TipoOperazioneSalvadanaio;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  importo: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  nota: string | null;

  @CreateDateColumn({
    name: 'creato_il',
    type: 'datetime',
    precision: 6,
  })
  creatoIl: Date;
}
