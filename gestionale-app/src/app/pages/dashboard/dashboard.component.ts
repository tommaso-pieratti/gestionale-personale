
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent {

  constructor(private router: Router) {}

  apriFinanze(): void {
    this.router.navigate(['/finanze']);
  }

  apriCarburante(): void {
    this.router.navigate(['/carburante']);
  }

  apriLavoroAt(): void {
    this.router.navigate(['/lavoro-at']);
  }

  apriArchivioDocumenti(): void {
    this.router.navigate(['/archivio-documenti']);
  }
}
