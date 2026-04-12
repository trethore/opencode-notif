#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { buildProject } from './build';

const DIST_DIR = 'dist';
const PRESERVED_FILES = new Set(['notif.jsonc']);

function getPluginsDir(): string {
  return path.join(homedir(), '.config', 'opencode', 'plugins');
}

function ensureDistExists(): void {
  if (!existsSync(DIST_DIR)) {
    throw new Error('dist/ directory not found. Run build first.');
  }
}

function replaceTarget(srcPath: string, destPath: string): void {
  rmSync(destPath, { recursive: true, force: true });
  cpSync(srcPath, destPath, { recursive: true });
}

function installEntry(srcPath: string, destPath: string, name: string): void {
  if (PRESERVED_FILES.has(name) && existsSync(destPath)) {
    return;
  }

  replaceTarget(srcPath, destPath);
}

function installAssets(pluginsDir: string): void {
  const notifSourceDir = path.join(DIST_DIR, 'assets', 'notif');
  if (!existsSync(notifSourceDir)) {
    return;
  }

  const assetsDir = path.join(pluginsDir, 'assets');
  mkdirSync(assetsDir, { recursive: true });
  replaceTarget(notifSourceDir, path.join(assetsDir, 'notif'));
}

function install(): void {
  ensureDistExists();

  const pluginsDir = getPluginsDir();
  mkdirSync(pluginsDir, { recursive: true });

  console.log(`Installing to ${pluginsDir}...`);

  for (const name of readdirSync(DIST_DIR)) {
    if (name === 'assets') {
      installAssets(pluginsDir);
      continue;
    }

    installEntry(path.join(DIST_DIR, name), path.join(pluginsDir, name), name);
  }

  console.log('Installation complete');
}

function parseArgs(): { buildOnly: boolean; installOnly: boolean } {
  const args = new Set(process.argv.slice(2));
  const buildOnly = args.has('--build-only') || args.has('-b');
  const installOnly = args.has('--install-only') || args.has('-i');

  if (buildOnly && installOnly) {
    throw new Error('Choose either --build-only or --install-only.');
  }

  return { buildOnly, installOnly };
}

async function main(): Promise<void> {
  const { buildOnly, installOnly } = parseArgs();

  if (buildOnly) {
    await buildProject();
    return;
  }

  if (installOnly) {
    install();
    return;
  }

  await buildProject();
  install();
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
