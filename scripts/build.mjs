import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
const version = pkg.version;
const watch = process.argv.includes('--watch');

const banner = `/*! faulty-terminal v${version} | (c) madewithpixels
 * Derived from React Bits by David Haz (MIT + Commons Clause) — see NOTICE.md
 * Bundles ogl v${pkg.dependencies.ogl} (MIT, https://github.com/oframe/ogl)
 */`;

const shared = {
  bundle: true,
  minify: true,
  target: ['es2019'],
  loader: { '.css': 'text' },
  define: { __FT_VERSION__: JSON.stringify(version) },
  banner: { js: banner },
  legalComments: 'none',
  logLevel: 'info',
};

const builds = [
  // Drop-in for Webflow / plain HTML: <script src="..."></script>
  { ...shared, entryPoints: ['src/embed.js'], outfile: 'dist/faulty-terminal.min.js', format: 'iife' },
  // ESM for bundlers / <script type="module">
  { ...shared, entryPoints: ['src/faulty-terminal.js'], outfile: 'dist/faulty-terminal.esm.js', format: 'esm' },
];

mkdirSync('dist', { recursive: true });
writeFileSync('dist/faulty-terminal.css', readFileSync('src/faulty-terminal.css'));

function writeStandaloneEmbed() {
  // Self-contained fallback for sites that can't or won't hit a CDN.
  // Generated from dist/ — never hand-edit; edit src/ and rebuild.
  const js = readFileSync('dist/faulty-terminal.min.js', 'utf8');
  const cssSrc = readFileSync('src/faulty-terminal.css', 'utf8').trim();
  writeFileSync(
    'faulty-terminal.embed.html',
    `<!-- faulty-terminal v${version} — self-contained embed. GENERATED FILE: edit src/ and run npm run build. -->\n` +
      `<style>\n${cssSrc}\n</style>\n<script>\n${js}\n<\/script>\n`
  );
}

if (watch) {
  for (const cfg of builds) (await esbuild.context(cfg)).watch();
  console.log('watching…');
} else {
  await Promise.all(builds.map((cfg) => esbuild.build(cfg)));
  writeStandaloneEmbed();
  await import('./build-cdn-loader.mjs');
  console.log(`built v${version}`);
}
