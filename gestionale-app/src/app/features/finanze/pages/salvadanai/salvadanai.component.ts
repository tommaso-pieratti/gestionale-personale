
import { Component, OnInit } from '@angular/core';

import {
  SalvadanaiApiService,
  Salvadanaio,
  OperazioneSalvadanaio,
  RiepilogoSalvadanai,
  CreaSalvadanaio
} from '../../services/salvadanai-api.service';

type TipoDialogOperazione = 'ACCANTONAMENTO' | 'PRELIEVO';

@Component({
  selector: 'app-salvadanai',
  templateUrl: './salvadanai.component.html',
  styleUrls: ['./salvadanai.component.scss']
})
export class SalvadanaiComponent implements OnInit {

  salvadanai: Salvadanaio[] = [];
  riepilogo: RiepilogoSalvadanai | null = null;
  operazioni: OperazioneSalvadanaio[] = [];

  caricamento = false;
  salvataggio = false;
  caricamentoStorico = false;

  errore = '';
  messaggio = '';

  mostraDialogCreazione = false;
  mostraDialogOperazione = false;
  mostraDialogStorico = false;

  salvadanaioSelezionato: Salvadanaio | null = null;
  tipoOperazione: TipoDialogOperazione = 'ACCANTONAMENTO';

  nuovo = {
    nome: '',
    descrizione: '',
    obiettivo: '',
    dataObiettivo: ''
  };

  moduloOperazione = {
    importo: '',
    nota: ''
  };

  constructor(
    private salvadanaiApi: SalvadanaiApiService
  ) {}

  ngOnInit(): void {
    this.caricaDati();
  }

  caricaDati(): void {
    this.caricamento = true;
    this.errore = '';

    this.salvadanaiApi.getRiepilogo().subscribe({
      next: (riepilogo) => {
        this.riepilogo = riepilogo;
        this.caricaElenco();
      },
      error: (errore) => {
        this.caricamento = false;
        this.mostraErrore(errore);
      }
    });
  }

  private caricaElenco(): void {
    this.salvadanaiApi.getSalvadanai().subscribe({
      next: (salvadanai) => {
        this.salvadanai = salvadanai;
        this.caricamento = false;
      },
      error: (errore) => {
        this.caricamento = false;
        this.mostraErrore(errore);
      }
    });
  }

  apriCreazione(): void {
    this.nuovo = {
      nome: '',
      descrizione: '',
      obiettivo: '',
      dataObiettivo: ''
    };

    this.errore = '';
    this.mostraDialogCreazione = true;
  }

  creaSalvadanaio(): void {
    const nome = this.nuovo.nome.trim();
    const obiettivo = this.normalizzaImporto(
      this.nuovo.obiettivo
    );

    if (!nome || !obiettivo) {
      this.errore = 'Inserisci un nome e un obiettivo valido.';
      return;
    }

    if (this.inCentesimi(obiettivo) <= 0) {
      this.errore = 'L’obiettivo deve essere maggiore di zero.';
      return;
    }

    const dati: CreaSalvadanaio = {
      nome,
      obiettivo
    };

    const descrizione = this.nuovo.descrizione.trim();

    if (descrizione) {
      dati.descrizione = descrizione;
    }

    if (this.nuovo.dataObiettivo) {
      dati.dataObiettivo = this.nuovo.dataObiettivo;
    }

    this.salvataggio = true;
    this.errore = '';

    this.salvadanaiApi.creaSalvadanaio(dati).subscribe({
      next: () => {
        this.salvataggio = false;
        this.mostraDialogCreazione = false;
        this.messaggio = 'Salvadanaio creato correttamente.';
        this.caricaDati();
      },
      error: (errore) => {
        this.salvataggio = false;
        this.mostraErrore(errore);
      }
    });
  }

  apriOperazione(
    salvadanaio: Salvadanaio,
    tipo: TipoDialogOperazione
  ): void {
    this.salvadanaioSelezionato = salvadanaio;
    this.tipoOperazione = tipo;

    this.moduloOperazione = {
      importo: '',
      nota: ''
    };

    this.errore = '';
    this.mostraDialogOperazione = true;
  }

