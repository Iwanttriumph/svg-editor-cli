import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { ParsedSvg } from './SvgCodec.js';
export interface DocumentStore {
  read(path: string): Promise<ParsedSvg>;
  write(path: string, document: SvgDocument): Promise<void>;
}
