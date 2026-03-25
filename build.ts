import { build as esbuild } from 'esbuild';
import { readdirSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PLUGIN_NAME = 'notif';
const CONFIG_FILE = 'notif.jsonc';

function copyRecursive(src: string, dest: string): void {
  const stat = statSync(src);

  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    const files = readdirSync(src);
    for (const file of files) {
      copyRecursive(join(src, file), join(dest, file));
    }
  } else {
    copyFileSync(src, dest);
  }
}

async function build(): Promise<void> {
  console.log('Building...');

  await esbuild({
    entryPoints: [`src/${PLUGIN_NAME}.ts`],
    bundle: true,
    outfile: `dist/${PLUGIN_NAME}.js`,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    external: ['@opencode-ai/plugin'],
    sourcemap: true,
  });

  console.log('Copying sounds...');
  copyRecursive('src/assets/sounds', 'dist/assets/sounds');

  console.log('Copying config...');
  copyFileSync(CONFIG_FILE, `dist/${PLUGIN_NAME}.jsonc`);

  console.log('Build complete! Copy dist/ to your OpenCode plugins directory.');
}

try {
  await build();
} catch (error) {
  console.error(error);
  process.exit(1);
}
