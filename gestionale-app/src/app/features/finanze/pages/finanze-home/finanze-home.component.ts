
import { Component, OnInit } from '@angular/core';
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
export class FinanzeHomeComponent implements OnInit {

  // Scheda attualmente selezionata
  schedaAttiva: SchedaFinanze = 'riepilogo';

  conto: Conto | null = null;
  riepilogo: RiepilogoFinanze | null = null;
  movimenti: Movimento[] = [];

  caricamento = false;
  salvataggio = false;
  errore = '';
  messaggio = '';

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

  private normalizzaImporto(valore: string): string | null {
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
        this.caricamento = false;
      },
      error: errore => {
        this.errore = this.erroreApi(errore);
        this.caricamento = false;
      }
    });
  }

  formattaEuro(valore: string | number | undefined): string {
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

  get movimentiAnnullati(): Movimento[] {
    return this.movimenti.filter(
      movimento => Boolean(movimento.annullatoIl)
    );
  }

  impostaSaldo(): void {
    this.errore = '';
    this.messaggio = '';

    if (this.conto?.configurato) {
      this.errore = 'Il saldo iniziale è già stato confermato.';
      return;
    }

    const importo = this.normalizzaImporto(this.saldoIniziale);

    if (importo === null) {
      this.errore = 'Inserisci un importo valido, ad esempio 1500,00.';
      return;
    }

    if (!this.confermaSaldo) {
      this.errore = 'Devi confermare di aver verificato il saldo.';
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

    this.finanzeApi.impostaSaldoIniziale(importo).subscribe({
      next: () => {
        this.salvataggio = false;
        this.saldoIniziale = '';
        this.confermaSaldo = false;
        this.messaggio = 'Saldo iniziale confermato definitivamente.';
        this.caricaDati();
      },
      error: errore => {
        this.salvataggio = false;
        this.errore = this.erroreApi(errore);
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

  modificaMovimento(movimento: Movimento): void {
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
      this.errore = 'Configura prima il saldo iniziale.';
      return;
    }

    const importo = this.normalizzaImporto(this.modulo.importo);

    if (importo === null || Number(importo) <= 0) {
      this.errore = 'L’importo deve essere maggiore di zero.';
      return;
    }

    if (!this.modulo.descrizione.trim()) {
      this.errore = 'La descrizione è obbligatoria.';
      return;
    }

    if (!this.modulo.dataMovimento) {
      this.errore = 'Seleziona la data del movimento.';
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

    const modifica = this.movimentoInModifica !== null;

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
        this.messaggio = modifica
          ? 'Movimento aggiornato correttamente.'
          : 'Movimento registrato correttamente.';
        this.caricaDati();
      },
      error: errore => {
        this.salvataggio = false;
        this.errore = this.erroreApi(errore);
      }
    });
  }

  annullaMovimento(movimento: Movimento): void {
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

    this.finanzeApi.annullaMovimento(movimento.id).subscribe({
      next: () => {
        this.salvataggio = false;
        this.messaggio = 'Movimento annullato correttamente.';
        this.caricaDati();
      },
      error: errore => {
        this.salvataggio = false;
        this.errore = this.erroreApi(errore);
      }
    });
  }
}
