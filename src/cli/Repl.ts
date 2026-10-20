import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { CommandDispatcher } from './CommandDispatcher.js';
export class Repl {
  constructor(private readonly dispatcher: CommandDispatcher) {}
  async run(input: Readable = process.stdin, output: Writable = process.stdout): Promise<void> {
    const terminal = input === process.stdin && Boolean(process.stdin.isTTY);
    const lines = createInterface({ input, output, terminal });
    output.write("svg-editor 0.1 — type 'help' for commands\n");
    lines.setPrompt('svg> ');
    if (terminal) lines.prompt();
    for await (const line of lines) {
      for (const message of await this.dispatcher.run(line)) output.write(`${message}\n`);
      if (terminal) lines.prompt();
    }
  }
}
