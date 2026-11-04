
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TipoMovimento {
  ENTRATA = 'ENTRATA',
  USCITA = 'USCITA',
}

@Entity('movimenti')
export class Movimento {
  @PrimaryGeneratedColumn({
    type: 'int',
    unsigned: true,
  })
  id: number;

  @Column({
    name: 'conto_id',
    type: 'int',
    unsigned: true,
  })
  contoId: number;

  @Column({
    type: 'enum',
    enum: TipoMovimento,
  })
  tipo: TipoMovimento;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  importo: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  descrizione: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  categoria: string | null;

  @Column({
    name: 'data_movimento',
    type: 'date',
  })
  dataMovimento: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  note: string | null;

  @Column({
    name: 'annullato_il',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  annullatoIl: Date | null;

  @CreateDateColumn({
    name: 'creato_il',
    type: 'datetime',
    precision: 6,
  })
  creatoIl: Date;

  @UpdateDateColumn({
    name: 'aggiornato_il',
    type: 'datetime',
    precision: 6,
  })
  aggiornatoIl: Date;
}
