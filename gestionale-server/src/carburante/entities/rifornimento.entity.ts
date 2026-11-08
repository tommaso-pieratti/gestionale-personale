
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Auto } from './auto.entity';

export enum TipoRifornimento {
  PIENO = 'PIENO',
  PARZIALE = 'PARZIALE',
}

@Entity('carburante_rifornimenti')
export class Rifornimento {
  @PrimaryGeneratedColumn({
    type: 'int',
    unsigned: true,
  })
  id: number;

  @Column({
    name: 'auto_id',
    type: 'int',
    unsigned: true,
  })
  autoId: number;

  @ManyToOne(() => Auto, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'auto_id',
  })
  auto: Auto;

  @Column({
    name: 'data_rifornimento',
    type: 'date',
  })
  dataRifornimento: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
  })
  importo: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 3,
  })
  litri: string;

  @Column({
    name: 'tipo_rifornimento',
    type: 'enum',
    enum: TipoRifornimento,
    nullable: true,
  })
  tipoRifornimento: TipoRifornimento | null;

  @Column({
    name: 'km_attuali',
    type: 'int',
    unsigned: true,
    nullable: true,
  })
  kmAttuali: number | null;

  @Column({
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  distributore: string | null;

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
