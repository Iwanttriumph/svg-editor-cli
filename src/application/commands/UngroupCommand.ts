import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { EditCommand } from './EditCommand.js';
export class UngroupCommand implements EditCommand {
  constructor(private readonly id: string) {}
  execute(document: SvgDocument): string { document.ungroup(this.id); return `g#${this.id} ungrouped`; }
}
