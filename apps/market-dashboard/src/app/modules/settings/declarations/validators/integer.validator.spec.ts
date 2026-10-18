import { FormControl } from '@angular/forms';
import { integerValidator } from './integer.validator';

describe('integerValidator', () => {
  const validator = integerValidator();

  it('accepts integer numbers', () => {
    const control = new FormControl(42);
    expect(validator(control)).toBeNull();
  });

  it('rejects fractional numbers', () => {
    const control = new FormControl(1.5);
    expect(validator(control)).toEqual({ integer: true });
  });

  it('allows empty values for required to handle', () => {
    expect(validator(new FormControl(null))).toBeNull();
    expect(validator(new FormControl(undefined))).toBeNull();
    expect(validator(new FormControl(''))).toBeNull();
  });
});
