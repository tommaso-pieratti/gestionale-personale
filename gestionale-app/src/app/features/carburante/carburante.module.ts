
import { NgModule } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeIt from '@angular/common/locales/it';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';

import { CarburanteRoutingModule } from './carburante-routing.module';
import { CarburanteHomeComponent } from './pages/carburante-home/carburante-home.component';

registerLocaleData(localeIt, 'it');

@NgModule({
  declarations: [
    CarburanteHomeComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    CarburanteRoutingModule,
    ButtonModule,
    CardModule,
    DialogModule,
    CalendarModule,
    DropdownModule,
    InputNumberModule,
    InputTextModule,
    TableModule,
  ],
})
export class CarburanteModule {}
