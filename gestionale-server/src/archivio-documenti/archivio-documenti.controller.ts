import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { ArchivioAuthGuard } from './archivio-auth.guard';
import { ArchivioDocumentiService } from './archivio-documenti.service';

@Controller('archivio-documenti')
export class ArchivioDocumentiController {
  constructor(private readonly service: ArchivioDocumentiService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { password?: string }, @Req() req: Request) {
    return this.service.login(body?.password ?? '', req.ip || 'unknown');
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(ArchivioAuthGuard)
  async logout(@Headers('authorization') auth: string) {
    await this.service.logout(auth.slice(7));
  }

  @Get()
  @UseGuards(ArchivioAuthGuard)
  list() { return this.service.list(); }

  @Post('upload')
  @UseGuards(ArchivioAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  }))
  upload(@UploadedFile() file: Express.Multer.File) { return this.service.upload(file); }

  @Get(':id/file')
  @UseGuards(ArchivioAuthGuard)
  async download(@Param('id') id: string, @Res() res: Response) {
    const { metadata, content } = await this.service.getFile(id);
    res.setHeader('Content-Type', metadata.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="documento-${id}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(content);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(ArchivioAuthGuard)
  async remove(@Param('id') id: string) { await this.service.remove(id); }
}
