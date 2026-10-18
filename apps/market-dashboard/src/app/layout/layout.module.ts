import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { LayoutShellComponent } from './layout-shell.component';

@NgModule({
  declarations: [LayoutShellComponent],
  imports: [CommonModule, RouterModule],
  exports: [LayoutShellComponent],
})
export class LayoutModule {}
