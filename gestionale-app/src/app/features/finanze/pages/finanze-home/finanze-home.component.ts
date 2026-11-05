
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';

import {
  Conto,
  FinanzeApiService,
  Movimento,
  MovimentoPayload,
  RiepilogoFinanze,
  TipoMovimento
} from '../../services/finanze-api.service';

type SchedaFinanze = 'riepilogo' | 'movimenti' | 'salvadanai';

interface ModuloMovimento {
  tipo: TipoMovimento;
  importo: string;
  descrizione: string;
  categoria: string;
  dataMovimento: string;
  note: string;
}

@Component({
  selector: 'app-finanze-home',
  templateUrl: './finanze-home.component.html',
  styleUrls: ['./finanze-home.component.scss']
})
export class FinanzeHomeComponent implements OnInit, OnDestroy {

  schedaAttiva: SchedaFinanze = 'riepilogo';

  conto: Conto | null = null;
  riepilogo: RiepilogoFinanze | null = null;
  movimenti: Movimento[] = [];

  ricercaMovimento = '';
  paginaMovimenti = 1;
  readonly movimentiPerPagina = 5;

  caricamento = false;
  salvataggio = false;
  errore = '';
  messaggio = '';

  notifiche: {
    id: number;
    tipo: 'successo' | 'errore';
    titolo: string;
    testo: string;
  }[] = [];

  private prossimoIdNotifica = 0;
  private timerNotifiche =
    new Map<number, ReturnType<typeof setTimeout>>();

  saldoIniziale = '';
  confermaSaldo = false;

  mostraModuloMovimento = false;
  movimentoInModifica: number | null = null;

  modulo: ModuloMovimento = this.moduloVuoto();

  constructor(
    private readonly finanzeApi: FinanzeApiService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.caricaDati();
  }

  ngOnDestroy(): void {
    this.timerNotifiche.forEach(timer => clearTimeout(timer));
    this.timerNotifiche.clear();
  }

  private notifica(
    tipo: 'successo' | 'errore',
    testo: string
  ): void {
    const id = ++this.prossimoIdNotifica;

    this.notifiche = [
      ...this.notifiche,
      {
        id,
        tipo,
        testo,
        titolo: tipo === 'successo'
          ? 'Operazione riuscita'
          : 'Errore'
      }
    ];

    const timer = setTimeout(
      () => this.chiudiNotifica(id),
      5000
    );

    this.timerNotifiche.set(id, timer);
  }

  chiudiNotifica(id: number): void {
    this.notifiche = this.notifiche.filter(
      notifica => notifica.id !== id
    );

    const timer = this.timerNotifiche.get(id);

    if (timer) {
      clearTimeout(timer);
    }

    this.timerNotifiche.delete(id);
  }

  private mostraErrore(testo: string): void {
    this.errore = '';
    this.notifica('errore', testo);
  }

  private mostraSuccesso(testo: string): void {
    this.messaggio = '';
    this.notifica('successo', testo);
  }

  cambiaScheda(scheda: SchedaFinanze): void {
    this.schedaAttiva = scheda;
    this.errore = '';
    this.messaggio = '';

    if (!this.mostraModuloMovimento) {
      this.caricaDati();
    }
  }

  apriSalvadanai(): void {
    this.router.navigate(['/finanze/salvadanai']);
  }

  tornaDashboard(): void {
    this.router.navigate(['/']);
  }

  private dataOggi(): string {
    const oggi = new Date();
    const anno = oggi.getFullYear();
    const mese = String(oggi.getMonth() + 1).padStart(2, '0');
    const giorno = String(oggi.getDate()).padStart(2, '0');

    return `${anno}-${mese}-${giorno}`;
  }

  private moduloVuoto(): ModuloMovimento {
    return {
      tipo: 'USCITA',
      importo: '',
      descrizione: '',
      categoria: '',
      dataMovimento: this.dataOggi(),
      note: ''
    };
  }

  private normalizzaImporto(
    valore: string
  ): string | null {
    const pulito = valore.trim().replace(',', '.');

    if (!/^\d{1,13}(\.\d{1,2})?$/.test(pulito)) {
      return null;
    }

    const [interi, decimali = ''] = pulito.split('.');
    const centesimi = decimali.padEnd(2, '0');

    return `${interi}.${centesimi}`;
  }

