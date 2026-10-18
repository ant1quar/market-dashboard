import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MessageModule } from 'primeng/message';
import { LayoutShellComponent } from './layout-shell.component';

@NgModule({
  declarations: [LayoutShellComponent],
  imports: [CommonModule, RouterModule, MessageModule],
  exports: [LayoutShellComponent],
})
export class LayoutModule {}
