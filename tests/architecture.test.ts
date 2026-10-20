import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { basename, relative, resolve, sep } from 'node:path';

test('source files obey layer dependencies, class naming and centralized shape dispatch', async () => {
  const root = resolve('src');
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter(entry => entry.isFile() && entry.name.endsWith('.ts'))
    .map(entry => resolve(entry.parentPath, entry.name));
  const allowed: Record<string, readonly string[]> = {
    domain: ['domain'], application: ['application', 'domain'], cli: ['cli', 'application', 'domain'],
    infrastructure: ['infrastructure', 'application', 'domain'],
  };
  for (const file of files) {
    const source = await readFile(file, 'utf8'), layer = relative(root, file).split(sep)[0]!;
    const classes = [...source.matchAll(/^export (?:abstract )?class (\w+)/gmu)];
    assert.ok(classes.length <= 1, `${file}: multiple classes`);
    if (classes.length) assert.equal(basename(file, '.ts'), classes[0]![1]);
    if (!allowed[layer]) continue; // Composition root is deliberately unrestricted.
    for (const match of source.matchAll(/from\s+['"]([^'"]+)['"]/gu)) {
      const specifier = match[1]!;
      if (specifier.startsWith('.')) {
        const target = relative(root, resolve(file, '..', specifier)).split(sep)[0]!;
        assert.ok(allowed[layer]!.includes(target), `${file}: forbidden dependency ${specifier}`);
      } else if (layer === 'domain' || layer === 'application') assert.fail(`${file}: external dependency ${specifier}`);
      else if (layer === 'cli') assert.ok(specifier.startsWith('node:'), `${file}: CLI imports infrastructure library`);
    }
    assert.doesNotMatch(source, /switch\s*\([^)]*(?:tag|type)/u, `${file}: shape tag switch`);
  }
});
