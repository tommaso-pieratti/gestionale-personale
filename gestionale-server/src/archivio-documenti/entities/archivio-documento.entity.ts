import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('archivio_documenti')
export class ArchivioDocumento {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true }) id: string;
  @Column({ name: 'nome_originale', type: 'varchar', length: 255 }) nomeOriginale: string;
  @Column({ name: 'mime_type', type: 'varchar', length: 150 }) mimeType: string;
  @Column({ name: 'dimensione_originale', type: 'bigint', unsigned: true }) dimensioneOriginale: string;
  @Column({ name: 'contenuto_cifrato', type: 'longblob', select: false }) contenutoCifrato: Buffer;
  @Column({ name: 'iv', type: 'varbinary', length: 12, select: false }) iv: Buffer;
  @Column({ name: 'auth_tag', type: 'varbinary', length: 16, select: false }) authTag: Buffer;
  @CreateDateColumn({ name: 'creato_il', type: 'datetime', precision: 3 }) creatoIl: Date;
}
