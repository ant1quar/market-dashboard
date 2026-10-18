import { Component, inject } from '@angular/core';
import { ProducerService } from '../../../producer/services/producer.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: false,
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent {
  protected readonly producer = inject(ProducerService);
}
