
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { FinanzeHomeComponent } from './pages/finanze-home/finanze-home.component';

const routes: Routes = [
  {
    path: '',
    component: FinanzeHomeComponent
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes)
  ],
  exports: [RouterModule]
})
export class FinanzeRoutingModule {}
