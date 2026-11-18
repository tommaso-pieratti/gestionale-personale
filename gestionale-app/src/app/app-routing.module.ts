
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './pages/dashboard/dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    pathMatch: 'full',
  },
  {
    path: 'finanze',
    loadChildren: () =>
      import('./features/finanze/finanze.module')
        .then(m => m.FinanzeModule),
  },
  {
    path: 'carburante',
    loadChildren: () =>
      import('./features/carburante/carburante.module')
        .then(m => m.CarburanteModule),
  },
  {
    path: 'lavoro-at',
    loadChildren: () =>
      import('./features/lavoro-at/lavoro-at.module')
        .then(m => m.LavoroAtModule),
  },
  {
    path: 'archivio-documenti',
    loadChildren: () => import('./features/archivio-documenti/archivio-documenti.module').then(m => m.ArchivioDocumentiModule),
  },
  {
    path: '**',
    redirectTo: '',
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes),
  ],
  exports: [
    RouterModule,
  ],
})
export class AppRoutingModule {}
