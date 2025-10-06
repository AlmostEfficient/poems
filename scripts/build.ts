#!/usr/bin/env bun
import { spawnSync } from 'child_process';
import path from 'path';
import { updateVersion, getCurrentVersion } from './version';

type Platform = 'ios' | 'android' | 'all';
type VersionBump = 'major' | 'minor' | 'patch';

interface BuildOptions {
  platform: Platform;
  profile: string;
  bump?: VersionBump;
  skipGenerate: boolean;
  skipBuild: boolean;
  submit: boolean;
  dryRun: boolean;
}

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv: string[]): BuildOptions {
  const options: BuildOptions = {
    platform: 'ios',
    profile: 'production',
    bump: undefined,
    skipGenerate: false,
    skipBuild: false,
    submit: false,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--platform':
        options.platform = (argv[index + 1] as Platform) ?? 'ios';
        index += 1;
        break;
      case '--profile':
        options.profile = argv[index + 1] ?? 'production';
        index += 1;
        break;
      case '--bump':
        options.bump = (argv[index + 1] as VersionBump) ?? 'patch';
        index += 1;
        break;
      case '--no-bump':
        options.bump = undefined;
        break;
      case '--skip-generate':
        options.skipGenerate = true;
        break;
      case '--skip-build':
        options.skipBuild = true;
        break;
      case '--submit':
        options.submit = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
        printHelp();
        process.exit(0);
      default:
        if (arg.startsWith('--')) {
          console.warn(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`Poems build helper\n=====================\n\nUsage:\n  bun scripts/build.ts [options]\n\nOptions:\n  --platform <ios|android|all>   Target platform for EAS build (default: ios)\n  --profile <name>               EAS build profile (default: production)\n  --bump <major|minor|patch>     Bump version before building\n  --no-bump                      Skip version bump even if default set\n  --skip-generate                Skip regenerating assets/poems.db\n  --skip-build                   Only run pre-steps (useful for version/asset prep)\n  --submit                       Submit the latest build to the store after build\n  --dry-run                      Log commands instead of executing them\n  --help                         Show this message\n\nExamples:\n  bun scripts/build.ts --bump patch --submit\n  bun scripts/build.ts --platform android --profile preview\n  bun scripts/build.ts --skip-generate\n`);
}

function runCommand(command: string, args: string[], description: string, dryRun = false) {
  const pretty = `${command} ${args.join(' ')}`.trim();
  console.log(`\n→ ${description}`);
  console.log(`   $ ${pretty}`);

  if (dryRun) {
    console.log('   (dry run, command not executed)');
    return;
  }

  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(`${description} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function ensureBunxAvailable() {
  const result = spawnSync('bunx', ['--version'], { stdio: 'ignore' });
  if (result.status !== 0) {
    throw new Error('bunx not available. Install Bun globally or ensure PATH includes bunx.');
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('Poems build workflow');
  console.log('====================');

  ensureBunxAvailable();

  if (!options.skipGenerate) {
    runCommand('bun', ['scripts/generate_poems_db.js'], 'Regenerating bundled poems database', options.dryRun);
  } else {
    console.log('\n→ Skipping database generation (per flag)');
  }

  let targetVersion = getCurrentVersion();
  if (options.bump) {
    targetVersion = updateVersion(options.bump);
  }

  if (!options.skipBuild) {
    const platform = options.platform ?? 'ios';
    const buildArgs = ['eas', 'build', '--profile', options.profile, '--platform', platform, '--non-interactive'];
    runCommand('bunx', buildArgs, `Running EAS build (${platform}/${options.profile})`, options.dryRun);
  } else {
    console.log('\n→ Build step skipped (per flag)');
  }

  if (options.submit) {
    const platform = options.platform ?? 'ios';
    const submitArgs = ['eas', 'submit', '--latest', '--profile', options.profile, '--platform', platform, '--non-interactive'];
    runCommand('bunx', submitArgs, 'Submitting latest build to store', options.dryRun);
  }

  console.log('\n✔ Build workflow complete');
  console.log(`   Version: ${targetVersion}`);
  console.log(`   Platform: ${options.platform}`);
  console.log(`   Profile: ${options.profile}`);
  console.log(`   Submit: ${options.submit ? 'yes' : 'no'}`);
}

main().catch((error) => {
  console.error('\nBuild workflow failed');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
