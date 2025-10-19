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
  metadata?: PoemMetadata | null;
}

interface NormalizedPoem {
  id: string;
  title: string;
  author: string;
  content: string;
  language: 'en' | 'ur';
  source: string;
  metadata: string;
}

type PoemLengthBucket = 'short' | 'medium' | 'long';

interface PoemMetadata {
  tags?: string[];
  themes?: string[];
  moods?: string[];
  form?: string | null;
  era?: string | null;
  length?: PoemLengthBucket | null;
}

const DB_VERSION = 4;

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

    const { id, title, author, content, language, source, metadata } = poem as RawPoem;

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
      metadata: JSON.stringify(normalizeMetadata(metadata)),
    };
  });

  return normalized;
}

function normalizeMetadata(raw: unknown): PoemMetadata {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const asRecord = raw as Record<string, unknown>;
  const metadata: PoemMetadata = {};

  const tags = normalizeStringArray(asRecord.tags);
  if (tags) {
    metadata.tags = tags;
  }

  const themes = normalizeStringArray(asRecord.themes);
  if (themes) {
    metadata.themes = themes;
  }

  const moods = normalizeStringArray(asRecord.moods);
  if (moods) {
    metadata.moods = moods;
  }

  const form = typeof asRecord.form === 'string' ? asRecord.form.trim() : '';
  if (form) {
    metadata.form = form;
  }

  const era = typeof asRecord.era === 'string' ? asRecord.era.trim() : '';
  if (era) {
    metadata.era = era;
  }

  const length = normalizeLength(asRecord.length);
  if (length) {
    metadata.length = length;
  }

  return metadata;
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
  return items.length ? items : undefined;
}

function normalizeLength(value: unknown): PoemLengthBucket | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'short' || normalized === 'medium' || normalized === 'long') {
    return normalized;
  }
  return undefined;
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
      metadata TEXT NOT NULL DEFAULT '{}',
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
    `INSERT INTO poems (poem_id, title, author, content, language, source, metadata)
     VALUES (@id, @title, @author, @content, @language, @source, @metadata)`
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
