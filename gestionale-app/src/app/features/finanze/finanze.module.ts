
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

import { FinanzeRoutingModule } from './finanze-routing.module';

import {
  FinanzeHomeComponent
} from './pages/finanze-home/finanze-home.component';

@NgModule({
  declarations: [
    FinanzeHomeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    FinanzeRoutingModule,
    CardModule,
    ButtonModule
  ]
})
export class FinanzeModule {}
