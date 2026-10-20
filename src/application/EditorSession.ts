import { EditorError } from '../domain/EditorError.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { CommandHistory } from './CommandHistory.js';
import type { EditCommand } from './commands/EditCommand.js';
import type { DocumentStore } from './ports/DocumentStore.js';

export class EditorSession {
  #document: SvgDocument | undefined;
  #path: string | undefined;
  readonly #history = new CommandHistory();
  constructor(private readonly store: DocumentStore) {}
  private requireDocument(): SvgDocument {
    if (!this.#document) throw new EditorError("no document. use 'init' or 'read' first");
    return this.#document;
  }
  document(): SvgDocument { return this.requireDocument().clone(); }
  init(width = 800, height = 600): string {
    const document = new SvgDocument(width, height);
    this.#document = document; this.#path = undefined; this.#history.barrier();
    return `canvas ${width}x${height} created`;
  }
  async read(path: string): Promise<readonly string[]> {
    const parsed = await this.store.read(path);
    this.#document = parsed.document; this.#path = path; this.#history.barrier();
    return [...parsed.warnings, `read ${path} (${parsed.document.all().length} elements)`];
  }
  async save(path?: string): Promise<string> {
    const document = this.requireDocument(), target = path ?? this.#path;
    if (!target) throw new EditorError("no file path. use 'save <file.svg>'");
    await this.store.write(target, document.clone());
    this.#path = target; this.#history.barrier();
    return `saved to ${target} (${document.all().length} elements)`;
  }
  canvas(width?: number, height?: number): string {
    const document = this.requireDocument();
    if (width === undefined && height === undefined) return `canvas ${document.width}x${document.height}`;
    if (width === undefined || height === undefined) throw new EditorError('canvas requires width and height');
    const candidate = document.clone(); candidate.resize(width, height);
    this.#document = candidate; this.#history.barrier();
    return `canvas resized to ${width}x${height}`;
  }
  execute(command: EditCommand): string {
    const result = this.#history.execute(command, this.requireDocument());
    this.#document = result.document; return result.summary;
  }
  undo(): string { this.requireDocument(); const result = this.#history.undo(); this.#document = result.document; return result.summary; }
  redo(): string { this.requireDocument(); const result = this.#history.redo(); this.#document = result.document; return result.summary; }
}
