import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';
export class AddToCommand implements EditCommand {
  constructor(private readonly gid: string, private readonly id: string) {}
  execute(document: SvgDocument): string { const label = document.find(this.id).label; document.addTo(this.gid, this.id); return `${label} added to g#${this.gid}`; }
}
