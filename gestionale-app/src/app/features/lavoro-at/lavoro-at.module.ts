import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LavoroAtRoutingModule } from './lavoro-at-routing.module';
import { LavoroAtHomeComponent } from './pages/lavoro-at-home/lavoro-at-home.component';


@NgModule({
  declarations: [
    LavoroAtHomeComponent
  ],
  imports: [
    CommonModule,
    LavoroAtRoutingModule
  ]
})
export class LavoroAtModule { }
