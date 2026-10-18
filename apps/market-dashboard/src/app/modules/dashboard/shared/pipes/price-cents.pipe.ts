import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'priceCents',
  standalone: false,
})
export class PriceCentsPipe implements PipeTransform {
  private readonly formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  public transform(cents: number | null): string | null {
    if (cents === null) {
      return null;
    }
    return this.formatter.format(cents / 100);
  }
}
