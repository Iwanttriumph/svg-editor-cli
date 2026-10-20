import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';
export class GroupCommand implements EditCommand {
  constructor(private readonly id: string, private readonly ids: readonly string[]) {}
  execute(document: SvgDocument): string { document.group(this.id, this.ids); return `g#${this.id} created with ${this.ids.length} children`; }
}
