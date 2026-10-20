import { SvgDocument } from '../domain/SvgDocument.js';
export class DocumentSnapshot {
  readonly #document: SvgDocument;
  constructor(document: SvgDocument) { this.#document = document.clone(); }
  restore(): SvgDocument { return this.#document.clone(); }
}
