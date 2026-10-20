import { EditorSession } from '../application/EditorSession.js';
import { DocumentPresenter } from '../application/DocumentPresenter.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { DeleteCommand } from '../application/commands/DeleteCommand.js';
import { MoveCommand } from '../application/commands/MoveCommand.js';
import { ScaleCommand } from '../application/commands/ScaleCommand.js';
import { SetCommand } from '../application/commands/SetCommand.js';
import { GroupCommand } from '../application/commands/GroupCommand.js';
import { UngroupCommand } from '../application/commands/UngroupCommand.js';
import { AddToCommand } from '../application/commands/AddToCommand.js';
import { FrontCommand } from '../application/commands/FrontCommand.js';
import { BackCommand } from '../application/commands/BackCommand.js';
import { EditorError } from '../domain/EditorError.js';
import { Numbers } from '../domain/Numbers.js';
import { ShapeFactory } from '../domain/ShapeFactory.js';
import type { Token } from './Token.js';
import { Tokenizer } from './Tokenizer.js';

interface CommandDefinition { readonly usage: string; readonly min: number; readonly max: number; readonly run: (args: readonly Token[]) => string | readonly string[] | Promise<string | readonly string[]>; }
export class CommandDispatcher {
  readonly #tokenizer = new Tokenizer();
  readonly #presenter = new DocumentPresenter();
  readonly #commands: ReadonlyMap<string, CommandDefinition>;
  constructor(private readonly session: EditorSession, factory: ShapeFactory) {
    const text = (args: readonly Token[], index: number): string => args[index]!.value;
    const number = (args: readonly Token[], index: number): number => Numbers.finite(text(args, index));
    // The single command-name dispatch point; future command plugins replace this registration.
    this.#commands = new Map<string, CommandDefinition>([
      ['init', { usage: 'init [w] [h]', min: 0, max: 2, run: a => session.init(a[0] ? number(a, 0) : 800, a[1] ? number(a, 1) : 600) }],
      ['read', { usage: 'read <file.svg>', min: 1, max: 1, run: a => session.read(text(a, 0)) }],
      ['save', { usage: 'save [file.svg]', min: 0, max: 1, run: a => session.save(a[0]?.value) }],
      ['canvas', { usage: 'canvas [w] [h]', min: 0, max: 2, run: a => {
        if (a.length === 1) throw new EditorError('usage: canvas [w] [h]');
        return session.canvas(a[0] ? number(a, 0) : undefined, a[1] ? number(a, 1) : undefined);
      } }],
      ['create', { usage: 'create <type> <id> [params...] [in <containerId>]', min: 2, max: Infinity, run: a => {
        const params = a.slice(2); let parent: string | undefined;
        const marker = params.at(-2);
        if (marker?.value === 'in' && !marker.quoted) { parent = params.at(-1)!.value; params.splice(-2); }
        return session.execute(new CreateCommand(factory, text(a, 0), text(a, 1), params.map(t => t.value), parent));
      } }],
      ['delete', { usage: 'delete <id>', min: 1, max: 1, run: a => session.execute(new DeleteCommand(text(a, 0))) }],
      ['move', { usage: 'move <id> <dx> <dy>', min: 3, max: 3, run: a => session.execute(new MoveCommand(text(a, 0), number(a, 1), number(a, 2))) }],
      ['scale', { usage: 'scale <id> <factor>', min: 2, max: 2, run: a => session.execute(new ScaleCommand(text(a, 0), number(a, 1))) }],
      ['set', { usage: 'set <id> <attr> <value>', min: 3, max: 3, run: a => session.execute(new SetCommand(text(a, 0), text(a, 1), text(a, 2))) }],
      ['group', { usage: 'group <newGid> <id1> [id2...]', min: 2, max: Infinity, run: a => session.execute(new GroupCommand(text(a, 0), a.slice(1).map(t => t.value))) }],
      ['ungroup', { usage: 'ungroup <gid>', min: 1, max: 1, run: a => session.execute(new UngroupCommand(text(a, 0))) }],
      ['addto', { usage: 'addto <gid> <id>', min: 2, max: 2, run: a => session.execute(new AddToCommand(text(a, 0), text(a, 1))) }],
      ['front', { usage: 'front <id>', min: 1, max: 1, run: a => session.execute(new FrontCommand(text(a, 0))) }],
      ['back', { usage: 'back <id>', min: 1, max: 1, run: a => session.execute(new BackCommand(text(a, 0))) }],
      ['tree', { usage: 'tree [id]', min: 0, max: 1, run: a => this.#presenter.tree(session.document(), a[0]?.value) }],
      ['show', { usage: 'show <id>', min: 1, max: 1, run: a => this.#presenter.show(session.document(), text(a, 0)) }],
      ['undo', { usage: 'undo', min: 0, max: 0, run: () => session.undo() }],
      ['redo', { usage: 'redo', min: 0, max: 0, run: () => session.redo() }],
      ['help', { usage: 'help', min: 0, max: 0, run: () => [...this.#commands.values()].map(c => c.usage).join('\n') }],
    ]);
  }
  async run(source: string): Promise<readonly string[]> {
    try {
      const tokens = this.#tokenizer.tokenize(source);
      if (!tokens.length) return [];
      const name = tokens[0]!.value, args = tokens.slice(1), command = this.#commands.get(name);
      if (!command) throw new EditorError(`unknown command: ${name}`);
      if (name !== 'help' && name !== 'init' && name !== 'read') this.session.document();
      if (args.length < command.min || args.length > command.max) throw new EditorError(`usage: ${command.usage}`);
      const result = await command.run(args);
      return typeof result === 'string' ? [result] : result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [`error: ${message.replace(/[\r\n]+/gu, ' ')}`];
    }
  }
}
