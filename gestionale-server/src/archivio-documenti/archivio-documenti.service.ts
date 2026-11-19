
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'crypto';

import { ArchivioDocumento } from './entities/archivio-documento.entity';
import { ArchivioSessione } from './entities/archivio-sessione.entity';
import {
  ArchivioCartella,
  ArchivioCategoria,
} from './entities/archivio-cartella.entity';

const SESSION_MS = 15 * 60 * 1000;
const MAX_STANDARD_BYTES = 15 * 1024 * 1024;
const MAX_ZIP_BYTES = 100 * 1024 * 1024;

type TipoFile = {
  mimeType: string;
  categoria: ArchivioCategoria;
};

@Injectable()
export class ArchivioDocumentiService implements OnModuleInit {
  private key!: Buffer;
  private passwordSalt!: Buffer;
  private passwordHash!: Buffer;

  private readonly loginAttempts = new Map<
    string,
    { count: number; until: number }
  >();

  constructor(
    @InjectRepository(ArchivioDocumento)
    private readonly documents: Repository<ArchivioDocumento>,

    @InjectRepository(ArchivioSessione)
    private readonly sessions: Repository<ArchivioSessione>,

    @InjectRepository(ArchivioCartella)
    private readonly folders: Repository<ArchivioCartella>,

    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const key = Buffer.from(
      this.config.getOrThrow<string>('ARCHIVIO_ENCRYPTION_KEY'),
      'base64',
    );

    if (key.length !== 32) {
      throw new Error(
        'ARCHIVIO_ENCRYPTION_KEY deve contenere 32 byte in Base64',
      );
    }

    this.key = key;

    const salt = Buffer.from(
      this.config.getOrThrow<string>('ARCHIVIO_PASSWORD_SALT'),
      'hex',
    );

    const hash = Buffer.from(
      this.config.getOrThrow<string>('ARCHIVIO_PASSWORD_HASH'),
      'hex',
    );

    if (salt.length !== 16 || hash.length !== 64) {
      throw new Error('Salt/hash password archivio non validi');
    }

    this.passwordSalt = salt;
    this.passwordHash = hash;
  }

  // ============================================================
  // AUTENTICAZIONE
  // ============================================================

  async login(
    password: string,
    clientId: string,
  ): Promise<{ token: string; expiresInSeconds: number }> {
    const now = Date.now();
    const attempts = this.loginAttempts.get(clientId);

    if (
      attempts &&
      attempts.count >= 5 &&
      attempts.until > now
    ) {
      throw new ForbiddenException(
        'Troppi tentativi: riprova tra 15 minuti',
      );
    }

    if (
      typeof password !== 'string' ||
      password.length > 1024
    ) {
      throw new BadRequestException('Password non valida');
    }

    const candidate = scryptSync(
      password,
      this.passwordSalt,
      64,
    );

    if (!timingSafeEqual(candidate, this.passwordHash)) {
      const count =
        attempts && attempts.until > now
          ? attempts.count + 1
          : 1;

      this.loginAttempts.set(clientId, {
        count,
        until: now + SESSION_MS,
      });

      throw new UnauthorizedException('Password errata');
    }

    this.loginAttempts.delete(clientId);

    const token = randomBytes(32).toString('base64url');

    await this.sessions.save(
      this.sessions.create({
        tokenHash: this.hashToken(token),
        scadeIl: new Date(now + SESSION_MS),
        ultimoAccessoIl: new Date(now),
      }),
    );

    return {
      token,
      expiresInSeconds: SESSION_MS / 1000,
    };
  }

  private hashToken(token: string): Buffer {
    return createHash('sha256')
      .update(token)
      .digest();
  }

