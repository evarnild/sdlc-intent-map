import js from '@eslint/js';
import globals from 'globals';

// Flat-config `globals` merge across blocks, so the node set is given only to
// the files that may use it, not removed afterwards.
export default [
  { ignores: ['node_modules/**'] },
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 2024, sourceType: 'module' } },
  // Everything outside the shared core and the page runs on node.
  { ignores: ['src/core/**', 'src/web/**'], languageOptions: { globals: globals.node } },
  // src/core is shared by the server and the page, so it gets the language's
  // own globals only (no process, Buffer, window, document). Its imports of
  // node modules are checked by the architecture test (principle 1).
  { files: ['src/core/**/*.mjs'], languageOptions: { globals: globals.es2021 } },
  // The page runs in a browser.
  { files: ['src/web/**/*.mjs'], languageOptions: { globals: globals.browser } },
  // Tests run on node, wherever they live; they are not shipped.
  { files: ['src/**/*.test.mjs'], languageOptions: { globals: globals.node } },
];
