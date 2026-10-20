import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { EditorError } from './EditorError.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Numbers } from './Numbers.js';
import { Rect } from './Rect.js';
import { Shape } from './Shape.js';
import { TextShape } from './TextShape.js';

interface ShapeDefinition {
  readonly fields: readonly string[];
  readonly optionalStyle?: 'fill' | 'stroke';
  readonly text?: boolean;
  readonly build: (id: string, numbers: number[], text: string) => Shape;
}

export class ShapeFactory {
  // Phase 1's single shape-name dispatch point; replace registration in the plugin phase.
  readonly #definitions = new Map<string, ShapeDefinition>([
    ['rect', { fields: ['x', 'y', 'width', 'height'], optionalStyle: 'fill', build: (id, n) => new Rect(id, n[0]!, n[1]!, n[2]!, n[3]!) }],
    ['circle', { fields: ['cx', 'cy', 'r'], optionalStyle: 'fill', build: (id, n) => new Circle(id, n[0]!, n[1]!, n[2]!) }],
    ['ellipse', { fields: ['cx', 'cy', 'rx', 'ry'], optionalStyle: 'fill', build: (id, n) => new Ellipse(id, n[0]!, n[1]!, n[2]!, n[3]!) }],
    ['line', { fields: ['x1', 'y1', 'x2', 'y2'], optionalStyle: 'stroke', build: (id, n) => new Line(id, n[0]!, n[1]!, n[2]!, n[3]!) }],
    ['text', { fields: ['x', 'y'], text: true, build: (id, n, text) => new TextShape(id, n[0]!, n[1]!, text) }],
    ['g', { fields: [], build: id => new Group(id) }],
  ]);
  private definition(type: string): ShapeDefinition {
    const definition = this.#definitions.get(type);
    if (!definition) throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }
  create(type: string, id: string, params: readonly string[]): Shape {
    const definition = this.definition(type);
    const required = definition.fields.length + (definition.text ? 1 : 0);
    if (params.length < required || params.length > required + (definition.optionalStyle ? 1 : 0)) throw new EditorError(`invalid parameters for ${type}`);
    const numbers = definition.fields.map((key, i) => Numbers.finite(params[i]!, key));
    const shape = definition.build(id, numbers, definition.text ? params[required - 1]! : '');
    if (definition.optionalStyle && params.length > required) shape.setAttribute(definition.optionalStyle, params[required]!);
    return shape;
  }
  fromSvg(type: string, id: string, attributes: Readonly<Record<string, string>>, text: string): Shape {
    const definition = this.definition(type);
    const numbers = definition.fields.map(key => Numbers.finite(attributes[key] ?? '0', key));
    const shape = definition.build(id, numbers, text);
    for (const [key, value] of Object.entries(attributes)) {
      if (key !== 'id' && !definition.fields.includes(key) && key !== 'transform') shape.importPresentation(key, value);
    }
    return shape;
  }
}
