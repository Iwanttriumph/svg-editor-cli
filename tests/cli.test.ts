import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CommandDispatcher } from '../src/cli/CommandDispatcher.js';
import { Tokenizer } from '../src/cli/Tokenizer.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { MemoryStore } from './MemoryStore.js';

test('tokenizer preserves hex colors, quoted in, escaped quotes, empty strings and Windows paths', () => {
  const tokenizer = new Tokenizer();
  assert.deepEqual(tokenizer.tokenize(' # comment'), []);
  assert.deepEqual(tokenizer.tokenize('create text t 1 2 "in"').at(-1), { value: 'in', quoted: true });
  assert.equal(tokenizer.tokenize('set t text ""').at(-1)?.value, '');
  assert.equal(tokenizer.tokenize('set t text "say \\"hi\\""').at(-1)?.value, 'say "hi"');
  assert.equal(tokenizer.tokenize('read "C:\\文档\\file.svg"').at(-1)?.value, 'C:\\文档\\file.svg');
  assert.equal(tokenizer.tokenize('set r fill #abcdef').at(-1)?.value, '#abcdef');
  assert.throws(() => tokenizer.tokenize('set t text "broken'), /unterminated/);
  assert.throws(() => tokenizer.tokenize('set t text "a"b'), /whitespace/);
});

test('dispatcher implements command syntax, no-document errors, optional in and attribute rules', async () => {
  const factory = new ShapeFactory(), session = new EditorSession(new MemoryStore()), cli = new CommandDispatcher(session, factory);
  assert.match((await cli.run('create g g'))[0]!, /^error: no document/);
  assert.match((await cli.run('help'))[0]!, /front <id>/);
  assert.deepEqual(await cli.run('init'), ['canvas 800x600 created']);
  assert.deepEqual(await cli.run('create g scene'), ['g#scene created']);
  assert.deepEqual(await cli.run('create text t 1.5 2 "in" in scene'), ['text#t created in g#scene']);
  await cli.run('set t text "中文 with spaces"');
  assert.equal(session.document().find('t').text, '中文 with spaces');
  await cli.run('create rect r 1 2 3 4 #eeeeee');
  assert.equal(session.document().find('r').attributes().fill, '#eeeeee');
  const errors = new Map([
    ['create rect r 1 2 3 4', 'error: id already exists: r'],
    ['delete missing', 'error: no such shape: missing'],
    ['create g x in missing', 'error: no such container: missing'],
    ['create g x in r', 'error: not a container: r'],
    ['create box b', 'error: unknown shape type: box (is the plugin loaded?)'],
    ['set r onload bad', 'error: unknown attribute: onload'],
    ['scale scene 0', 'error: scale factor must be positive'],
    ['ungroup scene', 'error: cannot ungroup top-level container: scene'],
  ]);
  const before = JSON.stringify(session.document().all().map(s => s.summary()));
  for (const [command, expected] of errors) assert.deepEqual(await cli.run(command), [expected]);
  assert.equal(JSON.stringify(session.document().all().map(s => s.summary())), before);
  await cli.run('canvas'); await cli.run('tree scene'); await cli.run('show t');
  assert.match((await cli.run('undo'))[0]!, /^undone:/);
  assert.equal(session.document().has('r'), false);
  assert.match((await cli.run('redo'))[0]!, /^redone:/);
  assert.deepEqual(await cli.run('  # ignored'), []);
  assert.match((await cli.run('move r NaN 1'))[0]!, /^error: invalid/);
  assert.match((await cli.run('canvas 1'))[0]!, /^error: usage/);
});

test('compiled REPL replays the two-node flowchart with real SVG IO', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'svg-replay-'));
  try {
    const script = [
      '# replay', 'init 800 600', 'create g flowchart', 'create g node1 in flowchart',
      'create rect start 120 100 160 60 #4a90d9 in node1', 'create text start-label 155 135 "开始" in node1',
      'create g node2 in flowchart', 'create rect process 520 100 160 60 #f5a623 in node2',
      'create text process-label 545 135 "处理数据" in node2', 'create line arrow1 280 130 520 130 black in flowchart',
      'move node2 0 100', 'undo', 'redo', 'undo', 'set process-label text "处理数据 v2"',
      'tree', 'show process-label', 'save flowchart.svg', 'undo', 'read flowchart.svg', 'save', 'tree flowchart',
    ].join('\n') + '\n';
    const result = spawnSync(process.execPath, [resolve('dist/src/main.js')], { cwd: directory, input: script, encoding: 'utf8', timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /g#node2 moved by \(0,100\)/);
    assert.match(result.stdout, /error: undo not allowed after io command/);
    assert.match(result.stdout, /read flowchart.svg \(8 elements\)/);
    assert.match(result.stdout, /parent=g#node2/);
    assert.equal((result.stdout.match(/^error:/gm) ?? []).length, 1);
    const saved = await readFile(join(directory, 'flowchart.svg'), 'utf8');
    assert.match(saved, /处理数据 v2/); assert.match(saved, /id="process" x="520" y="100"/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
