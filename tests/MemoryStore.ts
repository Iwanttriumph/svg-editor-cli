import type { DocumentStore } from '../src/application/ports/DocumentStore.js';
import type { ParsedSvg } from '../src/application/ports/SvgCodec.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
export class MemoryStore implements DocumentStore {
  #saved = new SvgDocument(400, 300);
  failRead = false;
  failWrite = false;
  async read(_path: string): Promise<ParsedSvg> {
    if (this.failRead) throw new Error('cannot read file: missing.svg');
    return { document: this.#saved.clone(), warnings: [] };
  }
  async write(_path: string, document: SvgDocument): Promise<void> {
    if (this.failWrite) throw new Error('cannot write file: locked.svg');
    this.#saved = document.clone();
  }
}
