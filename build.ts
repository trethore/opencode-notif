import { build as esbuild } from 'esbuild'
import { readdirSync, statSync, copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'

function copyRecursive(src: string, dest: string): void {
  const stat = statSync(src)

  if (stat.isDirectory()) {
    mkdirSync(dest, { recursive: true })
    const files = readdirSync(src)
    for (const file of files) {
      copyRecursive(join(src, file), join(dest, file))
    }
  } else {
    copyFileSync(src, dest)
  }
}

async function build(): Promise<void> {
  console.log('Building...')

  await esbuild({
    entryPoints: ['src/notificator.ts'],
    bundle: true,
    outfile: 'dist/notificator.js',
    platform: 'node',
    target: 'node18',
    format: 'esm',
    external: ['@opencode-ai/plugin'],
    sourcemap: true,
  })

  console.log('Copying sounds...')
  copyRecursive('src/assets/sounds', 'dist/assets/sounds')

  console.log('Copying config...')
  copyFileSync('src/config.jsonc', 'dist/config.jsonc')

  console.log('Build complete! Copy dist/ to your OpenCode plugins directory.')
}

build().catch(console.error)
