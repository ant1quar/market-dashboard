import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import {
  PRODUCER_DEFAULTS,
  PRODUCER_LIMITS,
  PRODUCER_SETTINGS_LIMITS,
  ProducerSettings,
} from '../../../producer/declarations';
import { ProducerService } from '../../../producer/services/producer.service';
import { SettingsFormComponent } from './settings-form.component';

describe('SettingsFormComponent', () => {
  let fixture: ComponentFixture<SettingsFormComponent>;
  let component: SettingsFormComponent;
  let producerApply: jest.Mock;

  const appliedSettings: ProducerSettings = {
    instrumentCount: 5,
    updatesPerBatch: 100,
    batchIntervalMs: 500,
  };

  beforeEach(async () => {
    producerApply = jest.fn();

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, InputNumberModule, ButtonModule],
      declarations: [SettingsFormComponent],
      providers: [
        { provide: PRODUCER_DEFAULTS, useValue: appliedSettings },
        { provide: PRODUCER_LIMITS, useValue: PRODUCER_SETTINGS_LIMITS },
        {
          provide: ProducerService,
          useValue: {
            settings: signal(appliedSettings),
            apply: producerApply,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('marks boundary violations as invalid', () => {
    const form = component['form'];
    form.controls.instrumentCount.setValue(
      PRODUCER_SETTINGS_LIMITS.instrumentCount.min - 1
    );
    form.controls.updatesPerBatch.setValue(
      PRODUCER_SETTINGS_LIMITS.updatesPerBatch.max + 1
    );
    form.controls.batchIntervalMs.setValue(1.2);

    expect(form.invalid).toBe(true);
    expect(form.controls.instrumentCount.errors?.['min']).toBeTruthy();
    expect(form.controls.updatesPerBatch.errors?.['max']).toBeTruthy();
    expect(form.controls.batchIntervalMs.errors?.['integer']).toBe(true);
  });

  it('does not call apply when the form is invalid', () => {
    const form = component['form'];
    form.controls.instrumentCount.setValue(0);
    form.updateValueAndValidity();

    component['applyHandler']();
    expect(producerApply).not.toHaveBeenCalled();
  });

  it('calls apply with raw values when the form is valid', () => {
    const form = component['form'];
    form.setValue({
      instrumentCount: 10,
      updatesPerBatch: 50,
      batchIntervalMs: 250,
    });

    component['applyHandler']();
    expect(producerApply).toHaveBeenCalledWith({
      instrumentCount: 10,
      updatesPerBatch: 50,
      batchIntervalMs: 250,
    });
  });
});
