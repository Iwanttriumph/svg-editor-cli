import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';
export class SetCommand implements EditCommand {
  constructor(private readonly id: string, private readonly attribute: string, private readonly value: string) {}
  execute(document: SvgDocument): string {
    const shape = document.find(this.id); shape.setAttribute(this.attribute, this.value);
    return `${shape.label} updated: ${this.attribute}=${JSON.stringify(this.value)}`;
  }
}
