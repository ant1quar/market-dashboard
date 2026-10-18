import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'imbalance',
  standalone: false,
})
export class ImbalancePipe implements PipeTransform {
  public transform(value: number | null): string | null {
    if (value === null) {
      return null;
    }
    const sign = value >= 0 ? '+' : '\u2212';
    return `${sign}${Math.abs(value).toFixed(2)}`;
  }
}
