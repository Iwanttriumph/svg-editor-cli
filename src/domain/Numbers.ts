import { EditorError } from './EditorError.js';

export class Numbers {
  static finite(value: string | number, name = 'number'): number {
    if (typeof value === 'string' && value.trim() === '') throw new EditorError(`invalid ${name}`);
    const n = Number(value);
    if (!Number.isFinite(n)) throw new EditorError(`invalid ${name}: ${value}`);
    return n;
  }
  static positive(value: string | number, name: string): number {
    const n = this.finite(value, name);
    if (n <= 0) throw new EditorError(`${name} must be positive`);
    return n;
  }
  static format(n: number): string { return String(Object.is(n, -0) ? 0 : n); }
}
