import esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/main.ts'],
  outfile: 'main.js',
  bundle: true,
  minify: true,
  sourcemap: false,
  format: 'cjs',
  target: 'es2018',
  platform: 'browser',
  external: ['obsidian'],   // Obsidian injeta no runtime
  loader: {
    '.json': 'json',        // permite importar JSON e embutir no bundle
    // '.txt': 'text',      // opcional: habilite se quiser embutir .txt
  },
});
