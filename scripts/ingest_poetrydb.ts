#!/usr/bin/env bun
import { spawn } from 'child_process';
import path from 'path';

const POETRYDB_BASE_URL = 'https://poetrydb.org';

interface PoetryDBPoem {
  title: string;
  author: string;
  lines: string[];
  linecount: number;
}

interface CLIOptions {
  targetCount: number;
  provider: 'openai' | 'anthropic';
  model?: string;
  temperature: number;
  dryRun: boolean;
  strategy: 'random' | 'authors' | 'diverse';
  batchSize: number;
  delay: number; // ms between API calls
  outputPath: string;
}

const FAMOUS_AUTHORS = [
  'William Shakespeare',
  'Emily Dickinson',
  'Robert Frost',
  'Maya Angelou',
  'Langston Hughes',
  'Walt Whitman',
  'Edgar Allan Poe',
  'Pablo Neruda',
  'Sylvia Plath',
  'E. E. Cummings',
  'William Wordsworth',
  'John Keats',
  'Percy Bysshe Shelley',
  'Lord Byron',
  'William Blake',
  'T. S. Eliot',
  'W. B. Yeats',
  'Rainer Maria Rilke',
  'Robert Burns',
  'Elizabeth Barrett Browning',
];

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    targetCount: 1000,
    provider: 'openai',
    temperature: 0.2,
    dryRun: false,
    strategy: 'diverse',
    batchSize: 20,
    delay: 500,
    outputPath: path.resolve(__dirname, '..', 'poems.json'),
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--count':
      case '-c':
        options.targetCount = Number(args[++i]);
        break;
      case '--provider':
        {
          const value = args[++i]?.toLowerCase();
          if (value === 'openai' || value === 'anthropic') {
            options.provider = value;
          }
        }
        break;
      case '--model':
        options.model = args[++i];
        break;
      case '--temperature':
        options.temperature = Number(args[++i]);
        break;
      case '--strategy':
        {
          const value = args[++i];
          if (value === 'random' || value === 'authors' || value === 'diverse') {
            options.strategy = value;
          }
        }
        break;
      case '--batch-size':
        options.batchSize = Number(args[++i]);
        break;
      case '--delay':
        options.delay = Number(args[++i]);
        break;
      case '--output':
      case '-o':
        options.outputPath = path.resolve(process.cwd(), args[++i]);
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function selectPreferredPoems(poems: PoetryDBPoem[], limit: number): PoetryDBPoem[] {
  if (poems.length <= limit) {
    return poems;
  }

  const sorted = [...poems].sort((a, b) => {
    if (b.linecount === a.linecount) {
      return a.title.localeCompare(b.title);
    }
    return b.linecount - a.linecount;
  });

  const unique: PoetryDBPoem[] = [];
  const seen = new Set<string>();

  for (const poem of sorted) {
    const key = `${poem.title}|||${poem.author}`.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(poem);
    if (unique.length >= limit) {
      break;
    }
  }

  return unique;
}

async function fetchPoems(endpoint: string): Promise<PoetryDBPoem[]> {
  const response = await fetch(`${POETRYDB_BASE_URL}${endpoint}`);

  if (!response.ok) {
    throw new Error(`PoetryDB API error (${response.status})`);
  }

  const data = await response.json();

  if (data.status && data.reason) {
    throw new Error(data.reason);
  }

  const poems = Array.isArray(data) ? data : [data];

  return poems.map((poem) => ({
    title: poem.title || 'Untitled',
    author: poem.author || 'Unknown',
    lines: poem.lines || [],
    linecount: poem.linecount || poem.lines?.length || 0,
  }));
}

async function getRandomPoems(count: number): Promise<PoetryDBPoem[]> {
  return fetchPoems(`/random/${count}`);
}

async function getAuthorPoems(author: string, limit: number): Promise<PoetryDBPoem[]> {
  const encodedAuthor = encodeURIComponent(author);
  return fetchPoems(`/author,poemcount/${encodedAuthor}:abs;${limit}`);
}

