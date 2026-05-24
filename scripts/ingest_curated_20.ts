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

interface CuratedPoem {
  title: string;
  author: string;
  description: string;
}

// Top 20 feel-good, optimistic, beautiful poems
const CURATED_POEMS: CuratedPoem[] = [
  {
    title: 'I Wandered Lonely as a Cloud',
    author: 'William Wordsworth',
    description: 'Pure joy from nature, accessible, uplifting',
  },
  {
    title: 'The Road Not Taken',
    author: 'Robert Frost',
    description: 'Agency, choice, making your own path',
  },
  {
    title: 'Invictus',
    author: 'William Ernest Henley',
    description: 'Ultimate agency poem: "I am the master of my fate"',
  },
  {
    title: 'Song of Myself',
    author: 'Walt Whitman',
    description: 'Celebration of being alive, humanity',
  },
  {
    title: 'Hope is the thing with feathers',
    author: 'Emily Dickinson',
    description: 'Short, beautiful, optimistic',
  },
  {
    title: 'A Thing of Beauty',
    author: 'John Keats',
    description: 'A thing of beauty is a joy forever',
  },
  {
    title: 'The World Is Too Much With Us',
    author: 'William Wordsworth',
    description: 'Call to engage with nature/beauty',
  },
  {
    title: 'Trees',
    author: 'Joyce Kilmer',
    description: 'Simple appreciation of nature\'s beauty',
  },
  {
    title: 'How Do I Love Thee',
    author: 'Elizabeth Barrett Browning',
    description: 'Love, beauty, counting your blessings',
  },
  {
    title: 'The Sun Rising',
    author: 'John Donne',
    description: 'Joyful, playful love poem',
  },
  {
    title: 'To Autumn',
    author: 'John Keats',
    description: 'Sensory beauty, richness of life',
  },
  {
    title: 'A Birthday',
    author: 'Christina Rossetti',
    description: 'Pure celebration and joy',
  },
  {
    title: 'A Red, Red Rose',
    author: 'Robert Burns',
    description: 'Love, beauty, optimism',
  },
  {
    title: 'The Rhodora',
    author: 'Ralph Waldo Emerson',
    description: 'Finding beauty in nature',
  },
  {
    title: "When I Heard the Learn'd Astronomer",
    author: 'Walt Whitman',
    description: 'Choosing direct experience over analysis',
  },
  {
    title: 'The Passionate Shepherd to His Love',
    author: 'Christopher Marlowe',
    description: 'Pastoral beauty, romance',
  },
  {
    title: 'Jabberwocky',
    author: 'Lewis Carroll',
    description: 'Whimsy, playfulness, adventure',
  },
  {
    title: 'My Heart Leaps Up',
    author: 'William Wordsworth',
    description: 'Joy, wonder, maintaining childlike appreciation',
  },
  {
    title: "Pippa's Song",
    author: 'Robert Browning',
    description: 'God\'s in his heaven—All\'s right with the world!',
  },
  {
    title: 'Sea Fever',
    author: 'John Masefield',
    description: 'Adventure, freedom, engagement with life',
  },
];

interface CLIOptions {
  provider: 'openai' | 'anthropic';
  model?: string;
  temperature: number;
  dryRun: boolean;
  delay: number;
  outputPath: string;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    provider: 'openai',
    temperature: 0.2,
    dryRun: false,
    delay: 500,
    outputPath: path.resolve(__dirname, '..', 'poems.json'),
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
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

async function fetchPoemByTitleAndAuthor(title: string, author: string): Promise<PoetryDBPoem | null> {
  try {
    const encodedTitle = encodeURIComponent(title);
    const encodedAuthor = encodeURIComponent(author);
    const url = `${POETRYDB_BASE_URL}/author,title/${encodedAuthor};${encodedTitle}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`  API error (${response.status})`);
      return null;
    }

    const data = await response.json();

    if (data.status && data.reason) {
      // Try partial match
      const partialUrl = `${POETRYDB_BASE_URL}/author,title/${encodedAuthor};${encodedTitle.split('%20')[0]}`;
      const partialResponse = await fetch(partialUrl);

      if (!partialResponse.ok) {
        return null;
      }

      const partialData = await partialResponse.json();
      if (partialData.status && partialData.reason) {
        return null;
      }

      const poems = Array.isArray(partialData) ? partialData : [partialData];
      if (poems.length === 0) {
        return null;
      }

      // Return first match
      const poem = poems[0];
      return {
        title: poem.title || title,
        author: poem.author || author,
        lines: poem.lines || [],
        linecount: poem.linecount || poem.lines?.length || 0,
      };
    }

    const poems = Array.isArray(data) ? data : [data];
    if (poems.length === 0) {
      return null;
    }

    const poem = poems[0];
    return {
      title: poem.title || title,
      author: poem.author || author,
      lines: poem.lines || [],
      linecount: poem.linecount || poem.lines?.length || 0,
    };
  } catch (error) {
    console.error(`  Fetch error: ${error}`);
    return null;
  }
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

    console.log(`\n✨ Curating 20 Feel-Good Poems ✨`);
    console.log(`Provider: ${options.provider}${options.model ? ` (${options.model})` : ''}`);
    console.log(`Making the world brighter, one poem at a time\n`);

    let successCount = 0;
    let skipCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    for (let i = 0; i < CURATED_POEMS.length; i++) {
      const curated = CURATED_POEMS[i];
      const num = `[${i + 1}/${CURATED_POEMS.length}]`;

      process.stdout.write(`${num} "${curated.title}" by ${curated.author}\n`);
      process.stdout.write(`      → ${curated.description}\n`);
      process.stdout.write(`      `);

      const poem = await fetchPoemByTitleAndAuthor(curated.title, curated.author);

      if (!poem) {
        console.log('❌ Not found in PoetryDB');
        notFoundCount++;
        await sleep(options.delay);
        continue;
      }

      const result = await formatPoemWithScript(poem, options);

      if (result.success) {
        if (result.error?.includes('Duplicate')) {
          console.log('⚠️  Already in database');
          skipCount++;
        } else {
          console.log('✅ Added!');
          successCount++;
        }
      } else {
        console.log(`❌ Error: ${result.error?.split('\n')[0] || 'unknown'}`);
        errorCount++;
      }

      if (i < CURATED_POEMS.length - 1) {
        await sleep(options.delay);
      }
    }

    console.log(`\n✨ Complete!`);
    console.log(`✅ Added: ${successCount}`);
    console.log(`⚠️  Skipped (already in DB): ${skipCount}`);
    console.log(`❌ Not found in PoetryDB: ${notFoundCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`\n🌟 Making the world brighter, one poem at a time 🌟\n`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

void main();
