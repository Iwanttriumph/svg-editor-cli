import { EditorError } from '../domain/EditorError.js';
import { Numbers } from '../domain/Numbers.js';

export class UniformTransform {
  constructor(readonly scale = 1, readonly dx = 0, readonly dy = 0) {}
  compose(local: UniformTransform): UniformTransform {
    return new UniformTransform(
      Numbers.positive(this.scale * local.scale, 'transform scale'),
      Numbers.finite(this.dx + this.scale * local.dx),
      Numbers.finite(this.dy + this.scale * local.dy),
    );
  }
  static parse(source: string): UniformTransform {
    let result = new UniformTransform(), position = 0;
    const operations = /(?:translate\s*\(([^()]*)\)|scale\s*\(([^()]*)\))/gy;
    while (position < source.length) {
      const separator = /^[\s,]*/u.exec(source.slice(position))![0]; position += separator.length;
      if (position === source.length) break;
      operations.lastIndex = position;
      const match = operations.exec(source);
      if (!match) throw new EditorError(`unsupported SVG transform: ${source}`);
      const values = (match[1] ?? match[2]!).trim().split(/[\s,]+/u).filter(Boolean).map(v => Numbers.finite(v, 'transform'));
      if (values.length < 1 || values.length > 2) throw new EditorError(`unsupported SVG transform: ${source}`);
      if (match[1] !== undefined) result = result.compose(new UniformTransform(1, values[0]!, values[1] ?? 0));
      else {
        const scale = Numbers.positive(values[0]!, 'transform scale');
        if (values.length === 2 && values[1] !== scale) throw new EditorError('only uniform SVG scale is supported');
        result = result.compose(new UniformTransform(scale));
      }
      position = operations.lastIndex;
    }
    return result;
  }
}
