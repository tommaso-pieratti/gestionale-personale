import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Notifica {
  id: number;
  tipo: 'successo' | 'errore';
  titolo: string;
  testo: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificheService implements OnDestroy {
  private prossimoId = 0;

  private readonly notificheSubject =
    new BehaviorSubject<Notifica[]>([]);

  readonly notifiche$ = this.notificheSubject.asObservable();

  private readonly timer = new Map<
    number,
    ReturnType<typeof setTimeout>
  >();

  successo(testo: string): void {
    this.aggiungi('successo', testo);
  }

  errore(testo: string): void {
    this.aggiungi('errore', testo);
  }

  private aggiungi(
    tipo: 'successo' | 'errore',
    testo: string
  ): void {
    const id = ++this.prossimoId;

    const notifica: Notifica = {
      id,
      tipo,
      titolo:
        tipo === 'successo'
          ? 'Operazione riuscita'
          : 'Errore',
      testo
    };

    this.notificheSubject.next([
      ...this.notificheSubject.value,
      notifica
    ]);

    const timeout = setTimeout(() => {
      this.chiudi(id);
    }, 5000);

    this.timer.set(id, timeout);
  }

  chiudi(id: number): void {
    this.notificheSubject.next(
      this.notificheSubject.value.filter(
        notifica => notifica.id !== id
      )
    );

    const timeout = this.timer.get(id);

    if (timeout) {
      clearTimeout(timeout);
    }

    this.timer.delete(id);
  }

  ngOnDestroy(): void {
    this.timer.forEach(timeout => clearTimeout(timeout));
    this.timer.clear();
    this.notificheSubject.complete();
  }
}