import { Shape } from './Shape.js';
import { EditorError } from './EditorError.js';
import { Numbers } from './Numbers.js';
export class Group extends Shape {
  readonly type = 'g';
  #children: Shape[] = [];
  constructor(id: string) { super(id, {}); }
  override get children(): readonly Shape[] { return [...this.#children]; }
  override get container(): boolean { return true; }
  contains(shape: Shape): boolean { return this === shape || this.#children.some(c => c === shape || (c instanceof Group && c.contains(shape))); }
  insert(shape: Shape, index = this.#children.length): void {
    if (shape === this || (shape instanceof Group && shape.contains(this))) throw new EditorError(`cannot group a container into its own descendant: ${shape.id}`);
    this.#children.splice(index, 0, shape);
  }
  remove(shape: Shape): number {
    const index = this.#children.indexOf(shape);
    if (index < 0) throw new EditorError(`no such shape: ${shape.id}`);
    this.#children.splice(index, 1);
    return index;
  }
  move(dx: number, dy: number): void { Numbers.finite(dx); Numbers.finite(dy); for (const child of this.#children) child.move(dx, dy); }
  override scale(factor: number): void { Numbers.positive(factor, 'scale factor'); for (const child of this.#children) child.scale(factor); }
  clone(): Group {
    const copy = this.copyPresentation(new Group(this.id));
    for (const child of this.#children) copy.insert(child.clone());
    return copy;
  }
}
