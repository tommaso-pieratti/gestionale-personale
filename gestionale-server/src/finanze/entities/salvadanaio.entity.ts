
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('salvadanai')
export class Salvadanaio {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({
    name: 'conto_id',
    type: 'int',
    unsigned: true,
  })
  contoId: number;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  descrizione: string | null;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
  })
  obiettivo: string;

  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  saldo: string;

  @Column({
    name: 'data_obiettivo',
    type: 'date',
    nullable: true,
  })
  dataObiettivo: string | null;

  @Column({ type: 'boolean', default: true })
  attivo: boolean;

  @CreateDateColumn({
    name: 'creato_il',
    type: 'datetime',
    precision: 6,
  })
  creatoIl: Date;
}
