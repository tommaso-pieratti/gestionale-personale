
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-finanze-home',
  templateUrl: './finanze-home.component.html',
  styleUrls: ['./finanze-home.component.scss']
})
export class FinanzeHomeComponent {

  constructor(private router: Router) {}

  tornaDashboard(): void {
    this.router.navigate(['/']);
  }

}
