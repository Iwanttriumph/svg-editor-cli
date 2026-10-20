import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';
export class DeleteCommand implements EditCommand {
  constructor(private readonly id: string) {}
  execute(document: SvgDocument): string { const label = document.find(this.id).label; document.delete(this.id); return `${label} deleted`; }
}