  salvaOperazione(): void {
    if (!this.salvadanaioSelezionato) {
      return;
    }

    const importo = this.normalizzaImporto(
      this.moduloOperazione.importo
    );

    if (!importo || this.inCentesimi(importo) <= 0) {
      this.errore = 'Inserisci un importo maggiore di zero.';
      return;
    }

    const centesimi = this.inCentesimi(importo);

    if (this.tipoOperazione === 'ACCANTONAMENTO') {
      const disponibile = this.inCentesimi(
        this.riepilogo?.disponibilitaLibera || '0'
      );

      if (centesimi > disponibile) {
        this.errore =
          'L’importo supera la disponibilità libera.';
        return;
      }
    } else {
      const saldo = this.inCentesimi(
        this.salvadanaioSelezionato.saldo
      );

      if (centesimi > saldo) {
        this.errore =
          'Non puoi prelevare più del saldo accantonato.';
        return;
      }
    }

    const id = this.salvadanaioSelezionato.id;
    const nota = this.moduloOperazione.nota.trim();

    const richiesta =
      this.tipoOperazione === 'ACCANTONAMENTO'
        ? this.salvadanaiApi.accantona(id, importo, nota)
        : this.salvadanaiApi.preleva(id, importo, nota);

    this.salvataggio = true;
    this.errore = '';

    richiesta.subscribe({
      next: () => {
        this.salvataggio = false;
        this.mostraDialogOperazione = false;

        this.messaggio =
          this.tipoOperazione === 'ACCANTONAMENTO'
            ? 'Importo accantonato correttamente.'
            : 'Prelievo effettuato correttamente.';

        this.caricaDati();
      },
      error: (errore) => {
        this.salvataggio = false;
        this.mostraErrore(errore);
      }
    });
  }

  apriStorico(salvadanaio: Salvadanaio): void {
    this.salvadanaioSelezionato = salvadanaio;
    this.operazioni = [];
    this.caricamentoStorico = true;
    this.errore = '';
    this.mostraDialogStorico = true;

    this.salvadanaiApi.getOperazioni(salvadanaio.id).subscribe({
      next: (operazioni) => {
        this.operazioni = operazioni;
        this.caricamentoStorico = false;
      },
      error: (errore) => {
        this.caricamentoStorico = false;
        this.mostraErrore(errore);
      }
    });
  }

  chiudiDialogCreazione(): void {
    if (!this.salvataggio) {
      this.mostraDialogCreazione = false;
    }
  }

  chiudiDialogOperazione(): void {
    if (!this.salvataggio) {
      this.mostraDialogOperazione = false;
    }
  }

  chiudiDialogStorico(): void {
    this.mostraDialogStorico = false;
  }

  percentuale(salvadanaio: Salvadanaio): number {
    const saldo = Number(salvadanaio.saldo);
    const obiettivo = Number(salvadanaio.obiettivo);

    if (!Number.isFinite(saldo) ||
        !Number.isFinite(obiettivo) ||
        obiettivo <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, Math.round((saldo / obiettivo) * 100))
    );
  }

  formattaEuro(importo: string | number): string {
    const valore = Number(importo);

    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(Number.isFinite(valore) ? valore : 0);
  }

  formattaData(data: string | null): string {
    if (!data) {
      return 'Nessuna scadenza';
    }

    const parti = data.substring(0, 10).split('-');

    if (parti.length !== 3) {
      return data;
    }

    return `${parti[2]}/${parti[1]}/${parti[0]}`;
  }

  formattaDataOra(data: string): string {
    const valore = new Date(data);

    if (Number.isNaN(valore.getTime())) {
      return data;
    }

    return valore.toLocaleString('it-IT');
  }

  private normalizzaImporto(valore: string): string | null {
    const pulito = valore.trim().replace(',', '.');

    if (!/^\d{1,13}(\.\d{1,2})?$/.test(pulito)) {
      return null;
    }

    const centesimi = this.inCentesimi(pulito);

    return (
      Math.floor(centesimi / 100) +
      '.' +
      String(centesimi % 100).padStart(2, '0')
    );
  }

  private inCentesimi(importo: string): number {
    const parti = importo.replace(',', '.').split('.');

    const euro = Number(parti[0] || '0');
    const centesimi = Number(
      (parti[1] || '').padEnd(2, '0').slice(0, 2)
    );

    return euro * 100 + centesimi;
  }

  private mostraErrore(errore: any): void {
    const messaggio = errore?.error?.message;

    this.errore = Array.isArray(messaggio)
      ? messaggio.join(' ')
      : typeof messaggio === 'string'
        ? messaggio
        : 'Operazione non riuscita. Controlla il backend.';
  }
}
