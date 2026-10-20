import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';
export class ScaleCommand implements EditCommand {
  constructor(private readonly id: string, private readonly factor: number) {}
  execute(document: SvgDocument): string { const shape = document.find(this.id); shape.scale(this.factor); return `${shape.label} scaled by ${this.factor}`; }
}
