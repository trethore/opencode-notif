#!/usr/bin/env node

import { execSync } from 'child_process'
import { rmSync, existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

type Platform = 'linux' | 'darwin' | 'win32'

const PLUGINS_DIR: Record<Platform, string> = {
  linux: join(homedir(), '.config', 'opencode', 'plugin'),
  darwin: join(homedir(), '.config', 'opencode', 'plugin'),
  win32: join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'opencode', 'plugin')
}

function getPluginsDir(): string {
  const platform = process.platform as Platform
  const dir = PLUGINS_DIR[platform]
  if (!dir) {
    console.error(`Unsupported platform: ${process.platform}`)
    process.exit(1)
  }
  return dir
}

function copyRecursive(src: string, dest: string): void {
  const stat = statSync(src)

  if (!stat.isDirectory()) {
    const fileName = src.split('/').pop() || ''
    if (shouldPreserveFile(fileName) && existsSync(dest)) {
      return
    }
    copyFileSync(src, dest)
    return
  }

  mkdirSync(dest, { recursive: true })
  for (const file of readdirSync(src)) {
    copyRecursive(join(src, file), join(dest, file))
  }
}

function build(): void {
  console.log('Building plugin...')
  try {
    execSync('npm run build', { stdio: 'inherit' })
    console.log('✓ Build complete')
  } catch {
    console.error('✗ Build failed')
    process.exit(1)
  }
}

const PRESERVED_FILES = ['notif.jsonc']

function shouldPreserveFile(file: string): boolean {
  return PRESERVED_FILES.includes(file)
}

function removeExistingFile(destPath: string, file: string): void {
  if (!existsSync(destPath)) {
    return
  }

  const isDirectory = statSync(destPath).isDirectory()

  if (isDirectory) {
    console.log(`  Removing existing ${file}/`)
    rmSync(destPath, { recursive: true, force: true })
    return
  }

  if (shouldPreserveFile(file)) {
    console.log(`  Preserving existing ${file}`)
    return
  }

  console.log(`  Removing existing ${file}`)
  rmSync(destPath, { force: true })
}

function install(): void {
  const pluginsDir = getPluginsDir()
  const distDir = 'dist'

  console.log(`Installing to ${pluginsDir}...`)

  if (!existsSync(distDir)) {
    console.error('✗ dist/ directory not found. Run build first.')
    process.exit(1)
  }

  for (const file of readdirSync(distDir)) {
    removeExistingFile(join(pluginsDir, file), file)
  }

  console.log('  Copying files...')
  copyRecursive(distDir, pluginsDir)
  console.log('✓ Installation complete')
}

function main(): void {
  const args = process.argv.slice(2)
  const buildOnly = args.includes('--build-only') || args.includes('-b')
  const installOnly = args.includes('--install-only') || args.includes('-i')

  if (buildOnly) {
    build()
  } else if (installOnly) {
    install()
  } else {
    build()
    install()
  }
}

main()
