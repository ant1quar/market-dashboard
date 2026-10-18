import { Component, effect, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  Validators,
} from '@angular/forms';
import {
  PRODUCER_LIMITS,
  ProducerLimits,
  ProducerSettings,
} from '../../../producer/declarations';
import { ProducerService } from '../../../producer/services/producer.service';
import { integerValidator } from '../../declarations/validators';

type SettingsFormModel = {
  instrumentCount: FormControl<number>;
  updatesPerBatch: FormControl<number>;
  batchIntervalMs: FormControl<number>;
};

@Component({
  selector: 'app-settings-form',
  standalone: false,
  templateUrl: './settings-form.component.html',
  styleUrl: './settings-form.component.scss',
})
export class SettingsFormComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly producer = inject(ProducerService);
  protected readonly limits = inject(PRODUCER_LIMITS);

  protected readonly form: FormGroup<SettingsFormModel> = this.createForm(
    this.limits
  );

  public constructor() {
    effect(() => {
      const applied = this.producer.settings();
      if (this.form.pristine) {
        this.form.patchValue(applied, { emitEvent: false });
      }
    });
  }

  protected applyHandler(): void {
    if (this.form.invalid) {
      return;
    }
    const nextSettings: ProducerSettings = this.form.getRawValue();
    this.producer.apply(nextSettings);
    this.form.markAsPristine();
  }

  private createForm(limits: ProducerLimits): FormGroup<SettingsFormModel> {
    return this.formBuilder.group({
      instrumentCount: this.formBuilder.control(0, {
        validators: [
          Validators.required,
          Validators.min(limits.instrumentCount.min),
          Validators.max(limits.instrumentCount.max),
          integerValidator(),
        ],
      }),
      updatesPerBatch: this.formBuilder.control(0, {
        validators: [
          Validators.required,
          Validators.min(limits.updatesPerBatch.min),
          Validators.max(limits.updatesPerBatch.max),
          integerValidator(),
        ],
      }),
      batchIntervalMs: this.formBuilder.control(0, {
        validators: [
          Validators.required,
          Validators.min(limits.batchIntervalMs.min),
          Validators.max(limits.batchIntervalMs.max),
          integerValidator(),
        ],
      }),
    });
  }
}
