
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('conti')
export class Conto {
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
    type: 'char',
    length: 3,
    default: 'EUR',
  })
  valuta: string;

  @Column({
    name: 'saldo_iniziale',
    type: 'decimal',
    precision: 15,
    scale: 2,
    default: 0,
  })
  saldoIniziale: string;

  @Column({
    name: 'saldo_iniziale_confermato_il',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  saldoInizialeConfermatoIl: Date | null;

  @CreateDateColumn({
    name: 'creato_il',
    type: 'datetime',
    precision: 6,
  })
  creatoIl: Date;
}
