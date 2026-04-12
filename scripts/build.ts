import { build as esbuild } from 'esbuild';
import { copyFileSync, cpSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN_NAME = 'notif';
const CONFIG_FILE = 'notif.jsonc';

export async function buildProject(): Promise<void> {
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

  cpSync('src/assets/notif', 'dist/assets/notif', { recursive: true });
  copyFileSync(CONFIG_FILE, `dist/${PLUGIN_NAME}.jsonc`);

  console.log('Build complete!');
}

const currentFile = fileURLToPath(import.meta.url);
const entryFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (entryFile === currentFile) {
  try {
    await buildProject();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
