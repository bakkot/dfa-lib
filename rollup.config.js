import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default commandOptions => {
  const dev = commandOptions['config-dev'];
  const targets = [
    'ui.js',
  ];
  return targets.map(target => ({
    input: `src/${target}`,
    treeshake: !dev,
    output: [
      {
        file: `dist/${target}`,
        format: 'iife',
        sourcemap: true,
        strict: false,        // cfgrammar-tools sets globals
      },
    ],
    plugins: [
      commonjs(),
      babel({ babelHelpers: 'bundled' }),
      nodeResolve(),
      !dev && terser(),
    ],
  }));
};
