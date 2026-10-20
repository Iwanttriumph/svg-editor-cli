import type { SvgDocument } from '../../domain/SvgDocument.js';
import { Numbers } from '../../domain/Numbers.js';
import type { EditCommand } from './EditCommand.js';
export class MoveCommand implements EditCommand {
  constructor(private readonly id: string, private readonly dx: number, private readonly dy: number) {}
  execute(document: SvgDocument): string {
    const shape = document.find(this.id); shape.move(this.dx, this.dy);
    return `${shape.label} moved by (${Numbers.format(this.dx)},${Numbers.format(this.dy)})`;
  }
}
