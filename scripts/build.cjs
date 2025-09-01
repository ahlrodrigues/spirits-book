// scripts/build.cjs
const { build } = require('esbuild');

build({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',        // ← gera 1 arquivo na raiz
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'cjs',
  target: 'es2018',
  platform: 'browser',
  external: ['obsidian'],
  loader: { '.json': 'json' },
}).catch((err) => { console.error(err); process.exit(1); });
