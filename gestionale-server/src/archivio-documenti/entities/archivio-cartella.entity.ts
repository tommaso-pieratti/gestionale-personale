
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ArchivioDocumento } from './archivio-documento.entity';

export type ArchivioCategoria = 'pdf' | 'foto' | 'zip';

@Entity('archivio_cartelle')
export class ArchivioCartella {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nome: string;

  @Column({ type: 'enum', enum: ['pdf', 'foto', 'zip'] })
  categoria: ArchivioCategoria;

  @CreateDateColumn({
    name: 'creato_il',
    type: 'datetime',
  })
  creatoIl: Date;

  @OneToMany(
    () => ArchivioDocumento,
    (documento) => documento.cartella,
  )
  documenti: ArchivioDocumento[];
}
