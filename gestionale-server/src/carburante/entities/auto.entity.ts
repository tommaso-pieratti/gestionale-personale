
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('carburante_auto')
export class Auto {
  @PrimaryGeneratedColumn({
    type: 'int',
    unsigned: true,
  })
  id: number;

  @Column({
    type: 'varchar',
    length: 100,
  })
  nome: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  marca: string | null;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  modello: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  targa: string | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  alimentazione: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  note: string | null;

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
