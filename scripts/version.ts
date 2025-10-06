#!/usr/bin/env bun
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type VersionBump = 'major' | 'minor' | 'patch';

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_PATH = path.join(ROOT, 'package.json');
const APP_PATH = path.join(ROOT, 'app.json');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

function writeJson(filePath: string, value: unknown) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function bump(version: string, type: VersionBump): string {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
}

export function getCurrentVersion(): string {
  const pkg = readJson<{ version: string }>(PACKAGE_PATH);
  return pkg.version;
}

export function updateVersion(type: VersionBump = 'patch'): string {
  const pkg = readJson<{ version: string }>(PACKAGE_PATH);
  const app = readJson<{ expo: { version: string } }>(APP_PATH);

  const current = pkg.version;
  const next = bump(current, type);

  pkg.version = next;
  app.expo.version = next;

  writeJson(PACKAGE_PATH, pkg);
  writeJson(APP_PATH, app);

  console.log(`Version updated: ${current} → ${next}`);
  return next;
}

function showUsage() {
  console.log(`Usage:\n  bun scripts/version.ts current\n  bun scripts/version.ts bump [major|minor|patch]`);
}

const isCli = (() => {
  const current = fileURLToPath(import.meta.url);
  const executed = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
  return executed !== undefined && path.resolve(current) === executed;
})();

if (isCli) {
  const [command, arg] = process.argv.slice(2);

  if (!command) {
    showUsage();
    process.exit(0);
  }

  switch (command) {
    case 'current':
      console.log(getCurrentVersion());
      break;
    case 'bump':
      updateVersion((arg as VersionBump) ?? 'patch');
      break;
    default:
      showUsage();
      process.exit(1);
  }
}
