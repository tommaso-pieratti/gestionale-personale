
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FinanzeHomeComponent } from './pages/finanze-home/finanze-home.component';
import { SalvadanaiComponent } from './pages/salvadanai/salvadanai.component';

const routes: Routes = [
  {
    path: '',
    component: FinanzeHomeComponent
  },
  {
    path: 'salvadanai',
    component: SalvadanaiComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanzeRoutingModule {}
