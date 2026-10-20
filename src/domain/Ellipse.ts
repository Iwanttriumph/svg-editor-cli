import { Shape } from './Shape.js';
export class Ellipse extends Shape {
  readonly type = 'ellipse';
  constructor(id: string, cx: number, cy: number, rx: number, ry: number) { super(id, { cx, cy, rx, ry }, ['rx', 'ry']); }
  move(dx: number, dy: number): void { this.translateCoordinates(['cx'], ['cy'], dx, dy); }
  clone(): Ellipse { return this.copyPresentation(new Ellipse(this.id, this.number('cx'), this.number('cy'), this.number('rx'), this.number('ry'))); }
}
