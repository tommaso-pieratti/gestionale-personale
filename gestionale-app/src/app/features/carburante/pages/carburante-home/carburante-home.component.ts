
import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { NotificheService } from '../../../../core/services/notifiche.service';
import { CarburanteApiService } from '../../services/carburante-api.service';

import {
  Auto,
  AutoPayload,
  Rifornimento,
  RifornimentoPayload,
  RiepilogoCarburante,
  TipoRifornimento,
} from '../../models/carburante.models';

type Scheda = 'riepilogo' | 'rifornimenti' | 'auto';

interface AutoForm {
  nome: string;
  marca: string;
  modello: string;
  targa: string;
  alimentazione: string;
  note: string;
}

interface RifornimentoForm {
  autoId: number | null;
  data: Date | null;
  importo: number | null;
  prezzoUnitario: number | null;
  tipoRifornimento: TipoRifornimento | null;
  kmAttuali: number | null;
  distributore: string;
}

@Component({
  selector: 'app-carburante-home',
  templateUrl: './carburante-home.component.html',
  styleUrls: ['./carburante-home.component.scss'],
})
export class CarburanteHomeComponent implements OnInit {
  scheda: Scheda = 'riepilogo';

  riepilogo: RiepilogoCarburante = {
    totaleSpeso: '0.00',
    totaleLitri: '0.000',
  };

  auto: Auto[] = [];
  rifornimenti: Rifornimento[] = [];

  readonly movimentiPerPagina = 5;
  paginaRifornimenti = 1;

  get totalePagineRifornimenti(): number {
    return Math.max(1, Math.ceil(this.rifornimenti.length / this.movimentiPerPagina));
  }


  get rifornimentiPagina(): Rifornimento[] {
    const inizio = (this.paginaRifornimenti - 1) * this.movimentiPerPagina;
    return this.rifornimenti.slice(inizio, inizio + this.movimentiPerPagina);
  }

  get primoMovimento(): number {
    return this.rifornimenti.length ? (this.paginaRifornimenti - 1) * this.movimentiPerPagina + 1 : 0;
  }

  get ultimoMovimento(): number {
    return Math.min(this.paginaRifornimenti * this.movimentiPerPagina, this.rifornimenti.length);
  }

