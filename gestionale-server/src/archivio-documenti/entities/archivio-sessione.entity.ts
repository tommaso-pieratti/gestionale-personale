import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('archivio_sessioni')
export class ArchivioSessione {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id: string;
  @Column({ name: 'token_hash', type: 'binary', length: 32 }) tokenHash: Buffer;
  @Column({ name: 'scade_il', type: 'datetime', precision: 3 }) scadeIl: Date;
  @Column({ name: 'ultimo_accesso_il', type: 'datetime', precision: 3 }) ultimoAccessoIl: Date;
  @CreateDateColumn({ name: 'creato_il', type: 'datetime', precision: 3 }) creatoIl: Date;
}
