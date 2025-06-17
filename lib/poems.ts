import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('poems.db');

export function initDB() {
  db.execSync(
    `CREATE TABLE IF NOT EXISTS poems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL
    );`
  );
}

export function getPoems(): any[] {
  const result = db.getAllSync('SELECT * FROM poems;');
  return result;
}

export function addPoem(title: string, author: string, content: string): void {
  // Check if poem already exists
  const existing = db.getFirstSync(
    'SELECT id FROM poems WHERE title = ? AND author = ?;',
    [title, author]
  );
  
  if (!existing) {
    db.runSync(
      'INSERT INTO poems (title, author, content) VALUES (?, ?, ?);',
      [title, author, content]
    );
  }
}

export async function seedPoems(): Promise<void> {
  const poems = getPoems();
  
  if (poems.length === 0) {
    // Try to load poems.json
    let poemsData: { title: string; author: string; content: string }[] = [];
    try {
      // For simplicity, use require for now (works in dev, not in prod bundle)
      poemsData = require('../poems.json');
    } catch (e) {
      // fallback: hardcoded poems
      poemsData = [
        {
          title: 'The Road Not Taken',
          author: 'Robert Frost',
          content: `Two roads diverged in a yellow wood,\nAnd sorry I could not travel both...` // truncated for brevity
        },
        {
          title: 'Still I Rise',
          author: 'Maya Angelou',
          content: `You may write me down in history\nWith your bitter, twisted lies...` // truncated for brevity
        }
      ];
    }
    
    // Insert poems
    poemsData.forEach((poem) => {
      addPoem(poem.title, poem.author, poem.content);
    });
  }
}