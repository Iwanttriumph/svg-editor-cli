import { Shape } from './Shape.js';
export class TextShape extends Shape {
  readonly type = 'text';
  #content: string;
  constructor(id: string, x: number, y: number, content: string) { super(id, { x, y }); this.#content = content; }
  override get text(): string { return this.#content; }
  override setAttribute(name: string, value: string): void {
    if (name === 'text') this.#content = value;
    else super.setAttribute(name, value);
  }
  move(dx: number, dy: number): void { this.translateCoordinates(['x'], ['y'], dx, dy); }
  clone(): TextShape { return this.copyPresentation(new TextShape(this.id, this.number('x'), this.number('y'), this.#content)); }
}
