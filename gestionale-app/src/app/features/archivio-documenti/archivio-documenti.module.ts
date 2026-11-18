import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { ArchivioDocumentiComponent } from './archivio-documenti.component';

const routes: Routes = [{ path: '', component: ArchivioDocumentiComponent }];

@NgModule({
  declarations: [ArchivioDocumentiComponent],
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule.forChild(routes)]
})
export class ArchivioDocumentiModule {}
