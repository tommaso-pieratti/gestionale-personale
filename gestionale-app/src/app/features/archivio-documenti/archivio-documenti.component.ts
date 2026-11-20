
import {
  Component,
  OnDestroy,
  OnInit,
  AfterViewInit,
  ElementRef,
  QueryList,
  ViewChildren
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  DomSanitizer,
  SafeResourceUrl
} from '@angular/platform-browser';
import { firstValueFrom, Subscription } from 'rxjs';

import {
  ArchivioApiService,
  ArchivioDocumento,
  ArchivioCartella,
  CategoriaArchivio
} from './services/archivio-api.service';

interface CartellaLocale {
  id: string;
  nome: string;
  categoria: CategoriaArchivio;
  creataIl?: string;
}

interface OrganizzazioneLocale {
  cartelle: CartellaLocale[];
  assegnazioni: Record<string, string>;
}

@Component({
  selector: 'app-archivio-documenti',
  templateUrl: './archivio-documenti.component.html',
  styleUrls: ['./archivio-documenti.component.scss']
})
export class ArchivioDocumentiComponent
  implements OnInit, AfterViewInit, OnDestroy {

  @ViewChildren('miniaturaElemento')
  private miniatureElementi!: QueryList<ElementRef<HTMLElement>>;

  miniatureUrl: Record<string, string> = {};
  downloadZipInCorso = false;
  private osservatoreMiniature: IntersectionObserver | null = null;
  private miniatureChanges: Subscription | null = null;
  private miniatureRichieste = new Set<string>();
  private miniatureCoda: string[] = [];
  private miniatureAttive = 0;
  private readonly massimoMiniatureParallele = 3;
  private generazioneMiniature = 0;
  private miniatureSubscriptions = new Set<Subscription>();

  password = '';
  mostraPassword = false;

  documenti: ArchivioDocumento[] = [];
  cartelle: ArchivioCartella[] = [];

  occupato = false;
  caricamento = false;

  errore = '';
  messaggio = '';

  categoria: CategoriaArchivio = 'pdf';
  cartellaApertaId: string | null = null;

  ricerca = '';
  trascinamentoAttivo = false;

  mostraFormCartella = false;
  nomeNuovaCartella = '';

  cartellaInModificaId: string | null = null;
  nomeCartellaInModifica = '';

  mostraSelezioneCartella = false;
  fileDaCaricare: File | null = null;
  cartellaDestinazioneId = '';

  anteprimaUrl: SafeResourceUrl | null = null;
  anteprimaNome = '';
  anteprimaTipo = '';

  private objectUrl: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private ultimaAttivita = Date.now();

  private readonly storageKey =
    'gestionale_archivio_organizzazione_v1';

  private readonly migrazioneKey =
    'gestionale_archivio_migrazione_db_v1';

  private aggiornamentoInCorso = false;
  private distrutto = false;

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

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver !== 'undefined') {
      this.osservatoreMiniature = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const id = (entry.target as HTMLElement).dataset['miniaturaId'];
            if (id) this.accodaMiniatura(id);
            this.osservatoreMiniature?.unobserve(entry.target);
          }
        },
        { rootMargin: '180px 0px', threshold: 0.01 }
      );
    }

    this.miniatureChanges = this.miniatureElementi.changes.subscribe(
      () => this.osservaMiniature()
    );
    this.osservaMiniature();
  }

  private osservaMiniature(): void {
    if (!this.api.autenticato || this.distrutto) return;
    this.osservatoreMiniature?.disconnect();
    if (!this.miniatureElementi) return;
    for (const elemento of this.miniatureElementi.toArray()) {
      const id = elemento.nativeElement.dataset['miniaturaId'];
      if (!id || this.miniatureUrl[id] || this.miniatureRichieste.has(id)) continue;
      if (this.osservatoreMiniature) {
        this.osservatoreMiniature.observe(elemento.nativeElement);
      } else {
        this.accodaMiniatura(id);
      }
    }
  }

  private accodaMiniatura(id: string): void {
    if (!this.api.autenticato || this.distrutto ||
        this.miniatureUrl[id] || this.miniatureRichieste.has(id)) return;
    this.miniatureRichieste.add(id);
    this.miniatureCoda.push(id);
    this.avviaMiniature();
  }

  private avviaMiniature(): void {
    while (this.miniatureAttive < this.massimoMiniatureParallele &&
           this.miniatureCoda.length && this.api.autenticato && !this.distrutto) {
      const id = this.miniatureCoda.shift()!;
      const generazione = this.generazioneMiniature;
      this.miniatureAttive++;
      const subscription = this.api.miniatura(id).subscribe({
        next: blob => {
          if (generazione !== this.generazioneMiniature || !this.api.autenticato) return;
          this.miniatureUrl = {
            ...this.miniatureUrl,
            [id]: URL.createObjectURL(blob)
          };
        },
        error: () => {
          // Mantiene l'icona per le immagini non supportate.
          termina();
        },
        complete: () => termina()
      });
      const termina = () => {
        this.miniatureSubscriptions.delete(subscription);
        if (generazione !== this.generazioneMiniature) return;
        this.miniatureAttive--;
        this.avviaMiniature();
      };
      this.miniatureSubscriptions.add(subscription);
    }
  }

  private liberaMiniature(): void {
    this.generazioneMiniature++;
    this.osservatoreMiniature?.disconnect();
    for (const subscription of this.miniatureSubscriptions) subscription.unsubscribe();
    this.miniatureSubscriptions.clear();
    for (const url of Object.values(this.miniatureUrl)) URL.revokeObjectURL(url);
    this.miniatureUrl = {};
    this.miniatureRichieste.clear();
    this.miniatureCoda = [];
    this.miniatureAttive = 0;
  }

  ngOnDestroy(): void {
    this.distrutto = true;

    if (this.timer) {
      clearInterval(this.timer);
    }

    this.chiudiAnteprima();
    this.miniatureChanges?.unsubscribe();
    this.liberaMiniature();
    this.osservatoreMiniature?.disconnect();
  }

  get titoloCategoria(): string {
    switch (this.categoria) {
      case 'pdf':
        return 'I tuoi PDF';
      case 'foto':
        return 'Le tue foto';
      case 'zip':
        return 'I tuoi ZIP';
    }
  }

  get descrizioneCategoria(): string {
    switch (this.categoria) {
      case 'pdf':
        return 'Organizza i tuoi documenti PDF in cartelle.';
      case 'foto':
        return 'Conserva e organizza le tue fotografie.';
      case 'zip':
        return 'Conserva i tuoi archivi ZIP in cartelle.';
    }
  }

  get cartelleCategoria(): ArchivioCartella[] {
    return this.cartelle
      .filter(cartella => cartella.categoria === this.categoria)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
  }

  get cartellaAperta(): ArchivioCartella | undefined {
    return this.cartelle.find(
      cartella => cartella.id === this.cartellaApertaId
    );
  }

  get documentiCategoria(): ArchivioDocumento[] {
    return this.documenti.filter(
      doc => this.categoriaDocumento(doc) === this.categoria
    );
  }

  get documentiVisibili(): ArchivioDocumento[] {
    const testo = this.ricerca.trim().toLowerCase();

    return this.documentiCategoria.filter(doc => {
      const cartellaId = doc.cartellaId || null;

      const posizioneCorretta =
        this.cartellaApertaId === null
          ? cartellaId === null
          : cartellaId === this.cartellaApertaId;

      const nomeCorretto =
        !testo ||
        doc.nomeOriginale.toLowerCase().includes(testo);

      return posizioneCorretta && nomeCorretto;
    });
  }

  get totalePdf(): number {
    return this.documenti.filter(
      doc => doc.mimeType === 'application/pdf'
    ).length;
  }

  get totaleFoto(): number {
    return this.documenti.filter(
      doc => doc.mimeType.startsWith('image/')
    ).length;
  }

  get totaleZip(): number {
    return this.documenti.filter(
      doc => this.categoriaDocumento(doc) === 'zip'
    ).length;
  }

  private categoriaDocumento(
    doc: ArchivioDocumento
  ): CategoriaArchivio {
    if (doc.mimeType === 'application/pdf') {
      return 'pdf';
    }

    if (doc.mimeType.startsWith('image/')) {
      return 'foto';
    }

    return 'zip';
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

    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === 'string') {
        this.errore = message;
        return;
      }

      if (Array.isArray(message)) {
        this.errore = message.join(', ');
        return;
      }

      if (error.status === 413) {
        this.errore = 'Il file supera il limite consentito.';
        return;
      }
    }

    this.errore = 'Operazione non riuscita.';
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
    this.liberaMiniature();

    this.documenti = [];
    this.cartelle = [];
    this.password = '';
    this.ricerca = '';

    this.cartellaApertaId = null;
    this.mostraFormCartella = false;
    this.nomeNuovaCartella = '';

    this.annullaModificaCartella();

    this.mostraSelezioneCartella = false;
    this.fileDaCaricare = null;
    this.cartellaDestinazioneId = '';

    this.chiudiAnteprima();

    this.errore = avviso;
    this.messaggio = '';
    this.occupato = false;
    this.caricamento = false;
  }

  esci(): void {
    this.api.logout().subscribe({
      error: () => {}
    });

    this.blocca();
  }

  async aggiorna(): Promise<void> {
    if (
      !this.api.autenticato ||
      this.aggiornamentoInCorso
    ) {
      return;
    }

    this.aggiornamentoInCorso = true;
    this.caricamento = true;
    this.errore = '';
    this.attivita();

    try {
      let [documenti, cartelle] = await Promise.all([
        firstValueFrom(this.api.elenco()),
        firstValueFrom(this.api.elencoCartelle())
      ]);

      if (!this.api.autenticato || this.distrutto) {
        return;
      }

      const migrato = await this.migraOrganizzazioneLocale(
        documenti,
        cartelle
      );

      if (migrato) {
        [documenti, cartelle] = await Promise.all([
          firstValueFrom(this.api.elenco()),
          firstValueFrom(this.api.elencoCartelle())
        ]);
      }

      if (!this.api.autenticato || this.distrutto) {
        return;
      }

      this.documenti = documenti;
      this.cartelle = cartelle;

      if (
        this.cartellaApertaId &&
        !this.cartelle.some(
          cartella => cartella.id === this.cartellaApertaId
        )
      ) {
        this.cartellaApertaId = null;
      }
    } catch (error) {
      this.erroreApi(error);
    } finally {
      this.caricamento = false;
      this.aggiornamentoInCorso = false;
    }
  }

  // ==========================================================
  // MIGRAZIONE DAL LOCALSTORAGE A MARIADB
  // ==========================================================

  private leggiOrganizzazioneLocale():
    OrganizzazioneLocale | null {

    try {
      const salvato = localStorage.getItem(this.storageKey);

      if (!salvato) {
        return null;
      }

      const dati = JSON.parse(salvato);

      if (
        !dati ||
        !Array.isArray(dati.cartelle) ||
        !dati.assegnazioni ||
        typeof dati.assegnazioni !== 'object' ||
        Array.isArray(dati.assegnazioni)
      ) {
        throw new Error('Organizzazione locale non valida');
      }

      const cartelle: CartellaLocale[] = [];

      for (const elemento of dati.cartelle) {
        if (
          !elemento ||
          typeof elemento.id !== 'string' ||
          typeof elemento.nome !== 'string' ||
          !['pdf', 'foto', 'zip'].includes(elemento.categoria)
        ) {
          throw new Error('Cartella locale non valida');
        }

        cartelle.push({
          id: elemento.id,
          nome: elemento.nome,
          categoria: elemento.categoria
        });
      }

      const assegnazioni: Record<string, string> = {};

      for (const [id, cartellaId] of Object.entries(
        dati.assegnazioni
      )) {
        if (typeof cartellaId !== 'string') {
          throw new Error('Assegnazione locale non valida');
        }

        assegnazioni[id] = cartellaId;
      }

      return { cartelle, assegnazioni };
    } catch {
      throw new Error(
        'I dati delle vecchie cartelle nel browser non sono leggibili. ' +
        'Non sono stati cancellati: verifica il localStorage.'
      );
    }
  }

  private async migraOrganizzazioneLocale(
    documenti: ArchivioDocumento[],
    cartelleServer: ArchivioCartella[]
  ): Promise<boolean> {
    if (
      localStorage.getItem(this.migrazioneKey) === 'completata'
    ) {
      return false;
    }

    const dati = this.leggiOrganizzazioneLocale();

    if (!dati) {
      return false;
    }

    if (
      dati.cartelle.length === 0 &&
      Object.keys(dati.assegnazioni).length === 0
    ) {
      localStorage.setItem(this.migrazioneKey, 'completata');
      return false;
    }

    const corrispondenze = new Map<string, string>();
    const cartelleDisponibili = [...cartelleServer];

    // Crea le cartelle mancanti. Le cartelle già migrate
    // vengono riconosciute dal nome e dalla categoria.
    for (const locale of dati.cartelle) {
      if (!locale.nome.trim()) {
        throw new Error(
          'Una vecchia cartella non ha un nome valido.'
        );
      }

      let remota = cartelleDisponibili.find(
        cartella =>
          cartella.categoria === locale.categoria &&
          cartella.nome.trim().toLowerCase() ===
            locale.nome.trim().toLowerCase()
      );

      if (!remota) {
        remota = await firstValueFrom(
          this.api.creaCartella(
            locale.nome.trim(),
            locale.categoria
          )
        );

        cartelleDisponibili.push(remota);
      }

      corrispondenze.set(locale.id, remota.id);
    }

    const documentiPerId = new Map(
      documenti.map(doc => [String(doc.id), doc])
    );

    // Riporta nel database le assegnazioni dei documenti.
    // Se un documento ha già una cartella sul server,
    // non sovrascrive la scelta fatta da altri dispositivi.
    for (const [documentoId, vecchiaCartellaId]
      of Object.entries(dati.assegnazioni)) {

      const documento = documentiPerId.get(documentoId);

      if (!documento) {
        // Il documento potrebbe essere stato eliminato.
        continue;
      }

      const nuovaCartellaId =
        corrispondenze.get(vecchiaCartellaId);

      if (!nuovaCartellaId) {
        throw new Error(
          'Una vecchia assegnazione fa riferimento a una cartella mancante.'
        );
      }

      const cartella = cartelleDisponibili.find(
        elemento => elemento.id === nuovaCartellaId
      );

      if (
        !cartella ||
        cartella.categoria !== this.categoriaDocumento(documento)
      ) {
        throw new Error(
          'Una vecchia assegnazione non è compatibile con il tipo di documento.'
        );
      }

      if (documento.cartellaId) {
        continue;
      }

      const aggiornato = await firstValueFrom(
        this.api.spostaDocumento(
          documentoId,
          nuovaCartellaId
        )
      );

      documentiPerId.set(documentoId, aggiornato);
    }

    // Solo dopo aver completato tutte le operazioni
    // contrassegna la migrazione come terminata.
    // La copia originale NON viene eliminata.
    localStorage.setItem(
      this.migrazioneKey,
      'completata'
    );

    this.messaggio =
      'Cartelle locali trasferite nel database. ' +
      'Ora sono disponibili anche sugli altri dispositivi.';

    return true;
  }

  // ==========================================================
  // NAVIGAZIONE
  // ==========================================================

  cambiaCategoria(categoria: CategoriaArchivio): void {
    this.liberaMiniature();
    this.categoria = categoria;
    this.cartellaApertaId = null;
    this.ricerca = '';

    this.annullaNuovaCartella();
    this.annullaModificaCartella();

    this.mostraSelezioneCartella = false;
    this.fileDaCaricare = null;

    this.errore = '';
    this.messaggio = '';

    this.attivita();
  }

  apriCartella(cartella: ArchivioCartella): void {
    if (this.cartellaInModificaId === cartella.id) {
      return;
    }

    this.cartellaApertaId = cartella.id;
    this.ricerca = '';
    this.attivita();
  }

  tornaAlleCartelle(): void {
    this.cartellaApertaId = null;
    this.ricerca = '';
    this.attivita();
  }

  numeroFileCartella(cartellaId: string): number {
    return this.documenti.filter(
      doc => doc.cartellaId === cartellaId
    ).length;
  }

  // ==========================================================
  // GESTIONE CARTELLE
  // ==========================================================

  nuovaCartella(): void {
    if (this.occupato || this.caricamento) {
      return;
    }

    this.annullaModificaCartella();

    this.nomeNuovaCartella = '';
    this.mostraFormCartella = true;
    this.errore = '';
  }

  annullaNuovaCartella(): void {
    this.mostraFormCartella = false;
    this.nomeNuovaCartella = '';
  }

  creaCartella(): void {
    if (this.occupato || this.caricamento) {
      return;
    }

    const nome = this.nomeNuovaCartella.trim();

    if (!nome || nome.length > 80) {
      this.errore =
        'Inserisci un nome da 1 a 80 caratteri.';
      return;
    }

    const duplicato = this.cartelleCategoria.some(
      cartella =>
        cartella.nome.toLowerCase() === nome.toLowerCase()
    );

    if (duplicato) {
      this.errore =
        'Esiste già una cartella con questo nome.';
      return;
    }

    this.occupato = true;
    this.errore = '';

    this.api.creaCartella(nome, this.categoria).subscribe({
      next: cartella => {
        this.cartelle = [...this.cartelle, cartella];

        this.annullaNuovaCartella();
        this.occupato = false;

        this.messaggio = 'Cartella creata correttamente.';
        this.attivita();
      },
      error: error => {
        this.occupato = false;
        this.erroreApi(error);
      }
    });
  }

  modificaCartella(cartella: ArchivioCartella): void {
    if (this.occupato || this.caricamento) {
      return;
    }

    this.annullaNuovaCartella();

    this.cartellaInModificaId = cartella.id;
    this.nomeCartellaInModifica = cartella.nome;

    this.errore = '';
    this.messaggio = '';

    this.attivita();
  }

  confermaModificaCartella(
    cartella: ArchivioCartella
  ): void {
    if (
      this.cartellaInModificaId !== cartella.id ||
      this.occupato ||
      this.caricamento
    ) {
      return;
    }

    const nuovoNome = this.nomeCartellaInModifica.trim();

    if (!nuovoNome || nuovoNome.length > 80) {
      this.errore =
        'Il nome deve contenere da 1 a 80 caratteri.';
      return;
    }

    const duplicato = this.cartelle.some(
      elemento =>
        elemento.id !== cartella.id &&
        elemento.categoria === cartella.categoria &&
        elemento.nome.toLowerCase() ===
          nuovoNome.toLowerCase()
    );

    if (duplicato) {
      this.errore =
        'Esiste già una cartella con questo nome.';
      return;
    }

    if (cartella.nome === nuovoNome) {
      this.annullaModificaCartella();
      return;
    }

    this.occupato = true;
    this.errore = '';

    this.api.rinominaCartella(
      cartella.id,
      nuovoNome
    ).subscribe({
      next: aggiornata => {
        this.cartelle = this.cartelle.map(
          elemento =>
            elemento.id === aggiornata.id
              ? aggiornata
              : elemento
        );

        this.annullaModificaCartella();
        this.occupato = false;

        this.messaggio =
          'Nome della cartella modificato correttamente.';

        this.attivita();
      },
      error: error => {
        this.occupato = false;
        this.erroreApi(error);
      }
    });
  }

  annullaModificaCartella(): void {
    this.cartellaInModificaId = null;
    this.nomeCartellaInModifica = '';
  }

  eliminaCartella(cartella: ArchivioCartella): void {
    if (this.occupato || this.caricamento) {
      return;
    }

    const conferma = confirm(
      `Eliminare la cartella "${cartella.nome}"?\n\n` +
      'I documenti contenuti non verranno eliminati: ' +
      'torneranno nella sezione principale.'
    );

    if (!conferma) {
      return;
    }

    this.occupato = true;
    this.errore = '';

    this.api.eliminaCartella(cartella.id).subscribe({
      next: () => {
        this.cartelle = this.cartelle.filter(
          elemento => elemento.id !== cartella.id
        );

        this.documenti = this.documenti.map(
          documento =>
            documento.cartellaId === cartella.id
              ? { ...documento, cartellaId: null }
              : documento
        );

        if (this.cartellaApertaId === cartella.id) {
          this.cartellaApertaId = null;
        }

        if (this.cartellaInModificaId === cartella.id) {
          this.annullaModificaCartella();
        }

        this.occupato = false;
        this.messaggio = 'Cartella eliminata.';
        this.attivita();
      },
      error: error => {
        this.occupato = false;
        this.erroreApi(error);
      }
    });
  }

  spostaDocumento(
    doc: ArchivioDocumento,
    cartellaId: string
  ): void {
    if (this.occupato || this.caricamento) {
      return;
    }

    const destinazione = cartellaId || null;

    if (destinazione) {
      const cartellaValida = this.cartelle.some(
        cartella =>
          cartella.id === destinazione &&
          cartella.categoria === this.categoriaDocumento(doc)
      );

      if (!cartellaValida) {
        this.errore =
          'Cartella di destinazione non valida.';
        return;
      }
    }

    if ((doc.cartellaId || null) === destinazione) {
      return;
    }

    this.occupato = true;
    this.errore = '';

    this.api.spostaDocumento(
      String(doc.id),
      destinazione
    ).subscribe({
      next: aggiornato => {
        this.documenti = this.documenti.map(
          elemento =>
            elemento.id === aggiornato.id
              ? aggiornato
              : elemento
        );

        this.occupato = false;
        this.messaggio =
          'Documento spostato correttamente.';

        this.attivita();
      },
      error: error => {
        this.occupato = false;
        this.erroreApi(error);
      }
    });
  }

  // ==========================================================
  // CARICAMENTO PDF, FOTO E ZIP
  // ==========================================================

  selezionaFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    input.value = '';

    if (file) {
      this.preparaCaricamento(file);
    }
  }

  trascinaSopra(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.occupato && !this.caricamento) {
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

    if (this.occupato || this.caricamento) {
      return;
    }

    const file = event.dataTransfer?.files?.[0];

    if (file) {
      this.preparaCaricamento(file);
    }
  }

  private preparaCaricamento(file: File): void {
    this.errore = '';

    const nome = file.name.toLowerCase();

    const maxBytes =
      this.categoria === 'zip'
        ? 100 * 1024 * 1024
        : 15 * 1024 * 1024;

    if (!file.size || file.size > maxBytes) {
      this.errore =
        this.categoria === 'zip'
          ? 'Dimensione massima ZIP: 100 MB.'
          : 'Dimensione massima consentita: 15 MB.';
      return;
    }

    let valido = false;

    if (this.categoria === 'pdf') {
      valido = nome.endsWith('.pdf');
    } else if (this.categoria === 'foto') {
      valido =
        nome.endsWith('.jpg') ||
        nome.endsWith('.jpeg') ||
        nome.endsWith('.png') ||
        nome.endsWith('.webp');
    } else {
      valido = nome.endsWith('.zip');
    }

    if (!valido) {
      this.errore =
        this.categoria === 'pdf'
          ? 'In questa sezione puoi caricare solo PDF.'
          : this.categoria === 'foto'
            ? 'In questa sezione puoi caricare JPG, PNG e WebP.'
            : 'In questa sezione puoi caricare solo ZIP.';
      return;
    }

    this.fileDaCaricare = file;
    this.cartellaDestinazioneId =
      this.cartellaApertaId || '';

    this.mostraSelezioneCartella = true;
    this.attivita();
  }

  annullaCaricamento(): void {
    this.fileDaCaricare = null;
    this.mostraSelezioneCartella = false;
    this.cartellaDestinazioneId = '';
  }

  confermaCaricamento(): void {
    const file = this.fileDaCaricare;

    if (!file || this.occupato || this.caricamento) {
      return;
    }

    const destinazione =
      this.cartellaDestinazioneId || null;

    this.occupato = true;
    this.errore = '';
    this.messaggio = '';
    this.attivita();

    this.api.carica(file, destinazione).subscribe({
      next: documento => {
        this.documenti = [
          documento,
          ...this.documenti
        ];

        this.occupato = false;
        this.annullaCaricamento();

        this.messaggio =
          'File caricato e cifrato correttamente.';

        this.attivita();
      },
      error: error => {
        this.occupato = false;
        this.erroreApi(error);
      }
    });
  }

  // ==========================================================
  // DOWNLOAD E ANTEPRIME
  // ==========================================================

  get documentiDaEsportare(): ArchivioDocumento[] {
    const ricerca = this.ricerca.trim().toLowerCase();
    return this.documentiCategoria.filter(doc => {
      if (this.cartellaApertaId && doc.cartellaId !== this.cartellaApertaId) {
        return false;
      }
      return !ricerca || doc.nomeOriginale.toLowerCase().includes(ricerca);
    });
  }

  scaricaTutto(): void {
    if (this.downloadZipInCorso || this.occupato || this.caricamento ||
        !this.api.autenticato) return;

    const ids = this.documentiDaEsportare.map(doc => String(doc.id));
    if (!ids.length) {
      this.errore = 'Non ci sono file da scaricare.';
      return;
    }

    this.downloadZipInCorso = true;
    this.errore = '';
    this.messaggio = '';
    this.attivita();

    const categoria = this.categoria;
    const cartellaId = this.cartellaApertaId;
    const nomeBase = this.cartellaAperta?.nome || `archivio-${categoria}`;
    const nomeSicuro = nomeBase.replace(/[\\/:*?"<>|]/g, '-').trim() || 'archivio';

    this.api.scaricaZip(ids, categoria, cartellaId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${nomeSicuro}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        this.downloadZipInCorso = false;
        this.messaggio = `Download ZIP avviato (${ids.length} file).`;
        this.attivita();
      },
      error: error => {
        this.downloadZipInCorso = false;
        this.erroreApi(error);
      }
    });
  }

  scarica(doc: ArchivioDocumento): void {
    this.errore = '';
    this.attivita();

    this.api.file(String(doc.id)).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const collegamento =
          document.createElement('a');

        collegamento.href = url;
        collegamento.download = doc.nomeOriginale;

        document.body.appendChild(collegamento);
        collegamento.click();
        collegamento.remove();

        setTimeout(
          () => URL.revokeObjectURL(url),
          1000
        );
      },
      error: error => this.erroreApi(error)
    });
  }

  anteprima(doc: ArchivioDocumento): void {
    this.chiudiAnteprima();
    this.errore = '';
    this.attivita();

    if (
      doc.mimeType !== 'application/pdf' &&
      !doc.mimeType.startsWith('image/')
    ) {
      this.errore =
        'Per i file ZIP è disponibile il download, non l’anteprima.';
      return;
    }

    this.api.file(String(doc.id)).subscribe({
      next: blob => {
        this.objectUrl = URL.createObjectURL(
          new Blob(
            [blob],
            { type: doc.mimeType }
          )
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
    if (this.occupato || this.caricamento) {
      return;
    }

    const conferma = confirm(
      `Eliminare definitivamente "${doc.nomeOriginale}"?`
    );

    if (!conferma) {
      return;
    }

    this.occupato = true;
    this.errore = '';
    this.attivita();

    this.api.elimina(String(doc.id)).subscribe({
      next: () => {
        this.chiudiAnteprima();

        const urlMiniatura = this.miniatureUrl[String(doc.id)];
        if (urlMiniatura) {
          URL.revokeObjectURL(urlMiniatura);
          const { [String(doc.id)]: _rimossa, ...altre } = this.miniatureUrl;
          this.miniatureUrl = altre;
        }

        this.documenti = this.documenti.filter(
          elemento => elemento.id !== doc.id
        );

        this.occupato = false;
        this.messaggio =
          'Documento eliminato correttamente.';
      },
      error: error => {
        this.occupato = false;
        this.erroreApi(error);
      }
    });
  }

  // ==========================================================
  // UTILITÀ
  // ==========================================================

  dimensione(bytes: string): string {
    const n = Number(bytes);

    if (!Number.isFinite(n) || n < 0) {
      return 'Dimensione sconosciuta';
    }

    if (n < 1024) {
      return `${n} B`;
    }

    if (n < 1024 * 1024) {
      return `${(n / 1024).toFixed(1)} KB`;
    }

    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  iconaDocumento(doc: ArchivioDocumento): string {
    if (doc.mimeType === 'application/pdf') {
      return 'pi pi-file-pdf';
    }

    if (doc.mimeType.startsWith('image/')) {
      return 'pi pi-image';
    }

    return 'pi pi-file';
  }

  trackByDocumento(
    index: number,
    doc: ArchivioDocumento
  ): string {
    return String(doc.id);
  }

  trackByCartella(
    index: number,
    cartella: ArchivioCartella
  ): string {
    return cartella.id;
  }
}