  vaiAPaginaRifornimenti(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalePagineRifornimenti) {
      this.paginaRifornimenti = pagina;
    }
  }

  // Filtri indipendenti del riepilogo (null = tutti).
  filtroAnno: number | null = null;
  filtroAutoId: number | null = null;

  caricamento = false;
  salvataggio = false;

  dialogAuto = false;
  dialogRifornimento = false;

  idAutoModifica: number | null = null;
  idRifornimentoModifica: number | null = null;

  autoDaEliminare: Auto | null = null;
  rifornimentoDaEliminare: Rifornimento | null = null;

  testoDataRifornimento = '';
  readonly dataOggiPlaceholder = this.formattaDataIt(new Date());

  formAuto: AutoForm = this.nuovoFormAuto();
  formRifornimento: RifornimentoForm =
    this.nuovoFormRifornimento();

  readonly tipiRifornimento = [
    { label: 'Pieno', value: 'PIENO' },
    { label: 'Parziale', value: 'PARZIALE' },
  ];

  constructor(
    private readonly api: CarburanteApiService,
    private readonly notifiche: NotificheService,
  ) {}

  ngOnInit(): void {
    this.caricaDati();
  }

  cambiaScheda(scheda: Scheda): void {
    this.scheda = scheda;
    this.caricaDati();
  }

  private nuovoFormAuto(): AutoForm {
    return {
      nome: '',
      marca: '',
      modello: '',
      targa: '',
      alimentazione: '',
      note: '',
    };
  }

  private nuovoFormRifornimento(): RifornimentoForm {
    return {
      autoId: null,
      data: null,
      importo: null,
      prezzoUnitario: null,
      tipoRifornimento: null,
      kmAttuali: null,
      distributore: '',
    };
  }

  private testoFacoltativo(valore: string): string | null {
    const testo = valore.trim();
    return testo ? testo : null;
  }

  private formattaDataIt(data: Date): string {
    const giorno = String(data.getDate()).padStart(2, '0');
    const mese = String(data.getMonth() + 1).padStart(2, '0');
    return `${giorno}/${mese}/${data.getFullYear()}`;
  }

  // Inserisce automaticamente gli slash durante la digitazione.
  // La data diventa valida soltanto dopo 8 cifre e un controllo reale del calendario.
  cambiaTestoData(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const cifre = input.value.replace(/\D/g, '').slice(0, 8);
    let testo = cifre.slice(0, 2);
    if (cifre.length > 2) testo += '/' + cifre.slice(2, 4);
    if (cifre.length > 4) testo += '/' + cifre.slice(4, 8);

    this.testoDataRifornimento = testo;
    input.value = testo;
    this.formRifornimento.data = this.interpretaDataIt(testo);
  }

  private interpretaDataIt(testo: string): Date | null {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(testo)) return null;
    const [giorno, mese, anno] = testo.split('/').map(Number);
    if (anno < 1000 || mese < 1 || mese > 12 || giorno < 1 || giorno > 31) return null;
    const data = new Date(anno, mese - 1, giorno);
    return data.getFullYear() === anno &&
      data.getMonth() === mese - 1 &&
      data.getDate() === giorno ? data : null;
  }

  // Il calendario aggiorna il campo di testo senza alterare la digitazione manuale.
  selezionaDataCalendario(data: Date): void {
    if (!(data instanceof Date) || Number.isNaN(data.getTime())) return;
    this.formRifornimento.data = data;
    this.testoDataRifornimento = this.formattaDataIt(data);
  }

  private dataLocale(data: Date): string {
    const anno = data.getFullYear();
    const mese = String(data.getMonth() + 1).padStart(2, '0');
    const giorno = String(data.getDate()).padStart(2, '0');

    return `${anno}-${mese}-${giorno}`;
  }

  private daDataLocale(valore: string): Date {
    const [anno, mese, giorno] = valore.split('-').map(Number);
    return new Date(anno, mese - 1, giorno);
  }

  private mostraErrore(errore: unknown): void {
    const risposta = errore as HttpErrorResponse;
    const messaggio = risposta?.error?.message;

    const testo = Array.isArray(messaggio)
      ? messaggio.join(', ')
      : typeof messaggio === 'string'
        ? messaggio
        : 'Operazione non riuscita. Riprova.';

    this.notifiche.errore(testo);
  }

  caricaDati(): void {
    this.caricamento = true;

    this.api.getRiepilogo().subscribe({
      next: (dati) => {
        this.riepilogo = dati;
        this.caricamento = false;
      },
      error: (errore) => {
        this.caricamento = false;
        this.mostraErrore(errore);
      },
    });

    this.caricaAuto();
    this.caricaRifornimenti();
  }

  caricaAuto(): void {
    this.api.getAuto().subscribe({
      next: (dati) => {
        this.auto = dati;
      },
      error: (errore) => this.mostraErrore(errore),
    });
  }

  caricaRifornimenti(): void {
    this.api.getRifornimenti().subscribe({
      next: (dati) => {
        this.rifornimenti = dati;
        this.paginaRifornimenti = Math.min(this.paginaRifornimenti, this.totalePagineRifornimenti);
      },
      error: (errore) => this.mostraErrore(errore),
    });
  }

  // Gli anni provengono dalle date effettive dei rifornimenti.
  get opzioniAnni(): { label: string; value: number | null }[] {
    const anni = Array.from(new Set(
      this.rifornimenti
        .map((r) => Number(String(r.dataRifornimento).slice(0, 4)))
        .filter((anno) => Number.isInteger(anno) && anno > 0)
    )).sort((a, b) => b - a);

    return [
      { label: 'Tutti gli anni', value: null },
      ...anni.map((anno) => ({ label: String(anno), value: anno })),
    ];
  }

  get opzioniAutoRiepilogo(): { label: string; value: number | null }[] {
    return [
      { label: 'Tutte le auto', value: null },
      ...this.auto.map((a) => ({ label: a.targa?.trim() || a.nome, value: a.id })),
    ];
  }

  get rifornimentiRiepilogo(): Rifornimento[] {
    return this.rifornimenti.filter((r) => {
      const anno = Number(String(r.dataRifornimento).slice(0, 4));
      return (this.filtroAnno === null || anno === this.filtroAnno) &&
        (this.filtroAutoId === null || Number(r.autoId) === this.filtroAutoId);
    });
  }

  get totaleSpesoFiltrato(): number {
    return this.rifornimentiRiepilogo.reduce(
      (totale, r) => totale + Number(r.importo), 0
    );
  }

  get totaleLitriFiltrato(): number {
    return this.rifornimentiRiepilogo.reduce(
      (totale, r) => totale + Number(r.litri), 0
    );
  }

  // Media ponderata: spesa complessiva divisa per i litri complessivi.
  get mediaEuroLitro(): number | null {
    const litri = this.totaleLitriFiltrato;
    return litri > 0 ? this.totaleSpesoFiltrato / litri : null;
  }

  azzeraFiltriRiepilogo(): void {
    this.filtroAnno = null;
    this.filtroAutoId = null;
  }

  // I litri sono calcolati da importo / prezzo al litro.
  // Il database conserva fino a tre cifre decimali per i litri.
  get litriCalcolati(): number | null {
    const importo = this.formRifornimento.importo;
    const prezzo = this.formRifornimento.prezzoUnitario;

    if (importo === null || prezzo === null ||
        !Number.isFinite(importo) || !Number.isFinite(prezzo) ||
        importo <= 0 || prezzo <= 0) {
      return null;
    }

    const litri = Math.round((importo / prezzo) * 1000) / 1000;
    return Number.isFinite(litri) && litri > 0 ? litri : null;
  }

  get opzioniAuto() {
    return this.auto.map((auto) => ({
      label: auto.targa?.trim() || auto.nome,
      value: auto.id,
    }));
  }

  // Il pulsante Salva si attiva solo quando i campi obbligatori sono validi.
  get autoValida(): boolean {
    return this.formAuto.nome.trim().length > 0;
  }

  get rifornimentoValido(): boolean {
    const form = this.formRifornimento;
    return form.autoId !== null &&
      this.auto.some((auto) => auto.id === form.autoId) &&
      this.testoDataRifornimento === (form.data ? this.formattaDataIt(form.data) : '') &&
      form.data instanceof Date &&
      !Number.isNaN(form.data.getTime()) &&
      form.importo !== null && Number.isFinite(form.importo) &&
      form.importo > 0 &&
      form.prezzoUnitario !== null && Number.isFinite(form.prezzoUnitario) &&
      form.prezzoUnitario > 0 && this.litriCalcolati !== null &&
      (form.kmAttuali === null ||
        (Number.isInteger(form.kmAttuali) && form.kmAttuali >= 0));
  }

  // AUTO

  nuovaAuto(): void {
    this.idAutoModifica = null;
    this.formAuto = this.nuovoFormAuto();
    this.dialogAuto = true;
  }

  modificaAuto(auto: Auto): void {
    this.idAutoModifica = auto.id;

    this.formAuto = {
      nome: auto.nome,
      marca: auto.marca ?? '',
      modello: auto.modello ?? '',
      targa: auto.targa ?? '',
      alimentazione: auto.alimentazione ?? '',
      note: auto.note ?? '',
    };

    this.dialogAuto = true;
  }

  salvaAuto(): void {
    if (!this.formAuto.nome.trim()) {
      this.notifiche.errore('Inserisci il nome dell’auto.');
      return;
    }

    if (this.salvataggio) {
      return;
    }

    const dati: AutoPayload = {
      nome: this.formAuto.nome.trim(),
      marca: this.testoFacoltativo(this.formAuto.marca),
      modello: this.testoFacoltativo(this.formAuto.modello),
      targa: this.testoFacoltativo(this.formAuto.targa),
      alimentazione: this.testoFacoltativo(
        this.formAuto.alimentazione
      ),
      note: this.testoFacoltativo(this.formAuto.note),
    };

    const modifica = this.idAutoModifica !== null;

    this.salvataggio = true;

    const richiesta = modifica
      ? this.api.modificaAuto(this.idAutoModifica!, dati)
      : this.api.creaAuto(dati);

    richiesta.subscribe({
      next: () => {
        this.salvataggio = false;
        this.dialogAuto = false;

        this.notifiche.successo(
          modifica
            ? 'Auto modificata correttamente.'
            : 'Auto inserita correttamente.'
        );

        this.caricaAuto();
      },
      error: (errore) => {
        this.salvataggio = false;
        this.mostraErrore(errore);
      },
    });
  }

  chiediEliminaAuto(auto: Auto): void {
    this.autoDaEliminare = auto;
  }

  confermaEliminaAuto(): void {
    if (!this.autoDaEliminare || this.salvataggio) {
      return;
    }

    this.salvataggio = true;

    this.api.eliminaAuto(this.autoDaEliminare.id).subscribe({
      next: () => {
        this.salvataggio = false;
        this.autoDaEliminare = null;

        this.notifiche.successo(
          'Auto eliminata correttamente.'
        );

        this.caricaAuto();
      },
      error: (errore) => {
        this.salvataggio = false;
        this.autoDaEliminare = null;
        this.mostraErrore(errore);
      },
    });
  }

  // RIFORNIMENTI

  nuovoRifornimento(): void {
    if (!this.auto.length) {
      this.notifiche.errore(
        'Inserisci prima un’auto nella scheda Auto.'
      );
      return;
    }

    this.idRifornimentoModifica = null;
    this.formRifornimento = this.nuovoFormRifornimento();
    this.testoDataRifornimento = '';

    if (this.auto.length === 1) {
      this.formRifornimento.autoId = this.auto[0].id;
    }

    this.dialogRifornimento = true;
  }

  modificaRifornimento(rifornimento: Rifornimento): void {
    this.idRifornimentoModifica = rifornimento.id;

    this.formRifornimento = {
      autoId: rifornimento.autoId,
      data: this.daDataLocale(rifornimento.dataRifornimento),
      importo: Number(rifornimento.importo),
      prezzoUnitario: Number(rifornimento.litri) > 0
        ? Number(rifornimento.importo) / Number(rifornimento.litri)
        : null,
      tipoRifornimento: rifornimento.tipoRifornimento,
      kmAttuali: rifornimento.kmAttuali,
      distributore: rifornimento.distributore ?? '',
    };

    this.testoDataRifornimento = this.formattaDataIt(this.formRifornimento.data!);
    this.dialogRifornimento = true;
  }

  salvaRifornimento(): void {
    const form = this.formRifornimento;

    if (
      !this.rifornimentoValido ||
      form.autoId === null ||
      form.data === null ||
      form.importo === null ||
      form.importo <= 0 ||
      form.prezzoUnitario === null ||
      !Number.isFinite(form.prezzoUnitario) ||
      form.prezzoUnitario <= 0 ||
      this.litriCalcolati === null
    ) {
      this.notifiche.errore(
        'Compila auto, data, importo e prezzo al litro con valori validi.'
      );
      return;
    }

    if (
      form.kmAttuali !== null &&
      (!Number.isInteger(form.kmAttuali) ||
        form.kmAttuali < 0)
    ) {
      this.notifiche.errore(
        'Il chilometraggio deve essere un numero intero non negativo.'
      );
      return;
    }

    if (this.salvataggio) {
      return;
    }

    const dati: RifornimentoPayload = {
      autoId: form.autoId,
      dataRifornimento: this.dataLocale(form.data),
      importo: form.importo.toFixed(2),
      litri: this.litriCalcolati!.toFixed(3),
      tipoRifornimento: form.tipoRifornimento,
      kmAttuali: form.kmAttuali,
      distributore: this.testoFacoltativo(
        form.distributore
      ),
    };

    const modifica = this.idRifornimentoModifica !== null;
    this.salvataggio = true;

    const richiesta = modifica
      ? this.api.modificaRifornimento(
          this.idRifornimentoModifica!,
          dati
        )
      : this.api.creaRifornimento(dati);

    richiesta.subscribe({
      next: () => {
        this.salvataggio = false;
        this.dialogRifornimento = false;

        this.notifiche.successo(
          modifica
            ? 'Rifornimento modificato correttamente.'
            : 'Rifornimento inserito correttamente.'
        );

        this.caricaDati();
      },
      error: (errore) => {
        this.salvataggio = false;
        this.mostraErrore(errore);
      },
    });
  }

  chiediEliminaRifornimento(
    rifornimento: Rifornimento
  ): void {
    this.rifornimentoDaEliminare = rifornimento;
  }

  confermaEliminaRifornimento(): void {
    if (!this.rifornimentoDaEliminare || this.salvataggio) {
      return;
    }

    this.salvataggio = true;

    this.api.eliminaRifornimento(
      this.rifornimentoDaEliminare.id
    ).subscribe({
      next: () => {
        this.salvataggio = false;
        this.rifornimentoDaEliminare = null;

        this.notifiche.successo(
          'Rifornimento eliminato correttamente.'
        );

        this.caricaDati();
      },
      error: (errore) => {
        this.salvataggio = false;
        this.rifornimentoDaEliminare = null;
        this.mostraErrore(errore);
      },
    });
  }
}
