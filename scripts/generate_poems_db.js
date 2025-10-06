#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    input: path.resolve(__dirname, '..', 'poems.json'),
    output: path.resolve(__dirname, '..', 'assets', 'poems.db'),
    silent: false,
  };

  for (let i = 0; i < args.length; i++) {
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

function log(message) {
  if (!log.silent) {
    console.log(message);
  }
}

function ensurePoemsShape(rawPoems) {
  if (!Array.isArray(rawPoems)) {
    throw new Error('poems.json must export an array of poems');
  }

  const normalized = rawPoems
    .map((poem, index) => {
      if (!poem || typeof poem !== 'object') {
        throw new Error(`Poem at index ${index} is not an object`);
      }

      const title = String(poem.title || '').trim();
      const author = String(poem.author || '').trim();
      const content = String(poem.content || '').replace(/\r\n/g, '\n').trim();

      if (!title || !author || !content) {
        throw new Error(`Poem at index ${index} is missing required fields`);
      }

      return { title, author, content };
    });

  return normalized;
}

function buildDatabase(inputPath, outputPath) {
  const start = Date.now();

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const rawPoems = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const poems = ensurePoemsShape(rawPoems);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // Remove existing database to ensure a clean rebuild
  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const db = new Database(outputPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = OFF');

  db.exec(`
    CREATE TABLE IF NOT EXISTS poems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);

  const insert = db.prepare(
    'INSERT INTO poems (title, author, content) VALUES (@title, @author, @content)'
  );

  const insertMany = db.transaction((rows) => {
    rows.forEach((row) => insert.run(row));
  });

  insertMany(poems);

  const [{ count }] = db.prepare('SELECT COUNT(*) AS count FROM poems').all();
  const samples = db.prepare('SELECT title, author FROM poems ORDER BY id LIMIT 3').all();

  db.close();

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  log(`✅ Generated ${count} poems into ${path.relative(process.cwd(), outputPath)} in ${duration}s`);
  if (samples.length) {
    log('Sample entries:');
    samples.forEach((row, idx) => {
      log(`  ${idx + 1}. "${row.title}" — ${row.author}`);
    });
  }
}

function main() {
  try {
    const options = parseArgs();
    log.silent = options.silent;
    log('Building poems database...');
    log(`Input: ${options.input}`);
    log(`Output: ${options.output}`);
    buildDatabase(options.input, options.output);
  } catch (error) {
    console.error('Failed to generate poems.db');
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buildDatabase };
