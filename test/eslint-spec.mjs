import path from 'node:path';

import test from 'node:test';
import { ESLint } from 'eslint';

const __projroot = [1, 1].reduce(
  p => path.dirname(p),
  new URL(import.meta.url).pathname
);

const relativize = fn =>
  path.relative(__projroot, fn);

await test('Running eslint validation', async t => {
  const eslint = new ESLint();
  const results = await eslint.lintFiles([
    "**/*.mjs"
  ]);
  const formatter = await eslint.loadFormatter('unix');
  for (const result of results) {
    await t.test(`expecting '${relativize(result.filePath)}' to lint cleanly`, () => {
      const { errorCount, warningCount } = result;
      if (errorCount || warningCount) {
        throw formatter.format([result]);
      }
    });
  }
});
