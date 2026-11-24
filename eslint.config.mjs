import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**'] },
  js.configs.recommended,
  { languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: globals.node } },
  // The page runs in a browser; src/core is shared, so it may use neither
  // set of globals beyond the language's own (checked by the architecture test).
  { files: ['src/web/**/*.mjs'], languageOptions: { globals: globals.browser } },
];
