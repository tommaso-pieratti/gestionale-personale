import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { ArchivioDocumentiService } from './archivio-documenti.service';

@Injectable()
export class ArchivioAuthGuard implements CanActivate {
  constructor(private readonly service: ArchivioDocumentiService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Accesso richiesto');
    await this.service.authorize(authorization.slice(7));
    return true;
  }
}
