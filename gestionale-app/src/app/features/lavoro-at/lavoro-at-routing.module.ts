import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LavoroAtHomeComponent } from './pages/lavoro-at-home/lavoro-at-home.component';

const routes: Routes = [
  { path: '', component: LavoroAtHomeComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LavoroAtRoutingModule {}
