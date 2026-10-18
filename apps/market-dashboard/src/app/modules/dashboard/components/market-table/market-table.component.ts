import { Component, inject } from '@angular/core';
import { ProducerService } from '../../../producer/services/producer.service';

@Component({
  selector: 'app-market-table',
  standalone: false,
  templateUrl: './market-table.component.html',
  styleUrl: './market-table.component.scss',
})
export class MarketTableComponent {
  protected readonly producer = inject(ProducerService);
}
