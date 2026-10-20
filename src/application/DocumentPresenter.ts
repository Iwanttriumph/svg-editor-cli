import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
export class DocumentPresenter {
  tree(document: SvgDocument, id?: string): string {
    const lines: string[] = [];
    const visit = (shape: Shape, prefix: string, branch: string): void => {
      lines.push(`${prefix}${branch}${shape.summary()}`);
      const next = prefix + (branch ? (branch === '└── ' ? '    ' : '│   ') : '');
      shape.children.forEach((child, index, children) => visit(child, next, index === children.length - 1 ? '└── ' : '├── '));
    };
    if (id !== undefined) visit(document.find(id), '', '');
    else {
      lines.push(`svg (${document.width}x${document.height})`);
      document.children.forEach((child, index, children) => visit(child, '', index === children.length - 1 ? '└── ' : '├── '));
    }
    return lines.join('\n');
  }
  show(document: SvgDocument, id: string): string {
    const shape = document.find(id);
    const attrs = Object.entries(shape.attributes()).map(([key, value]) => `  ${key}=${value}`);
    if (shape.text !== undefined) attrs.push(`  text=${JSON.stringify(shape.text)}`);
    return [`${shape.label}  parent=${document.parentLabel(id)}`, ...attrs].join('\n');
  }
}
