import { EditorError } from '../domain/EditorError.js';
import type { Token } from './Token.js';
export class Tokenizer {
  tokenize(source: string): readonly Token[] {
    if (source.trimStart().startsWith('#')) return [];
    const tokens: Token[] = [];
    let position = 0;
    while (position < source.length) {
      if (/\s/u.test(source[position]!)) { position++; continue; }
      const quoted = source[position] === '"';
      let value = '';
      if (quoted) {
        position++;
        let closed = false;
        while (position < source.length) {
          const char = source[position++]!;
          if (char === '"') { closed = true; break; }
          if (char === '\\' && ['"', '\\'].includes(source[position] ?? '')) value += source[position++];
          else value += char;
        }
        if (!closed) throw new EditorError('unterminated double quote');
        if (position < source.length && !/\s/u.test(source[position]!)) throw new EditorError('expected whitespace after double quote');
      } else {
        while (position < source.length && !/\s/u.test(source[position]!)) {
          if (source[position] === '"') throw new EditorError('double quote must start an argument');
          value += source[position++];
        }
      }
      tokens.push({ value, quoted });
    }
    return tokens;
  }
}
