import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import Database from 'better-sqlite3';
import { createPoemId, ensureUniquePoemId } from '../lib/utils/poemId';

interface RawPoem {
  id?: string;
  title: string;
  author: string;
  content: string;
  language?: 'en' | 'ur';
  source?: string;
}

interface NormalizedPoem {
  id: string;
  title: string;
  author: string;
  content: string;
  language: 'en' | 'ur';
  source: string;
}

const DB_VERSION = 3;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: path.resolve(__dirname, '..', 'poems.json'),
    output: path.resolve(__dirname, '..', 'assets', 'poems.db'),
    silent: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--input':
      case '-i':
        options.input = path.resolve(process.cwd(), args[++i]);
        break;
      case '--output':
      case '-o':
        options.output = path.resolve(process.cwd(), args[++i]);
        break;
      case '--silent':
        options.silent = true;
        break;
      default:
        console.warn(`Unknown option: ${arg}`);
        break;
    }
  }

  return options;
}

function logFactory(silent: boolean) {
  return (message: string) => {
    if (!silent) {
      console.log(message);
    }
  };
}

function sanitizeLanguage(language?: string): 'en' | 'ur' {
  if (language === 'ur') {
    return 'ur';
  }
  return 'en';
}

function ensurePoemsShape(rawPoems: unknown[]): NormalizedPoem[] {
  if (!Array.isArray(rawPoems)) {
    throw new Error('poems.json must contain an array of poems');
  }

  const usedIds = new Set<string>();
  const normalized: NormalizedPoem[] = rawPoems.map((poem, index) => {
    if (!poem || typeof poem !== 'object') {
      throw new Error(`Poem at index ${index} is not an object`);
    }

    const { id, title, author, content, language, source } = poem as RawPoem;

    const normalizedTitle = String(title ?? '').trim();
    const normalizedAuthor = String(author ?? '').trim();
    const normalizedContent = String(content ?? '').replace(/\r\n/g, '\n').trim();

    if (!normalizedTitle || !normalizedAuthor || !normalizedContent) {
      throw new Error(`Poem at index ${index} is missing title, author, or content`);
    }

    const normalizedLanguage = sanitizeLanguage(language);
    const desiredId = (id ?? '').trim() || createPoemId({
      title: normalizedTitle,
      author: normalizedAuthor,
      content: normalizedContent,
      language: normalizedLanguage,
    });
    const uniqueId = ensureUniquePoemId(desiredId, (candidate) => usedIds.has(candidate));
    usedIds.add(uniqueId);

    const normalizedSource = (source ?? 'bundled').toLowerCase();

    return {
      id: uniqueId,
      title: normalizedTitle,
      author: normalizedAuthor,
      content: normalizedContent,
      language: normalizedLanguage,
      source: normalizedSource,
    };
  });

  return normalized;
}

function buildDatabase(inputPath: string, outputPath: string, log: (message: string) => void) {
  const start = Date.now();

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const rawPoems = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const poems = ensurePoemsShape(rawPoems);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const db = new Database(outputPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = OFF');

  db.exec(`
    CREATE TABLE IF NOT EXISTS poems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      poem_id TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      source TEXT NOT NULL DEFAULT 'bundled',
      CHECK(language IN ('en','ur'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  const insert = db.prepare(
    `INSERT INTO poems (poem_id, title, author, content, language, source)
     VALUES (@id, @title, @author, @content, @language, @source)`
  );

  const insertMany = db.transaction((rows: NormalizedPoem[]) => {
    rows.forEach((row) => insert.run(row));
  });

  insertMany(poems);

  db.prepare(
    'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)'
  ).run('db_version', String(DB_VERSION));

  const [{ count }] = db.prepare('SELECT COUNT(*) AS count FROM poems').all() as Array<{ count: number }>;
  const samples = db.prepare('SELECT poem_id, title, author FROM poems ORDER BY id LIMIT 3').all();

  db.close();

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  log(`✅ Generated ${count} poems into ${path.relative(process.cwd(), outputPath)} in ${duration}s`);
  if (samples.length) {
    log('Sample entries:');
    samples.forEach((row: any, idx: number) => {
      log(`  ${idx + 1}. "${row.title}" — ${row.author} (${row.poem_id})`);
    });
  }
}

function main() {
  try {
    const options = parseArgs();
    const log = logFactory(options.silent);
    log('Building poems database...');
    log(`Input: ${options.input}`);
    log(`Output: ${options.output}`);
    buildDatabase(options.input, options.output, log);
  } catch (error) {
    console.error('Failed to generate poems.db');
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

const invokedDirectly = typeof process !== 'undefined'
  && Array.isArray(process.argv)
  && process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).toString();

if (invokedDirectly) {
  main();
}

export { buildDatabase };
