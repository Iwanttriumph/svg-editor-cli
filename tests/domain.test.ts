import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';

test('six polymorphic shapes support movement, scaling, styles and independent clones', () => {
  const factory = new ShapeFactory();
  const shapes = [
    factory.create('rect', 'r', ['1', '2', '3', '4']),
    factory.create('circle', 'c', ['1', '2', '3']),
    factory.create('ellipse', 'e', ['1', '2', '3', '4']),
    factory.create('line', 'l', ['1', '2', '3', '4']),
    factory.create('text', 't', ['1', '2', '中文']),
    factory.create('g', 'g', []),
  ];
  for (const shape of shapes) {
    const original = shape.attributes();
    const copy = shape.clone();
    copy.move(5, -2); copy.scale(2); copy.setAttribute('fill', 'red');
    assert.deepEqual(shape.attributes(), original);
    assert.equal(copy.attributes().fill, 'red');
    assert.throws(() => shape.setAttribute('onload', 'x'), /unknown attribute/);
  }
  assert.equal(shapes[4]!.text, '中文');
  assert.throws(() => factory.create('box', 'b', []), /unknown shape type/);
});

test('composite operations, grouping order, cycle rejection and top-level ungroup rule', () => {
  const factory = new ShapeFactory(), doc = new SvgDocument();
  doc.add(factory.create('g', 'scene', []));
  doc.add(factory.create('rect', 'a', ['1', '2', '3', '4']), 'scene');
  doc.add(factory.create('circle', 'b', ['5', '6', '7']), 'scene');
  doc.group('pair', ['b', 'a']);
  assert.deepEqual(doc.find('pair').children.map(s => s.id), ['a', 'b']);
  doc.find('pair').move(10, 20); doc.find('pair').scale(2);
  assert.equal(doc.find('a').attributes().x, '22');
  assert.equal(doc.find('b').attributes().cy, '52');
  assert.throws(() => doc.addTo('pair', 'scene'), /own descendant/);
  assert.throws(() => doc.group('bad', ['pair', 'a']), /own descendant/);
  doc.ungroup('pair');
  assert.deepEqual(doc.find('scene').children.map(s => s.id), ['a', 'b']);
  assert.throws(() => doc.ungroup('scene'), /top-level/);
});

test('document enforces unique case-sensitive ids and clones the entire tree', () => {
  const factory = new ShapeFactory(), doc = new SvgDocument();
  doc.add(factory.create('g', 'g', []));
  doc.add(factory.create('circle', 'A', ['0', '0', '1']), 'g');
  doc.add(factory.create('circle', 'a', ['0', '0', '1']), 'g');
  assert.throws(() => doc.add(factory.create('g', 'A', [])), /id already exists/);
  const copy = doc.clone(); copy.delete('g');
  assert.equal(copy.all().length, 0); assert.equal(doc.all().length, 3);
  assert.throws(() => new SvgDocument(0, 600), /positive/);
  assert.throws(() => factory.create('circle', 'bad', ['NaN', '0', '1']), /invalid/);
  assert.throws(() => factory.create('circle', 'bad', ['0', '0', '-1']), /non-negative/);
});
