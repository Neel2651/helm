import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['.next/**', 'out/**', 'build/**', 'data/**', 'next-env.d.ts'] },
  {
    rules: {
      // This rule assumes the Pages Router's _document.js. The App Router's app/layout.js,
      // which is where our Google Fonts <link> tags live, is the correct place for them.
      '@next/next/no-page-custom-font': 'off',

      // Project rule: every stored and passed-around shape is named in lib/types.ts.
      // `any` erases that checking; `unknown` is usually a sign a type belongs there instead
      // of being narrowed ad hoc at each call site. Both are errors here, not just discouraged.
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSUnknownKeyword',
          message: "Don't use `unknown`. Name the real shape in lib/types.ts, or narrow with a type guard.",
        },
      ],
    },
  },
];

export default eslintConfig;
