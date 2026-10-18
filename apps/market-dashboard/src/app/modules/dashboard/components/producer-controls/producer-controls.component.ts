import { Component, computed, inject } from '@angular/core';
import { ProducerStatus } from '../../../producer/declarations';
import { ProducerService } from '../../../producer/services/producer.service';

@Component({
  selector: 'app-producer-controls',
  standalone: false,
  templateUrl: './producer-controls.component.html',
  styleUrl: './producer-controls.component.scss',
})
export class ProducerControlsComponent {
  protected readonly producer = inject(ProducerService);
  protected readonly ProducerStatus = ProducerStatus;

  protected readonly nominalRatePerSecond = computed(() => {
    const settings = this.producer.settings();
    return (settings.updatesPerBatch / settings.batchIntervalMs) * 1000;
  });

  protected readonly statusSeverity = computed(() => {
    switch (this.producer.status()) {
      case ProducerStatus.Running:
        return 'success';
      case ProducerStatus.Paused:
        return 'warn';
      case ProducerStatus.Error:
        return 'danger';
      case ProducerStatus.Initializing:
        return 'info';
      default:
        return 'secondary';
    }
  });

  protected pauseHandler(): void {
    this.producer.pause();
  }

  protected resumeHandler(): void {
    this.producer.resume();
  }
}