  async authorize(token: string): Promise<void> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      throw new UnauthorizedException('Sessione non valida');
    }

    const session = await this.sessions.findOneBy({
      tokenHash: this.hashToken(token),
    });

    if (
      !session ||
      new Date(session.scadeIl).getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Sessione scaduta');
    }

    session.scadeIl = new Date(Date.now() + SESSION_MS);
    session.ultimoAccessoIl = new Date();

    await this.sessions.save(session);
  }

  async logout(token: string): Promise<void> {
    if (/^[A-Za-z0-9_-]{43}$/.test(token)) {
      await this.sessions.delete({
        tokenHash: this.hashToken(token),
      });
    }
  }

  // ============================================================
  // VALIDAZIONE
  // ============================================================

  private validateId(id: string): string {
    if (
      typeof id !== 'string' ||
      !/^[1-9]\d*$/.test(id) ||
      BigInt(id) > 18446744073709551615n
    ) {
      throw new BadRequestException('ID non valido');
    }

    return id;
  }

  private validateCategoria(
    categoria: unknown,
  ): ArchivioCategoria {
    if (
      categoria !== 'pdf' &&
      categoria !== 'foto' &&
      categoria !== 'zip'
    ) {
      throw new BadRequestException(
        'Categoria non valida',
      );
    }

    return categoria;
  }

  private validateNomeCartella(nome: unknown): string {
    if (typeof nome !== 'string') {
      throw new BadRequestException(
        'Nome cartella non valido',
      );
    }

    const normalized = nome.trim();

    if (
      normalized.length === 0 ||
      normalized.length > 150 ||
      /[\x00-\x1f\x7f]/.test(normalized)
    ) {
      throw new BadRequestException(
        'Il nome deve contenere da 1 a 150 caratteri validi',
      );
    }

    return normalized;
  }

  private normalizeCartellaId(
    value: unknown,
  ): string | null {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(
        'ID cartella non valido',
      );
    }

    return this.validateId(value);
  }

  private detectFileType(
    file: Express.Multer.File,
  ): TipoFile {
    const buffer = file.buffer;

    if (!buffer || buffer.length < 4) {
      throw new BadRequestException(
        'File vuoto o non valido',
      );
    }

    const name = file.originalname.toLowerCase();

    const isPdf =
      buffer.length >= 5 &&
      buffer.subarray(0, 5).toString('ascii') === '%PDF-';

    const isJpeg =
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isPng =
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([
          0x89, 0x50, 0x4e, 0x47,
          0x0d, 0x0a, 0x1a, 0x0a,
        ]),
      );

    const isWebp =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';

    const isZip =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (
        (buffer[2] === 0x03 && buffer[3] === 0x04) ||
        (buffer[2] === 0x05 && buffer[3] === 0x06) ||
        (buffer[2] === 0x07 && buffer[3] === 0x08)
      );

    if (isPdf && name.endsWith('.pdf')) {
      return {
        mimeType: 'application/pdf',
        categoria: 'pdf',
      };
    }

    if (
      isJpeg &&
      (name.endsWith('.jpg') || name.endsWith('.jpeg'))
    ) {
      return {
        mimeType: 'image/jpeg',
        categoria: 'foto',
      };
    }

    if (isPng && name.endsWith('.png')) {
      return {
        mimeType: 'image/png',
        categoria: 'foto',
      };
    }

    if (isWebp && name.endsWith('.webp')) {
      return {
        mimeType: 'image/webp',
        categoria: 'foto',
      };
    }

    if (isZip && name.endsWith('.zip')) {
      return {
        mimeType: 'application/zip',
        categoria: 'zip',
      };
    }

    throw new BadRequestException(
      'Formato non consentito o contenuto non coerente con l’estensione',
    );
  }

  private categoriaDocumento(
    mimeType: string,
  ): ArchivioCategoria {
    if (mimeType === 'application/pdf') {
      return 'pdf';
    }

    if (
      mimeType === 'application/zip' ||
      mimeType === 'application/x-zip-compressed'
    ) {
      return 'zip';
    }

    if (mimeType.startsWith('image/')) {
      return 'foto';
    }

    throw new BadRequestException(
      'Categoria documento non riconosciuta',
    );
  }

  // ============================================================
  // CARTELLE
  // ============================================================

  async listCartelle() {
    const cartelle = await this.folders.find({
      order: {
        categoria: 'ASC',
        nome: 'ASC',
      },
    });

    return cartelle.map((cartella) =>
      this.cartellaMetadata(cartella),
    );
  }

  private cartellaMetadata(cartella: ArchivioCartella) {
    return {
      id: cartella.id,
      nome: cartella.nome,
      categoria: cartella.categoria,
      creatoIl: cartella.creatoIl,
    };
  }

  async createCartella(
    nome: unknown,
    categoria: unknown,
  ) {
    const validNome = this.validateNomeCartella(nome);
    const validCategoria =
      this.validateCategoria(categoria);

    const cartella = await this.folders.save(
      this.folders.create({
        nome: validNome,
        categoria: validCategoria,
      }),
    );

    return this.cartellaMetadata(cartella);
  }

  async renameCartella(
    id: string,
    nome: unknown,
  ) {
    const validId = this.validateId(id);
    const validNome = this.validateNomeCartella(nome);

    const cartella = await this.folders.findOneBy({
      id: validId,
    });

    if (!cartella) {
      throw new NotFoundException(
        'Cartella non trovata',
      );
    }

    cartella.nome = validNome;

    const updated = await this.folders.save(cartella);

    return this.cartellaMetadata(updated);
  }

  async removeCartella(id: string): Promise<void> {
    const validId = this.validateId(id);

    const result = await this.folders.delete(validId);

    if (!result.affected) {
      throw new NotFoundException(
        'Cartella non trovata',
      );
    }

    // La foreign key ON DELETE SET NULL mantiene
    // i documenti, spostandoli tra quelli senza cartella.
  }

  private async getCartellaCompatibile(
    cartellaId: string | null,
    categoria: ArchivioCategoria,
  ): Promise<ArchivioCartella | null> {
    if (cartellaId === null) {
      return null;
    }

    const cartella = await this.folders.findOneBy({
      id: cartellaId,
    });

    if (!cartella) {
      throw new NotFoundException(
        'Cartella non trovata',
      );
    }

    if (cartella.categoria !== categoria) {
      throw new BadRequestException(
        'Il documento non appartiene alla categoria della cartella',
      );
    }

    return cartella;
  }

  // ============================================================
  // DOCUMENTI
  // ============================================================

  async list() {
    const docs = await this.documents.find({
      order: {
        creatoIl: 'DESC',
      },
    });

    return docs.map((documento) =>
      this.metadata(documento),
    );
  }

  private metadata(d: ArchivioDocumento) {
    return {
      id: d.id,
      nomeOriginale: d.nomeOriginale,
      mimeType: d.mimeType,
      dimensioneOriginale: d.dimensioneOriginale,
      creatoIl: d.creatoIl,
      cartellaId: d.cartellaId ?? null,
    };
  }

  async upload(
    file?: Express.Multer.File,
    rawCartellaId?: unknown,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException(
        'File mancante',
      );
    }

    const tipo = this.detectFileType(file);

    const maxBytes =
      tipo.categoria === 'zip'
        ? MAX_ZIP_BYTES
        : MAX_STANDARD_BYTES;

    if (
      !file.size ||
      file.size > maxBytes
    ) {
      throw new BadRequestException(
        tipo.categoria === 'zip'
          ? 'Lo ZIP non può superare 100 MB'
          : 'Il file non può superare 15 MB',
      );
    }

    const cartellaId =
      this.normalizeCartellaId(rawCartellaId);

    await this.getCartellaCompatibile(
      cartellaId,
      tipo.categoria,
    );

    const iv = randomBytes(12);

    const cipher = createCipheriv(
      'aes-256-gcm',
      this.key,
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(file.buffer),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    const safeName = file.originalname
      .replace(/[\/\\\x00-\x1f\x7f]/g, '_')
      .slice(0, 255);

    const doc = await this.documents.save(
      this.documents.create({
        nomeOriginale: safeName || 'documento',
        mimeType: tipo.mimeType,
        dimensioneOriginale: String(file.size),
        contenutoCifrato: encrypted,
        iv,
        authTag: tag,
        cartellaId,
      }),
    );

    return this.metadata(doc);
  }

  async moveDocumento(
    id: string,
    rawCartellaId: unknown,
  ) {
    const validId = this.validateId(id);
    const cartellaId =
      this.normalizeCartellaId(rawCartellaId);

    const documento = await this.documents.findOneBy({
      id: validId,
    });

    if (!documento) {
      throw new NotFoundException(
        'Documento non trovato',
      );
    }

    const categoria = this.categoriaDocumento(
      documento.mimeType,
    );

    await this.getCartellaCompatibile(
      cartellaId,
      categoria,
    );

    documento.cartellaId = cartellaId;

    const updated = await this.documents.save(documento);

    return this.metadata(updated);
  }

  async getFile(id: string) {
    const validId = this.validateId(id);

    const documento = await this.documents
      .createQueryBuilder('d')
      .addSelect([
        'd.contenutoCifrato',
        'd.iv',
        'd.authTag',
      ])
      .where('d.id = :id', { id: validId })
      .getOne();

    if (!documento) {
      throw new NotFoundException(
        'Documento non trovato',
      );
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      documento.iv,
    );

    decipher.setAuthTag(documento.authTag);

    const content = Buffer.concat([
      decipher.update(documento.contenutoCifrato),
      decipher.final(),
    ]);

    return {
      metadata: this.metadata(documento),
      content,
    };
  }

  async remove(id: string): Promise<void> {
    const validId = this.validateId(id);

    const result = await this.documents.delete(validId);

    if (!result.affected) {
      throw new NotFoundException(
        'Documento non trovato',
      );
    }
  }
}
