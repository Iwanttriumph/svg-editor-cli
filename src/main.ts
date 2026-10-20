import { EditorSession } from './application/EditorSession.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { Repl } from './cli/Repl.js';
import { ShapeFactory } from './domain/ShapeFactory.js';
import { FileDocumentStore } from './infrastructure/FileDocumentStore.js';
import { XmlSvgCodec } from './infrastructure/XmlSvgCodec.js';

const factory = new ShapeFactory();
const store = new FileDocumentStore(new XmlSvgCodec(factory));
await new Repl(new CommandDispatcher(new EditorSession(store), factory)).run();
