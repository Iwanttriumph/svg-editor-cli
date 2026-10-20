import { Shape } from './Shape.js';
export class Line extends Shape {
  readonly type = 'line';
  constructor(id: string, x1: number, y1: number, x2: number, y2: number) { super(id, { x1, y1, x2, y2 }); }
  move(dx: number, dy: number): void { this.translateCoordinates(['x1', 'x2'], ['y1', 'y2'], dx, dy); }
  clone(): Line { return this.copyPresentation(new Line(this.id, this.number('x1'), this.number('y1'), this.number('x2'), this.number('y2'))); }
}
