import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const isWatch = process.argv.includes('--watch');

async function build() {
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }

  // Copy ui.html
  if (fs.existsSync('src/ui.html')) {
    fs.copyFileSync(path.resolve('src/ui.html'), path.resolve('dist/ui.html'));
  }

  const context = await esbuild.context({
    entryPoints: ['src/code.ts'],
    bundle: true,
    outfile: 'dist/code.js',
    target: 'es6',
    logLevel: 'info',
  });

  if (isWatch) {
    await context.watch();
    console.log('Watching for changes in Figma plugin...');
  } else {
    await context.rebuild();
    await context.dispose();
    console.log('Plugin build complete.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
