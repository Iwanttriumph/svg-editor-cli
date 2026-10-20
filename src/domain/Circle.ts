import { Shape } from './Shape.js';
export class Circle extends Shape {
  readonly type = 'circle';
  constructor(id: string, cx: number, cy: number, r: number) { super(id, { cx, cy, r }, ['r']); }
  move(dx: number, dy: number): void { this.translateCoordinates(['cx'], ['cy'], dx, dy); }
  clone(): Circle { return this.copyPresentation(new Circle(this.id, this.number('cx'), this.number('cy'), this.number('r'))); }
}
