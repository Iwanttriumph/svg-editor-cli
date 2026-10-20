import { ShapeFactory } from '../../domain/ShapeFactory.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';
export class CreateCommand implements EditCommand {
  constructor(private readonly factory: ShapeFactory, private readonly type: string, private readonly id: string, private readonly params: readonly string[], private readonly parent?: string) {}
  execute(document: SvgDocument): string {
    const shape = this.factory.create(this.type, this.id, this.params);
    document.add(shape, this.parent);
    return `${shape.label} created${this.parent === undefined ? '' : ` in g#${this.parent}`}`;
  }
}
