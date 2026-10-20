import { EditorError } from './EditorError.js';
import { Numbers } from './Numbers.js';

export abstract class Shape {
  abstract readonly type: string;
  readonly #id: string;
  readonly #geometry = new Map<string, number>();
  readonly #presentation = new Map<string, string>();
  readonly #nonnegative: ReadonlySet<string>;
  protected constructor(id: string, geometry: Record<string, number>, nonnegative: string[] = []) {
    if (!id || /[\s<>"'&]/u.test(id)) throw new EditorError(`invalid id: ${id}`);
    this.#id = id;
    this.#nonnegative = new Set(nonnegative);
    for (const [key, value] of Object.entries(geometry)) this.assignNumber(key, value);
  }
  get id(): string { return this.#id; }
  get label(): string { return `${this.type}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get container(): boolean { return false; }
  protected number(key: string): number { return this.#geometry.get(key)!; }
  private assignNumber(key: string, value: number): void {
    Numbers.finite(value, key);
    if (this.#nonnegative.has(key) && value < 0) throw new EditorError(`${key} must be non-negative`);
    this.#geometry.set(key, value);
  }
  attributes(): Readonly<Record<string, string>> {
    return Object.fromEntries([...Array.from(this.#geometry, ([k, v]) => [k, Numbers.format(v)]), ...this.#presentation]);
  }
  get text(): string | undefined { return undefined; }
  setAttribute(name: string, value: string): void {
    if (this.#geometry.has(name)) { this.assignNumber(name, Numbers.finite(value, name)); return; }
    if (!['fill', 'stroke', 'stroke-width'].includes(name)) throw new EditorError(`unknown attribute: ${name}`);
    if (name === 'stroke-width' && Numbers.finite(value, name) < 0) throw new EditorError('stroke-width must be non-negative');
    this.#presentation.set(name, value);
  }
  importPresentation(name: string, value: string): void {
    if (['fill', 'stroke', 'stroke-width'].includes(name)) this.setAttribute(name, value);
    else if (['font-size', 'font-family', 'font-weight', 'text-anchor', 'fill-opacity', 'stroke-opacity'].includes(name)) {
      if (name === 'font-size' && Numbers.finite(value, name) < 0) throw new EditorError('font-size must be non-negative');
      this.#presentation.set(name, value);
    } else throw new EditorError(`unsupported SVG attribute: ${name}`);
  }
  protected translateCoordinates(xKeys: string[], yKeys: string[], dx: number, dy: number): void {
    Numbers.finite(dx); Numbers.finite(dy);
    for (const key of xKeys) this.assignNumber(key, this.number(key) + dx);
    for (const key of yKeys) this.assignNumber(key, this.number(key) + dy);
  }
  abstract move(dx: number, dy: number): void;
  scale(factor: number): void {
    Numbers.positive(factor, 'scale factor');
    for (const [key, value] of this.#geometry) this.assignNumber(key, value * factor);
  }
  protected copyPresentation<T extends Shape>(target: T): T {
    for (const [key, value] of this.#presentation) target.importPresentation(key, value);
    return target;
  }
  abstract clone(): Shape;
  summary(): string {
    const attrs = Object.entries(this.attributes()).map(([k, v]) => `${k}=${v}`).join(' ');
    return `${this.label}${attrs ? `  ${attrs}` : ''}${this.text === undefined ? '' : ` ${JSON.stringify(this.text)}`}`;
  }
}
