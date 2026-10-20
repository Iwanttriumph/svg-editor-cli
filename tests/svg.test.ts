import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { XmlSvgCodec } from '../src/infrastructure/XmlSvgCodec.js';
import { FileDocumentStore } from '../src/infrastructure/FileDocumentStore.js';
import { DocumentPresenter } from '../src/application/DocumentPresenter.js';

const codec = new XmlSvgCodec(new ShapeFactory());

test('SVG round-trip preserves six shapes, nesting, styles, Unicode and escaped text', () => {
  const source = '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><g id="g" fill="red"><rect id="r" x="1.5" y="2" width="3" height="4"/><circle id="c" cx="2" cy="3" r="4"/><ellipse id="e" cx="2" cy="3" rx="4" ry="5"/><line id="l" x1="1" y1="2" x2="3" y2="4" stroke="black"/><text id="t" x="1" y="2" font-size="16" text-anchor="middle">中文 &amp; &lt;标题&gt; "in"</text></g></svg>';
  const first = codec.decode(source), encoded = codec.encode(first.document), second = codec.decode(encoded);
  const presenter = new DocumentPresenter();
  assert.deepEqual(first.warnings, []);
  assert.equal(presenter.tree(second.document), presenter.tree(first.document));
  assert.match(encoded, /&amp; &lt;标题/);
  assert.equal(second.document.find('t').text, '中文 & <标题> "in"');
  assert.equal(second.document.find('r').attributes().fill, undefined);
});

test('missing ids are deterministic and reserve explicit ids throughout the file first', () => {
  const parsed = codec.decode('<svg><rect/><g><rect id="rect1"/><rect/><text>hello</text></g></svg>');
  assert.deepEqual(parsed.document.all().map(s => s.id), ['rect2', 'g1', 'rect1', 'rect3', 'text1']);
  assert.deepEqual(parsed.warnings, [
    'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id rect3 to unnamed <rect>', 'warning: assigned id text1 to unnamed <text>',
  ]);
});

test('nested translate and uniform scale are normalized in SVG multiplication order', () => {
  const { document } = codec.decode('<svg width="400" height="200"><g id="diagram" transform="translate(60,40)" stroke="black" stroke-width="2"><g id="nodeB" transform="translate(200,0) scale(0.8)"><rect id="r" x="0" y="0" width="120" height="60"/><text id="t" x="60" y="38" font-size="16" text-anchor="middle">End</text></g></g></svg>');
  assert.deepEqual(document.find('r').attributes(), { x: '260', y: '40', width: '96', height: '48', 'stroke-width': '1.6' });
  assert.equal(document.find('t').attributes()['font-size'], '12.8');
  assert.equal(document.find('t').attributes().x, '308');
  assert.equal(document.find('t').attributes().y, '70.4');
  assert.equal(document.find('nodeB').attributes().transform, undefined);
  const roundtrip = codec.decode(codec.encode(document)).document;
  assert.deepEqual(roundtrip.find('r').attributes(), document.find('r').attributes());
});

test('malformed XML, duplicates, unsupported elements, attributes and transforms are rejected', () => {
  const sources = [
    '<svg><rect></svg>', '<svg><rect id="x"/><g id="x"/></svg>',
    '<svg><path id="p" d="M0 0"/></svg>', '<svg><rect id="r" style="fill:red"/></svg>',
    '<svg><g id="g" transform="rotate(30)"/></svg>', '<svg><g id="g" transform="scale(2,3)"/></svg>',
    '<svg width="100" height="100" viewBox="0 0 200 200"/>', '<html/>',
    '<svg><text id="t"><tspan>nested</tspan></text></svg>',
    '<!DOCTYPE svg [<!ENTITY a "x">]><svg/>', '<svg><g id="g">unexpected</g></svg>',
    '<svg xmlns="https://example.org"/>', '<svg><g id="g" opacity="0.5"/></svg>',
  ];
  for (const source of sources) assert.throws(() => codec.decode(source), source);
});

test('file store writes atomically, replaces files, reports IO errors and cleans temporary files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-editor-'));
  try {
    const store = new FileDocumentStore(codec), path = join(directory, '中文 file.svg');
    const document = codec.decode('<svg><circle id="c" r="3"/></svg>').document;
    await store.write(path, document); document.resize(50, 60); await store.write(path, document);
    assert.equal((await store.read(path)).document.width, 50);
    assert.match(await readFile(path, 'utf8'), /width="50"/);
    await assert.rejects(store.read(join(directory, 'missing.svg')), /cannot read file:/);
    await assert.rejects(store.write(directory, document), /cannot write file:/);
    assert.deepEqual(await readdir(directory), ['中文 file.svg']);
    await writeFile(path, '<svg><circle></svg>'); await assert.rejects(store.read(path), /invalid SVG XML/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