  private erroreApi(errore: unknown): string {
    if (errore instanceof HttpErrorResponse) {
      const risposta = errore.error;

      if (Array.isArray(risposta?.message)) {
        return risposta.message.join(', ');
      }

      if (typeof risposta?.message === 'string') {
        return risposta.message;
      }

      if (errore.status === 0) {
        return 'Impossibile raggiungere NestJS su localhost:3000.';
      }
    }

    return 'Si è verificato un errore. Riprova.';
  }

  caricaDati(): void {
    this.caricamento = true;
    this.errore = '';

    forkJoin({
      conto: this.finanzeApi.getConto(),
      riepilogo: this.finanzeApi.getRiepilogo(),
      movimenti: this.finanzeApi.getMovimenti()
    }).subscribe({
      next: ({ conto, riepilogo, movimenti }) => {
        this.conto = conto;
        this.riepilogo = riepilogo;
        this.movimenti = movimenti;
        this.correggiPaginaMovimenti();
        this.caricamento = false;
      },
      error: errore => {
        this.mostraErrore(this.erroreApi(errore));
        this.caricamento = false;
      }
    });
  }

  formattaEuro(
    valore: string | number | undefined
  ): string {
    const numero = Number(valore ?? 0);

    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(numero);
  }

  get movimentiAttivi(): Movimento[] {
    return this.movimenti.filter(
      movimento => !movimento.annullatoIl
    );
  }

  get movimentiFiltrati(): Movimento[] {
    const ricerca = this.ricercaMovimento
      .trim()
      .toLocaleLowerCase('it-IT');

    if (!ricerca) {
      return this.movimentiAttivi;
    }

    return this.movimentiAttivi.filter(
      movimento =>
        movimento.descrizione
          .toLocaleLowerCase('it-IT')
          .includes(ricerca)
    );
  }

  get totalePagineMovimenti(): number {
    return Math.max(
      1,
      Math.ceil(
        this.movimentiFiltrati.length /
        this.movimentiPerPagina
      )
    );
  }

  get movimentiPagina(): Movimento[] {
    const inizio =
      (this.paginaMovimenti - 1) *
      this.movimentiPerPagina;

    return this.movimentiFiltrati.slice(
      inizio,
      inizio + this.movimentiPerPagina
    );
  }

  cercaMovimenti(): void {
    this.paginaMovimenti = 1;
  }

  cambiaPaginaMovimenti(
    direzione: -1 | 1
  ): void {
    const nuovaPagina =
      this.paginaMovimenti + direzione;

    if (
      nuovaPagina >= 1 &&
      nuovaPagina <= this.totalePagineMovimenti
    ) {
      this.paginaMovimenti = nuovaPagina;
    }
  }

  private correggiPaginaMovimenti(): void {
    this.paginaMovimenti = Math.min(
      Math.max(this.paginaMovimenti, 1),
      this.totalePagineMovimenti
    );
  }

  get movimentiAnnullati(): Movimento[] {
    return this.movimenti.filter(
      movimento => Boolean(movimento.annullatoIl)
    );
  }

  impostaSaldo(): void {
    this.errore = '';
    this.messaggio = '';

    if (this.conto?.configurato) {
      this.mostraErrore(
        'Il saldo iniziale è già stato confermato.'
      );
      return;
    }

    const importo =
      this.normalizzaImporto(this.saldoIniziale);

    if (importo === null) {
      this.mostraErrore(
        'Inserisci un importo valido, ad esempio 1500,00.'
      );
      return;
    }

    if (!this.confermaSaldo) {
      this.mostraErrore(
        'Devi confermare di aver verificato il saldo.'
      );
      return;
    }

    const confermato = window.confirm(
      `Stai per impostare il saldo iniziale a ` +
      `${this.formattaEuro(importo)}.\n\n` +
      `Questa operazione è definitiva e non potrà essere modificata. ` +
      `Vuoi continuare?`
    );

    if (!confermato) {
      return;
    }

    this.salvataggio = true;

    this.finanzeApi.impostaSaldoIniziale(
      importo
    ).subscribe({
      next: () => {
        this.salvataggio = false;
        this.saldoIniziale = '';
        this.confermaSaldo = false;

        this.mostraSuccesso(
          'Saldo iniziale confermato definitivamente.'
        );

        this.caricaDati();
      },
      error: errore => {
        this.salvataggio = false;
        this.mostraErrore(
          this.erroreApi(errore)
        );
      }
    });
  }

