import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';
export class FrontCommand implements EditCommand {
  constructor(private readonly id: string) {}
  execute(document: SvgDocument): string { document.reorder(this.id, true); return `${document.find(this.id).label} moved to front`; }
}
