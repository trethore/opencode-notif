import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_REPO_URL = 'https://github.com/sst/opencode.git';
const DEFAULT_REPO_REF = 'dev';
const DEFAULT_TARGET_DIR = 'references/opencode';

function printUsage(): void {
  console.log(`Usage: tsx scripts/sync-opencode.ts [ref]

Clones or updates the OpenCode source tree into a gitignored local folder.

Environment overrides:
  OPENCODE_REPO_URL     Repository URL
  OPENCODE_REPO_REF     Branch, tag, or commit to checkout
  OPENCODE_TARGET_DIR   Clone destination

Examples:
  npm run sync:opencode
  npm run sync:opencode -- dev
  OPENCODE_REPO_REF=v0.4.0 npm run sync:opencode`);
}

function runGit(args: string[], cwd?: string, allowFailure = false): boolean {
  const result = spawnSync('git', args, {
    cwd,
    stdio: 'inherit',
  });

  if (result.status === 0) {
    return true;
  }

  if (allowFailure) {
    return false;
  }

  throw new Error(`git ${args.join(' ')} failed with exit code ${result.status ?? 1}`);
}

type SyncOptions = {
  repoUrl: string;
  repoRef: string;
  targetDir: string;
};

function getSyncOptions(args: string[]): SyncOptions {
  return {
    repoUrl: process.env.OPENCODE_REPO_URL ?? DEFAULT_REPO_URL,
    repoRef: args[0] ?? process.env.OPENCODE_REPO_REF ?? DEFAULT_REPO_REF,
    targetDir: path.resolve(process.cwd(), process.env.OPENCODE_TARGET_DIR ?? DEFAULT_TARGET_DIR),
  };
}

function initializeCheckout(targetDir: string, repoUrl: string, repoRef: string): void {
  if (existsSync(path.resolve(targetDir, '.git'))) {
    console.log(`Updating existing OpenCode checkout in ${targetDir}...`);
    runGit(['remote', 'set-url', 'origin', repoUrl], targetDir);
    return;
  }

  console.log(`Initializing OpenCode checkout in ${targetDir}...`);
  mkdirSync(targetDir, { recursive: true });
  runGit(['init', '-b', repoRef, targetDir]);
  runGit(['remote', 'add', 'origin', repoUrl], targetDir);
}

function fetchRef(targetDir: string, repoUrl: string, repoRef: string): void {
  const fetchedBranch = runGit(['fetch', '--depth', '1', 'origin', repoRef], targetDir, true);

  if (fetchedBranch) {
    return;
  }

  const fetchedTag = runGit(
    ['fetch', '--depth', '1', 'origin', `refs/tags/${repoRef}:refs/tags/${repoRef}`],
    targetDir,
    true
  );

  if (!fetchedTag) {
    throw new Error(`Failed to fetch ref '${repoRef}' from ${repoUrl}`);
  }
}

function main(): void {
  const args = process.argv.slice(2);

  if (args[0] === '-h' || args[0] === '--help') {
    printUsage();
    return;
  }

  const { repoUrl, repoRef, targetDir } = getSyncOptions(args);

  mkdirSync(path.dirname(targetDir), { recursive: true });
  initializeCheckout(targetDir, repoUrl, repoRef);
  fetchRef(targetDir, repoUrl, repoRef);

  runGit(['checkout', '--force', 'FETCH_HEAD'], targetDir);
  runGit(['clean', '-fd'], targetDir);

  console.log(`OpenCode source is available at ${targetDir}`);
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
