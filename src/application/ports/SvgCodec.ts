import type { SvgDocument } from '../../domain/SvgDocument.js';
export interface ParsedSvg { readonly document: SvgDocument; readonly warnings: readonly string[]; }
export interface SvgCodec { decode(source: string): ParsedSvg; encode(document: SvgDocument): string; }
