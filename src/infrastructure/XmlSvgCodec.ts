import { DOMImplementation, DOMParser, XMLSerializer, type Element as XmlElement, type Document as XmlDocument } from '@xmldom/xmldom';
import type { ParsedSvg, SvgCodec } from '../application/ports/SvgCodec.js';
import { EditorError } from '../domain/EditorError.js';
import { Group } from '../domain/Group.js';
import { Numbers } from '../domain/Numbers.js';
import type { Shape } from '../domain/Shape.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import { SvgDocument } from '../domain/SvgDocument.js';
import { UniformTransform } from './UniformTransform.js';

export class XmlSvgCodec implements SvgCodec {
  static readonly namespace = 'http://www.w3.org/2000/svg';
  constructor(private readonly factory: ShapeFactory) {}
  private attributes(element: XmlElement): Record<string, string> {
    const result: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let index = 0; index < element.attributes.length; index++) {
      const attribute = element.attributes.item(index)!;
      if (attribute.name === 'xmlns' || attribute.name.startsWith('xmlns:')) continue;
      result[attribute.name] = attribute.value;
    }
    return result;
  }
  private elements(element: XmlElement): XmlElement[] {
    return Array.from(element.childNodes).filter((node): node is XmlElement => node.nodeType === 1);
  }
  decode(source: string): ParsedSvg {
    if (/<!DOCTYPE/iu.test(source)) throw new EditorError('unsupported SVG doctype');
    let xml: XmlDocument;
    try {
      xml = new DOMParser({ onError: (_level, message) => { throw new EditorError(message); } }).parseFromString(source, 'image/svg+xml');
    } catch { throw new EditorError('invalid SVG XML'); }
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg') throw new EditorError('invalid SVG root');
    const rootAttributes = this.attributes(root);
    const presentation: Record<string, string> = {};
    const viewBox = rootAttributes.viewBox?.trim().split(/[\s,]+/u).map(n => Numbers.finite(n, 'viewBox'));
    if (viewBox && (viewBox.length !== 4 || viewBox[0] !== 0 || viewBox[1] !== 0)) throw new EditorError('unsupported SVG viewBox');
    const width = Numbers.positive((rootAttributes.width ?? String(viewBox?.[2] ?? 800)).replace(/px$/u, ''), 'canvas width');
    const height = Numbers.positive((rootAttributes.height ?? String(viewBox?.[3] ?? 600)).replace(/px$/u, ''), 'canvas height');
    if (viewBox && (viewBox[2] !== width || viewBox[3] !== height)) throw new EditorError('SVG viewBox must match canvas dimensions');
    for (const [key, value] of Object.entries(rootAttributes)) {
      if (!['width', 'height', 'viewBox', 'version'].includes(key)) {
        const probe = new Group('root'); probe.importPresentation(key, value); presentation[key] = value;
      }
    }
    for (const node of Array.from(xml.childNodes)) if (node.nodeType === 7 && node.nodeName !== 'xml') throw new EditorError('unsupported SVG processing instruction');
    const used = new Set<string>();
    const reserve = (element: XmlElement): void => {
      if (element.namespaceURI && element.namespaceURI !== XmlSvgCodec.namespace) throw new EditorError(`unsupported SVG namespace: ${element.namespaceURI}`);
      const id = element.getAttribute('id');
      if (id) { if (used.has(id)) throw new EditorError(`id already exists: ${id}`); used.add(id); }
      this.elements(element).forEach(reserve);
    };
    reserve(root);
    const warnings: string[] = [], document = new SvgDocument(width, height);
    const parse = (element: XmlElement, parentTransform: UniformTransform, inherited: Readonly<Record<string, string>>): Shape => {
      const type = element.localName ?? element.nodeName, attrs = this.attributes(element);
      let id = attrs.id;
      if (!id) {
        let index = 1; while (used.has(`${type}${index}`)) index++;
        id = `${type}${index}`; used.add(id);
        warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
      }
      const shape = this.factory.fromSvg(type, id, attrs, element.textContent ?? '');
      const transform = parentTransform.compose(UniformTransform.parse(attrs.transform ?? ''));
      const effective = { ...inherited, ...shape.attributes() };
      if (shape instanceof Group) {
        for (const node of Array.from(element.childNodes)) if ((node.nodeType === 3 || node.nodeType === 4) && node.nodeValue?.trim()) throw new EditorError('unexpected text in SVG container');
        for (const child of this.elements(element)) shape.insert(parse(child, transform, effective));
      } else {
        if (this.elements(element).length) throw new EditorError(`unsupported child element in <${type}>`);
        if (shape.text === undefined && element.textContent?.trim()) throw new EditorError(`unexpected text in <${type}>`);
        shape.scale(transform.scale); shape.move(transform.dx, transform.dy);
        if (transform.scale !== 1) {
          shape.importPresentation('stroke-width', Numbers.format(Numbers.finite(effective['stroke-width'] ?? '1', 'stroke-width') * transform.scale));
          if (shape.text !== undefined) shape.importPresentation('font-size', Numbers.format(Numbers.finite(effective['font-size'] ?? '16', 'font-size') * transform.scale));
        }
      }
      return shape;
    };
    for (const node of Array.from(root.childNodes)) if ((node.nodeType === 3 || node.nodeType === 4) && node.nodeValue?.trim()) throw new EditorError('unexpected text in SVG root');
    for (const element of this.elements(root)) {
      const shape = parse(element, new UniformTransform(), presentation);
      for (const [key, value] of Object.entries(presentation)) if (shape.attributes()[key] === undefined) shape.importPresentation(key, value);
      document.add(shape);
    }
    return { document, warnings };
  }
  encode(document: SvgDocument): string {
    const xml = new DOMImplementation().createDocument(XmlSvgCodec.namespace, 'svg', null), root = xml.documentElement!;
    root.setAttribute('width', Numbers.format(document.width)); root.setAttribute('height', Numbers.format(document.height));
    root.setAttribute('viewBox', `0 0 ${document.width} ${document.height}`);
    const append = (shape: Shape, parent: XmlElement): void => {
      const element = xml.createElementNS(XmlSvgCodec.namespace, shape.type);
      element.setAttribute('id', shape.id);
      for (const [key, value] of Object.entries(shape.attributes())) element.setAttribute(key, value);
      if (shape.text !== undefined) element.appendChild(xml.createTextNode(shape.text));
      parent.appendChild(element);
      for (const child of shape.children) append(child, element);
    };
    for (const shape of document.children) append(shape, root);
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(xml)}\n`;
  }
}
