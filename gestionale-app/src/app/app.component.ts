import { Component } from '@angular/core';
import { NotificheService } from './core/services/notifiche.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Gestionale Personale';

  readonly notifiche$ = this.notificheService.notifiche$;

  constructor(
    private readonly notificheService: NotificheService
  ) {}

  chiudiNotifica(id: number): void {
    this.notificheService.chiudi(id);
  }
}