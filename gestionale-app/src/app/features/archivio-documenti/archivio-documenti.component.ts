
import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  ArchivioApiService,
  ArchivioDocumento
} from './services/archivio-api.service';

type FiltroDocumenti = 'tutti' | 'immagini' | 'pdf';
type VistaDocumenti = 'griglia' | 'lista';

@Component({
  selector: 'app-archivio-documenti',
  templateUrl: './archivio-documenti.component.html',
  styleUrls: ['./archivio-documenti.component.scss']
})
export class ArchivioDocumentiComponent implements OnInit, OnDestroy {

  password = '';
  mostraPassword = false;

  documenti: ArchivioDocumento[] = [];
  occupato = false;
  errore = '';
  messaggio = '';

  ricerca = '';
  filtro: FiltroDocumenti = 'tutti';
  vista: VistaDocumenti = 'griglia';

  trascinamentoAttivo = false;

  anteprimaUrl: SafeResourceUrl | null = null;
  anteprimaNome = '';
  anteprimaTipo = '';

  private objectUrl: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ultimaAttivita = Date.now();

  constructor(
    public readonly api: ArchivioApiService,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.timer = setInterval(() => {
      if (
        this.api.autenticato &&
        Date.now() - this.ultimaAttivita > 15 * 60 * 1000
      ) {
        this.blocca(
          'Sessione scaduta. Inserisci nuovamente la password.'
        );
      }
    }, 10000);

    if (this.api.autenticato) {
      this.aggiorna();
    }
  }

  ngOnDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.chiudiAnteprima();
  }

  get totaleDocumenti(): number {
    return this.documenti.length;
  }

  get totaleImmagini(): number {
    return this.documenti.filter(
      doc => doc.mimeType.startsWith('image/')
    ).length;
  }

  get totalePdf(): number {
    return this.documenti.filter(
      doc => doc.mimeType === 'application/pdf'
    ).length;
  }

  get documentiFiltrati(): ArchivioDocumento[] {
    const testo = this.ricerca.trim().toLowerCase();

    return this.documenti.filter(doc => {
      const corrispondeRicerca =
        !testo ||
        doc.nomeOriginale.toLowerCase().includes(testo);

      const corrispondeTipo =
        this.filtro === 'tutti' ||
        (this.filtro === 'immagini' &&
          doc.mimeType.startsWith('image/')) ||
        (this.filtro === 'pdf' &&
          doc.mimeType === 'application/pdf');

      return corrispondeRicerca && corrispondeTipo;
    });
  }

  private attivita(): void {
    this.ultimaAttivita = Date.now();
  }

  private erroreApi(error: unknown): void {
    if (
      error instanceof HttpErrorResponse &&
      error.status === 401
    ) {
      this.blocca(
        'Sessione scaduta o accesso non autorizzato.'
      );
      return;
    }

    this.errore =
      error instanceof HttpErrorResponse &&
      typeof error.error?.message === 'string'
        ? error.error.message
        : 'Operazione non riuscita.';
  }

  accedi(): void {
    if (!this.password || this.occupato) {
      return;
    }

    this.occupato = true;
    this.errore = '';
    this.messaggio = '';

    this.api.login(this.password).subscribe({
      next: () => {
        this.password = '';
        this.occupato = false;
        this.attivita();
        this.aggiorna();
      },
      error: error => {
        this.password = '';
        this.occupato = false;
        this.erroreApi(error);
      }
    });
  }

  blocca(avviso = ''): void {
    this.api.blocca();
    this.documenti = [];
    this.password = '';
    this.ricerca = '';
    this.filtro = 'tutti';
    this.chiudiAnteprima();

    this.errore = avviso;
    this.messaggio = '';
    this.occupato = false;
  }

  esci(): void {
    this.api.logout().subscribe({
      error: () => {}
    });

    this.blocca();
  }

  aggiorna(): void {
    this.errore = '';
    this.attivita();

    this.api.elenco().subscribe({
      next: documenti => {
        this.documenti = documenti;
      },
      error: error => this.erroreApi(error)
    });
  }

  selezionaFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    input.value = '';

    if (file) {
      this.caricaFile(file);
    }
  }

  // Compatibilità con il precedente template.
  carica(event: Event): void {
    this.selezionaFile(event);
  }

  trascinaSopra(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.occupato) {
      this.trascinamentoAttivo = true;
    }
  }

  trascinaFuori(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.trascinamentoAttivo = false;
  }

  rilasciaFile(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    this.trascinamentoAttivo = false;

    if (this.occupato) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      this.caricaFile(file);
    }
  }

  private caricaFile(file: File): void {
    if (this.occupato) {
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      this.errore = 'Dimensione massima consentita: 15 MB.';
      return;
    }

    const formatiConsentiti = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!formatiConsentiti.includes(file.type)) {
      this.errore =
        'Formato consentito: PDF, JPG, PNG oppure WebP.';
      return;
    }

    this.occupato = true;
    this.errore = '';
    this.messaggio = '';
    this.attivita();

    this.api.carica(file).subscribe({
      next: () => {
        this.occupato = false;
        this.aggiorna();
        this.messaggio =
          'Documento caricato e cifrato correttamente.';
      },
      error: error => {
        this.occupato = false;
        this.erroreApi(error);
      }
    });
  }

  scarica(doc: ArchivioDocumento): void {
    this.errore = '';
    this.attivita();

    this.api.file(doc.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const collegamento = document.createElement('a');

        collegamento.href = url;
        collegamento.download = doc.nomeOriginale;

        document.body.appendChild(collegamento);
        collegamento.click();
        collegamento.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: error => this.erroreApi(error)
    });
  }

  anteprima(doc: ArchivioDocumento): void {
    this.chiudiAnteprima();
    this.errore = '';
    this.attivita();

    this.api.file(doc.id).subscribe({
      next: blob => {
        this.objectUrl = URL.createObjectURL(
          new Blob([blob], { type: doc.mimeType })
        );

        this.anteprimaUrl =
          this.sanitizer.bypassSecurityTrustResourceUrl(
            this.objectUrl
          );

        this.anteprimaNome = doc.nomeOriginale;
        this.anteprimaTipo = doc.mimeType;
      },
      error: error => this.erroreApi(error)
    });
  }

  chiudiAnteprima(): void {
    this.anteprimaUrl = null;
    this.anteprimaNome = '';
    this.anteprimaTipo = '';

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
    }

    this.objectUrl = null;
  }

  elimina(doc: ArchivioDocumento): void {
    const conferma = confirm(
      `Eliminare definitivamente "${doc.nomeOriginale}"?`
    );

    if (!conferma) {
      return;
    }

    this.errore = '';
    this.attivita();

    this.api.elimina(doc.id).subscribe({
      next: () => {
        this.chiudiAnteprima();
        this.aggiorna();
        this.messaggio = 'Documento eliminato correttamente.';
      },
      error: error => this.erroreApi(error)
    });
  }

  impostaFiltro(filtro: FiltroDocumenti): void {
    this.filtro = filtro;
    this.attivita();
  }

  impostaVista(vista: VistaDocumenti): void {
    this.vista = vista;
    this.attivita();
  }

  iconaDocumento(doc: ArchivioDocumento): string {
    return doc.mimeType === 'application/pdf'
      ? 'pi pi-file-pdf'
      : 'pi pi-image';
  }

  dimensione(bytes: string): string {
    const n = Number(bytes);

    if (n < 1024) {
      return `${n} B`;
    }

    if (n < 1024 * 1024) {
      return `${(n / 1024).toFixed(1)} KB`;
    }

    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  trackByDocumento(
    index: number,
    doc: ArchivioDocumento
  ): string {
    return String(doc.id);
  }
}
