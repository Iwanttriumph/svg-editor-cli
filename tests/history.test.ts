import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EditorSession } from '../src/application/EditorSession.js';
import { DocumentPresenter } from '../src/application/DocumentPresenter.js';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { CreateCommand } from '../src/application/commands/CreateCommand.js';
import { MoveCommand } from '../src/application/commands/MoveCommand.js';
import { SetCommand } from '../src/application/commands/SetCommand.js';
import { ScaleCommand } from '../src/application/commands/ScaleCommand.js';
import { DeleteCommand } from '../src/application/commands/DeleteCommand.js';
import { GroupCommand } from '../src/application/commands/GroupCommand.js';
import { UngroupCommand } from '../src/application/commands/UngroupCommand.js';
import { AddToCommand } from '../src/application/commands/AddToCommand.js';
import { FrontCommand } from '../src/application/commands/FrontCommand.js';
import { BackCommand } from '../src/application/commands/BackCommand.js';
import { MemoryStore } from './MemoryStore.js';

test('all edit Commands restore exact before/after state through history', () => {
  const session = new EditorSession(new MemoryStore()), factory = new ShapeFactory(), presenter = new DocumentPresenter();
  session.init();
  const commands = [
    new CreateCommand(factory, 'g', 'scene', []),
    new CreateCommand(factory, 'rect', 'r', ['1', '2', '3', '4'], 'scene'),
    new CreateCommand(factory, 'circle', 'c', ['5', '6', '7'], 'scene'),
    new GroupCommand('pair', ['c', 'r']),
    new MoveCommand('pair', 3, 5), new ScaleCommand('pair', 1.5),
    new SetCommand('pair', 'fill', 'red'), new FrontCommand('r'), new BackCommand('r'),
    new UngroupCommand('pair'), new CreateCommand(factory, 'g', 'target', [], 'scene'),
    new AddToCommand('target', 'r'), new DeleteCommand('target'),
  ];
  for (const command of commands) {
    const before = presenter.tree(session.document());
    session.execute(command);
    const after = presenter.tree(session.document());
    session.undo(); assert.equal(presenter.tree(session.document()), before);
    session.redo(); assert.equal(presenter.tree(session.document()), after);
  }
});

test('failed edit is atomic even when a composite operation fails part way through', () => {
  const session = new EditorSession(new MemoryStore()), factory = new ShapeFactory(), presenter = new DocumentPresenter();
  session.init(); session.execute(new CreateCommand(factory, 'g', 'g', []));
  session.execute(new CreateCommand(factory, 'circle', 'first', ['1', '1', '1'], 'g'));
  session.execute(new CreateCommand(factory, 'circle', 'huge', ['1e308', '1', '1'], 'g'));
  session.execute(new SetCommand('g', 'fill', 'red')); session.undo();
  const before = presenter.tree(session.document());
  assert.throws(() => session.execute(new ScaleCommand('g', 10)), /invalid/);
  assert.equal(presenter.tree(session.document()), before);
  session.redo(); assert.equal(session.document().find('g').attributes().fill, 'red');
});

test('IO barriers, failed IO, display queries and redo invalidation follow the specification', async () => {
  const store = new MemoryStore(), session = new EditorSession(store), factory = new ShapeFactory();
  assert.throws(() => session.undo(), /no document/);
  session.init(); assert.throws(() => session.undo(), /undo not allowed/);
  session.execute(new CreateCommand(factory, 'g', 'g', []));
  session.canvas(); session.document(); session.undo(); session.redo();
  store.failWrite = true;
  await assert.rejects(session.save('locked.svg'), /cannot write/);
  session.undo(); store.failRead = true;
  await assert.rejects(session.read('missing.svg'), /cannot read/);
  session.redo();
  session.undo(); session.execute(new CreateCommand(factory, 'g', 'other', []));
  assert.throws(() => session.redo(), /nothing to redo/);
  store.failWrite = false; await session.save('saved.svg');
  assert.throws(() => session.undo(), /undo not allowed/);
  session.execute(new CreateCommand(factory, 'g', 'next', [])); session.undo();
  session.canvas(100, 200); assert.throws(() => session.redo(), /undo not allowed/);
  store.failRead = false; await session.read('saved.svg'); assert.throws(() => session.undo(), /undo not allowed/);
  assert.equal(session.document().width, 800);
});
