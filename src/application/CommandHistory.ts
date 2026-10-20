import { EditorError } from '../domain/EditorError.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { EditCommand } from './commands/EditCommand.js';
import { DocumentSnapshot } from './DocumentSnapshot.js';

interface HistoryEntry { readonly before: DocumentSnapshot; readonly after: DocumentSnapshot; readonly summary: string; readonly command: EditCommand; }
export class CommandHistory {
  #undo: HistoryEntry[] = [];
  #redo: HistoryEntry[] = [];
  #blocked = true;
  barrier(): void { this.#undo = []; this.#redo = []; this.#blocked = true; }
  execute(command: EditCommand, document: SvgDocument): { document: SvgDocument; summary: string } {
    const candidate = document.clone();
    const summary = command.execute(candidate);
    const entry = { command, summary, before: new DocumentSnapshot(document), after: new DocumentSnapshot(candidate) };
    this.#undo.push(entry); this.#redo = []; this.#blocked = false;
    return { document: candidate, summary };
  }
  private requireHistory(): void { if (this.#blocked) throw new EditorError('undo not allowed after io command'); }
  undo(): { document: SvgDocument; summary: string } {
    this.requireHistory();
    const entry = this.#undo.at(-1);
    if (!entry) throw new EditorError('nothing to undo');
    const document = entry.before.restore(); this.#undo.pop(); this.#redo.push(entry);
    return { document, summary: `undone: ${entry.summary}` };
  }
  redo(): { document: SvgDocument; summary: string } {
    this.requireHistory();
    const entry = this.#redo.at(-1);
    if (!entry) throw new EditorError('nothing to redo');
    const document = entry.after.restore(); this.#redo.pop(); this.#undo.push(entry);
    return { document, summary: `redone: ${entry.summary}` };
  }
}
