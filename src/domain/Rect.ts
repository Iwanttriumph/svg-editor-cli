import { Shape } from './Shape.js';
export class Rect extends Shape {
  readonly type = 'rect';
  constructor(id: string, x: number, y: number, width: number, height: number) { super(id, { x, y, width, height }, ['width', 'height']); }
  move(dx: number, dy: number): void { this.translateCoordinates(['x'], ['y'], dx, dy); }
  clone(): Rect { return this.copyPresentation(new Rect(this.id, this.number('x'), this.number('y'), this.number('width'), this.number('height'))); }
}
