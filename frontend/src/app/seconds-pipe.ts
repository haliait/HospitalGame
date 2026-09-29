import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'seconds',
})
export class SecondsPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
