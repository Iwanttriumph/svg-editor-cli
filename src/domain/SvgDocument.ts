import { EditorError } from './EditorError.js';
import { Group } from './Group.js';
import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';
export class SvgDocument {
  #width: number;
  #height: number;
  #root = new Group('__document_root__');
  constructor(width = 800, height = 600) {
    this.#width = Numbers.positive(width, 'canvas width');
    this.#height = Numbers.positive(height, 'canvas height');
  }
  get width(): number { return this.#width; }
  get height(): number { return this.#height; }
  get children(): readonly Shape[] { return this.#root.children; }
  resize(width: number, height: number): void {
    Numbers.positive(width, 'canvas width'); Numbers.positive(height, 'canvas height');
    this.#width = width; this.#height = height;
  }
  all(): readonly Shape[] {
    const result: Shape[] = [];
    const visit = (shape: Shape): void => { result.push(shape); shape.children.forEach(visit); };
    this.children.forEach(visit);
    return result;
  }
  find(id: string): Shape { const shape = this.all().find(s => s.id === id); if (!shape) throw new EditorError(`no such shape: ${id}`); return shape; }
  has(id: string): boolean { return this.all().some(s => s.id === id); }
  private available(id: string): void { if (this.has(id)) throw new EditorError(`id already exists: ${id}`); }
  private parent(shape: Shape, node: Group = this.#root): Group {
    if (node.children.includes(shape)) return node;
    for (const child of node.children) if (child instanceof Group && child.contains(shape)) return this.parent(shape, child);
    throw new EditorError(`no such shape: ${shape.id}`);
  }
  private container(id: string): Group {
    if (!this.has(id)) throw new EditorError(`no such container: ${id}`);
    const shape = this.find(id);
    if (!(shape instanceof Group)) throw new EditorError(`not a container: ${id}`);
    return shape;
  }
  add(shape: Shape, parentId?: string): void {
    const ids = new Set(this.all().map(s => s.id));
    const validate = (node: Shape): void => {
      if (ids.has(node.id)) throw new EditorError(`id already exists: ${node.id}`);
      ids.add(node.id); node.children.forEach(validate);
    };
    validate(shape);
    (parentId === undefined ? this.#root : this.container(parentId)).insert(shape);
  }
  delete(id: string): void { const shape = this.find(id); this.parent(shape).remove(shape); }
  group(id: string, ids: readonly string[]): void {
    this.available(id);
    if (!ids.length || new Set(ids).size !== ids.length) throw new EditorError('group requires distinct shape ids');
    const selected = ids.map(i => this.find(i));
    for (const shape of selected) if (shape instanceof Group && selected.some(other => other !== shape && shape.contains(other))) {
      throw new EditorError(`cannot group a container into its own descendant: ${shape.id}`);
    }
    const ordered = this.all().filter(s => selected.includes(s));
    const first = ordered[0]!;
    const parent = this.parent(first);
    const index = parent.children.indexOf(first);
    const group = new Group(id);
    for (const shape of ordered) { this.parent(shape).remove(shape); group.insert(shape); }
    parent.insert(group, index);
  }
  ungroup(id: string): void {
    const group = this.container(id);
    const parent = this.parent(group);
    if (parent === this.#root) throw new EditorError(`cannot ungroup top-level container: ${id}`);
    let index = parent.remove(group);
    // Keep inherited presentation when removing the group.
    for (const child of group.children) {
      for (const [key, value] of Object.entries(group.attributes())) if (child.attributes()[key] === undefined) child.importPresentation(key, value);
      group.remove(child); parent.insert(child, index++);
    }
  }
  addTo(gid: string, id: string): void {
    const target = this.container(gid), shape = this.find(id);
    if (shape === target || (shape instanceof Group && shape.contains(target))) throw new EditorError(`cannot group a container into its own descendant: ${id}`);
    this.parent(shape).remove(shape); target.insert(shape);
  }
  reorder(id: string, front: boolean): void {
    const shape = this.find(id), parent = this.parent(shape);
    parent.remove(shape); parent.insert(shape, front ? parent.children.length : 0);
  }
  parentLabel(id: string): string { const parent = this.parent(this.find(id)); return parent === this.#root ? 'svg' : parent.label; }
  clone(): SvgDocument {
    const copy = new SvgDocument(this.width, this.height); copy.#root = this.#root.clone(); return copy;
  }
}
