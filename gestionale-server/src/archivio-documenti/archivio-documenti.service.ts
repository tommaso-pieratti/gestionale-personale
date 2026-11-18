import { BadRequestException, ForbiddenException, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { ArchivioDocumento } from './entities/archivio-documento.entity';
import { ArchivioSessione } from './entities/archivio-sessione.entity';

const SESSION_MS = 15 * 60 * 1000;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

@Injectable()
export class ArchivioDocumentiService implements OnModuleInit {
  private key!: Buffer;
  private passwordSalt!: Buffer;
  private passwordHash!: Buffer;
  private readonly loginAttempts = new Map<string, { count: number; until: number }>();

  constructor(
    @InjectRepository(ArchivioDocumento) private readonly documents: Repository<ArchivioDocumento>,
    @InjectRepository(ArchivioSessione) private readonly sessions: Repository<ArchivioSessione>,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const key = Buffer.from(this.config.getOrThrow<string>('ARCHIVIO_ENCRYPTION_KEY'), 'base64');
    if (key.length !== 32) throw new Error('ARCHIVIO_ENCRYPTION_KEY deve contenere 32 byte in Base64');
    this.key = key;
    const salt = Buffer.from(this.config.getOrThrow<string>('ARCHIVIO_PASSWORD_SALT'), 'hex');
    const hash = Buffer.from(this.config.getOrThrow<string>('ARCHIVIO_PASSWORD_HASH'), 'hex');
    if (salt.length !== 16 || hash.length !== 64) throw new Error('Salt/hash password archivio non validi');
    this.passwordSalt = salt;
    this.passwordHash = hash;
  }

  async login(password: string, clientId: string): Promise<{ token: string; expiresInSeconds: number }> {
    const now = Date.now();
    const attempts = this.loginAttempts.get(clientId);
    if (attempts && attempts.count >= 5 && attempts.until > now) throw new ForbiddenException('Troppi tentativi: riprova tra 15 minuti');
    if (typeof password !== 'string' || password.length > 1024) throw new BadRequestException('Password non valida');
    const candidate = scryptSync(password, this.passwordSalt, 64);
    if (!timingSafeEqual(candidate, this.passwordHash)) {
      const count = attempts && attempts.until > now ? attempts.count + 1 : 1;
      this.loginAttempts.set(clientId, { count, until: now + SESSION_MS });
      throw new UnauthorizedException('Password errata');
    }
    this.loginAttempts.delete(clientId);
    const token = randomBytes(32).toString('base64url');
    await this.sessions.save(this.sessions.create({
      tokenHash: this.hashToken(token),
      scadeIl: new Date(now + SESSION_MS),
      ultimoAccessoIl: new Date(now),
    }));
    return { token, expiresInSeconds: SESSION_MS / 1000 };
  }

  private hashToken(token: string): Buffer {
    return createHash('sha256').update(token).digest();
  }

  async authorize(token: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new UnauthorizedException('Sessione non valida');
    const session = await this.sessions.findOneBy({ tokenHash: this.hashToken(token) });
    if (!session || new Date(session.scadeIl).getTime() <= Date.now()) throw new UnauthorizedException('Sessione scaduta');
    session.scadeIl = new Date(Date.now() + SESSION_MS);
    session.ultimoAccessoIl = new Date();
    await this.sessions.save(session);
  }

  async logout(token: string): Promise<void> {
    if (/^[A-Za-z0-9_-]{43}$/.test(token)) await this.sessions.delete({ tokenHash: this.hashToken(token) });
  }

  async list() {
    const docs = await this.documents.find({ order: { creatoIl: 'DESC' } });
    return docs.map(d => this.metadata(d));
  }

  private metadata(d: ArchivioDocumento) {
    return { id: d.id, nomeOriginale: d.nomeOriginale, mimeType: d.mimeType,
      dimensioneOriginale: d.dimensioneOriginale, creatoIl: d.creatoIl };
  }

  async upload(file?: Express.Multer.File) {
    if (!file || !file.buffer) throw new BadRequestException('File mancante');
    if (!ALLOWED_MIME.has(file.mimetype)) throw new BadRequestException('Formato non consentito');
    if (!file.size || file.size > MAX_FILE_BYTES) throw new BadRequestException('Dimensione non consentita');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(file.buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    const safeName = file.originalname.replace(/[\/\\\x00-\x1f\x7f]/g, '_').slice(0, 255);
    const doc = await this.documents.save(this.documents.create({
      nomeOriginale: safeName || 'documento', mimeType: file.mimetype,
      dimensioneOriginale: String(file.size), contenutoCifrato: encrypted, iv, authTag: tag,
    }));
    return this.metadata(doc);
  }

  async getFile(id: string) {
    if (!/^[1-9]\d*$/.test(id)) throw new BadRequestException('ID non valido');
    const d = await this.documents.createQueryBuilder('d')
      .addSelect(['d.contenutoCifrato', 'd.iv', 'd.authTag'])
      .where('d.id = :id', { id }).getOne();
    if (!d) throw new NotFoundException('Documento non trovato');
    const decipher = createDecipheriv('aes-256-gcm', this.key, d.iv);
    decipher.setAuthTag(d.authTag);
    const content = Buffer.concat([decipher.update(d.contenutoCifrato), decipher.final()]);
    return { metadata: this.metadata(d), content };
  }

  async remove(id: string): Promise<void> {
    if (!/^[1-9]\d*$/.test(id)) throw new BadRequestException('ID non valido');
    const result = await this.documents.delete(id);
    if (!result.affected) throw new NotFoundException('Documento non trovato');
  }
}
