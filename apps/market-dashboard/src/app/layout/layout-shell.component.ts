import { Component, inject } from '@angular/core';
import { ProducerService } from '../modules/producer/services/producer.service';

@Component({
  selector: 'app-layout-shell',
  standalone: false,
  templateUrl: './layout-shell.component.html',
  styleUrl: './layout-shell.component.scss',
})
export class LayoutShellComponent {
  protected readonly producer = inject(ProducerService);
}