async function formatPoemWithScript(
  poem: PoetryDBPoem,
  options: CLIOptions
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const scriptPath = path.resolve(__dirname, 'format_poem.ts');
    const poemText = poem.lines.join('\n');

    const args = [
      'run',
      scriptPath,
      '--text',
      poemText,
      '--title',
      poem.title,
      '--author',
      poem.author,
      '--language',
      'en',
      '--provider',
      options.provider,
      '--temperature',
      String(options.temperature),
      '--output',
      options.outputPath,
    ];

    if (options.model) {
      args.push('--model', options.model);
    }

    if (options.dryRun) {
      args.push('--dry-run');
    }

    const child = spawn('bun', args, {
      stdio: 'pipe',
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || stdout });
      }
    });

    child.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  try {
    const options = parseArgs();

    console.log(`\n📚 PoetryDB Ingestion Script`);
    console.log(`Target: ${options.targetCount} poems`);
    console.log(`Strategy: ${options.strategy}`);
    console.log(`Provider: ${options.provider}${options.model ? ` (${options.model})` : ''}`);
    console.log(`Batch size: ${options.batchSize}`);
    console.log(`Delay: ${options.delay}ms\n`);

    let allPoems: PoetryDBPoem[] = [];

    // Fetch poems based on strategy
    if (options.strategy === 'random') {
      console.log(`Fetching ${options.targetCount} random poems...\n`);
      const batches = Math.ceil(options.targetCount / options.batchSize);

      for (let i = 0; i < batches; i++) {
        const count = Math.min(options.batchSize, options.targetCount - allPoems.length);
        console.log(`Fetching batch ${i + 1}/${batches} (${count} poems)...`);

        const poems = await getRandomPoems(count);
        allPoems.push(...poems);

        if (i < batches - 1) {
          await sleep(options.delay);
        }
      }
    } else if (options.strategy === 'authors') {
      console.log(`Fetching poems from famous authors...\n`);
      const poemsPerAuthor = Math.ceil(options.targetCount / FAMOUS_AUTHORS.length);

      for (let i = 0; i < FAMOUS_AUTHORS.length; i++) {
        const author = FAMOUS_AUTHORS[i];
        console.log(`[${i + 1}/${FAMOUS_AUTHORS.length}] Fetching ${author}...`);

        try {
          const fetchLimit = Math.max(poemsPerAuthor, Math.min(poemsPerAuthor * 2, 50));
          const poems = await getAuthorPoems(author, fetchLimit);
          const curated = selectPreferredPoems(poems, poemsPerAuthor);
          console.log(`  ✓ Got ${poems.length} poems (${curated.length} curated)`);
          allPoems.push(...curated);
        } catch (error) {
          console.log(`  ✗ Failed: ${error}`);
        }

        if (i < FAMOUS_AUTHORS.length - 1) {
          await sleep(options.delay);
        }
      }
    } else if (options.strategy === 'diverse') {
      console.log(`Fetching diverse mix of poems...\n`);

      // 50% from famous authors, 50% random
      const authorCount = Math.floor(options.targetCount * 0.5);
      const randomCount = options.targetCount - authorCount;
      const poemsPerAuthor = Math.ceil(authorCount / FAMOUS_AUTHORS.length);

      console.log(`Fetching ${authorCount} from authors (${poemsPerAuthor} each)...`);
      for (let i = 0; i < FAMOUS_AUTHORS.length; i++) {
        const author = FAMOUS_AUTHORS[i];
        console.log(`  [${i + 1}/${FAMOUS_AUTHORS.length}] ${author}...`);

        try {
          const fetchLimit = Math.max(poemsPerAuthor, Math.min(poemsPerAuthor * 2, 50));
          const poems = await getAuthorPoems(author, fetchLimit);
          const curated = selectPreferredPoems(poems, poemsPerAuthor);
          allPoems.push(...curated);
        } catch (error) {
          console.log(`    ✗ Failed`);
        }

        await sleep(options.delay);
      }

      console.log(`\nFetching ${randomCount} random poems...`);
      const batches = Math.ceil(randomCount / options.batchSize);
      for (let i = 0; i < batches; i++) {
        const count = Math.min(options.batchSize, randomCount - (allPoems.length - authorCount));
        const poems = await getRandomPoems(count);
        allPoems.push(...poems);

        if (i < batches - 1) {
          await sleep(options.delay);
        }
      }
    }

    // Deduplicate by title + author
    const seen = new Set<string>();
    const uniquePoems = allPoems.filter((poem) => {
      const key = `${poem.title}|||${poem.author}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`\n✓ Fetched ${allPoems.length} poems (${uniquePoems.length} unique)\n`);

    // Limit to target count
    const poemsToProcess = uniquePoems.slice(0, options.targetCount);

    console.log(`📝 Processing ${poemsToProcess.length} poems through formatter...\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (let i = 0; i < poemsToProcess.length; i++) {
      const poem = poemsToProcess[i];
      const num = `[${i + 1}/${poemsToProcess.length}]`;

      process.stdout.write(`${num} "${poem.title}" by ${poem.author}... `);

      const result = await formatPoemWithScript(poem, options);

      if (result.success) {
        if (result.error?.includes('Duplicate')) {
          console.log('⚠️  duplicate');
          skipCount++;
        } else {
          console.log('✅');
          successCount++;
        }
      } else {
        console.log(`❌ ${result.error?.split('\n')[0] || 'unknown error'}`);
        errorCount++;
      }

      // Add delay between formatting calls to avoid rate limits
      if (i < poemsToProcess.length - 1) {
        await sleep(options.delay);
      }
    }

    console.log(`\n✨ Done!`);
    console.log(`✅ Added: ${successCount}`);
    console.log(`⚠️  Skipped (duplicates): ${skipCount}`);
    console.log(`❌ Errors: ${errorCount}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

void main();
