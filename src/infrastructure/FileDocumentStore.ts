import { randomUUID } from 'node:crypto';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { DocumentStore } from '../application/ports/DocumentStore.js';
import type { ParsedSvg, SvgCodec } from '../application/ports/SvgCodec.js';
import { EditorError } from '../domain/EditorError.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class FileDocumentStore implements DocumentStore {
  constructor(private readonly codec: SvgCodec) {}
  async read(path: string): Promise<ParsedSvg> {
    let source: string;
    try { source = await readFile(path, 'utf8'); } catch { throw new EditorError(`cannot read file: ${path}`); }
    return this.codec.decode(source);
  }
  async write(path: string, document: SvgDocument): Promise<void> {
    const source = this.codec.encode(document);
    const temporary = join(dirname(path), `.svg-editor-${randomUUID()}.tmp`);
    try {
      await writeFile(temporary, source, { encoding: 'utf8', flag: 'wx' });
      await rename(temporary, path);
    } catch { throw new EditorError(`cannot write file: ${path}`); }
    finally { await unlink(temporary).catch(() => undefined); }
  }
}
