import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-lavoro-at-home',
  templateUrl: './lavoro-at-home.component.html',
  styleUrls: ['./lavoro-at-home.component.scss'],
})
export class LavoroAtHomeComponent {
  constructor(private readonly router: Router) {}

  tornaAllaDashboard(): void {
    this.router.navigate(['/']);
  }
}