  nuovoMovimento(): void {
    this.errore = '';
    this.messaggio = '';
    this.movimentoInModifica = null;
    this.modulo = this.moduloVuoto();
    this.mostraModuloMovimento = true;
  }

  modificaMovimento(
    movimento: Movimento
  ): void {
    if (movimento.annullatoIl) {
      return;
    }

    this.errore = '';
    this.messaggio = '';
    this.movimentoInModifica = movimento.id;

    this.modulo = {
      tipo: movimento.tipo,
      importo: movimento.importo,
      descrizione: movimento.descrizione,
      categoria: movimento.categoria ?? '',
      dataMovimento: movimento.dataMovimento,
      note: movimento.note ?? ''
    };

    this.mostraModuloMovimento = true;
  }

  chiudiModulo(): void {
    this.mostraModuloMovimento = false;
    this.movimentoInModifica = null;
    this.modulo = this.moduloVuoto();
  }

  salvaMovimento(): void {
    this.errore = '';
    this.messaggio = '';

    if (!this.conto?.configurato) {
      this.mostraErrore(
        'Configura prima il saldo iniziale.'
      );
      return;
    }

    const importo =
      this.normalizzaImporto(this.modulo.importo);

    if (
      importo === null ||
      Number(importo) <= 0
    ) {
      this.mostraErrore(
        'L’importo deve essere maggiore di zero.'
      );
      return;
    }

    if (!this.modulo.descrizione.trim()) {
      this.mostraErrore(
        'La descrizione è obbligatoria.'
      );
      return;
    }

    if (!this.modulo.dataMovimento) {
      this.mostraErrore(
        'Seleziona la data del movimento.'
      );
      return;
    }

    const dati: MovimentoPayload = {
      tipo: this.modulo.tipo,
      importo,
      descrizione: this.modulo.descrizione.trim(),
      categoria: this.modulo.categoria.trim(),
      dataMovimento: this.modulo.dataMovimento,
      note: this.modulo.note.trim()
    };

    const modifica =
      this.movimentoInModifica !== null;

    const richiesta = modifica
      ? this.finanzeApi.modificaMovimento(
          this.movimentoInModifica!,
          dati
        )
      : this.finanzeApi.creaMovimento(dati);

    this.salvataggio = true;

    richiesta.subscribe({
      next: () => {
        this.salvataggio = false;
        this.chiudiModulo();

        this.mostraSuccesso(
          modifica
            ? 'Movimento aggiornato correttamente.'
            : 'Movimento registrato correttamente.'
        );

        this.caricaDati();
      },
      error: errore => {
        this.salvataggio = false;
        this.mostraErrore(
          this.erroreApi(errore)
        );
      }
    });
  }

  annullaMovimento(
    movimento: Movimento
  ): void {
    if (movimento.annullatoIl) {
      return;
    }

    const confermato = window.confirm(
      `Vuoi annullare il movimento "${movimento.descrizione}" ` +
      `di ${this.formattaEuro(movimento.importo)}?\n\n` +
      `Il movimento resterà nello storico, ` +
      `ma non sarà più conteggiato nel saldo.`
    );

    if (!confermato) {
      return;
    }

    this.errore = '';
    this.messaggio = '';
    this.salvataggio = true;

    this.finanzeApi.annullaMovimento(
      movimento.id
    ).subscribe({
      next: () => {
        this.salvataggio = false;

        this.mostraSuccesso(
          'Movimento annullato correttamente.'
        );

        this.caricaDati();
      },
      error: errore => {
        this.salvataggio = false;
        this.mostraErrore(
          this.erroreApi(errore)
        );
      }
    });
  }
}
