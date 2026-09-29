import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'bigvalue',
})
export class BigvaluePipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
