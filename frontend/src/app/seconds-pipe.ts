import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'seconds',
})
export class SecondsPipe implements PipeTransform {
  /** Transforme des millisecondes en "hh:mm:ss.d" (d = dixièmes de seconde) */
  transform(ms: number | null | undefined): string {
    const dixiemes = Math.max(0, Math.round((ms ?? 0) / 100));
    const d = dixiemes % 10;
    const s = Math.floor(dixiemes / 10) % 60;
    const m = Math.floor(dixiemes / 600) % 60;
    const h = Math.floor(dixiemes / 36000);
    const deux = (n: number) => n.toString().padStart(2, '0');
    return `${deux(h)}:${deux(m)}:${deux(s)}.${d}`;
  }
}