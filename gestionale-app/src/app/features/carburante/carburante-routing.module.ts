
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CarburanteHomeComponent } from './pages/carburante-home/carburante-home.component';

const routes: Routes = [
  {
    path: '',
    component: CarburanteHomeComponent,
  },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [
    RouterModule,
  ],
})
export class CarburanteRoutingModule {}
