const fs = require('fs');
const Database = require('better-sqlite3');

function importToDatabase() {
  console.log('Importing Poetry Foundation data directly to SQLite...');
  
  // Open/create database in assets folder
  const db = new Database('assets/poems.db');
  
  // Create table
  db.exec(`
    CREATE TABLE IF NOT EXISTS poems (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL
    );
  `);
  
  // Clear existing data (optional)
  const clearExisting = process.argv.includes('--clear');
  if (clearExisting) {
    db.exec('DELETE FROM poems;');
    console.log('Cleared existing poems');
  }
  
  // Prepare insert statement
  const insert = db.prepare('INSERT OR IGNORE INTO poems (title, author, content) VALUES (?, ?, ?)');
  
  // Read and process CSV
  const csvData = fs.readFileSync('PoetryFoundationData.csv', 'utf8');
  const lines = csvData.split('\n');
  
  let imported = 0;
  const transaction = db.transaction((lines) => {
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Handle CSV with format: ,Title,Poem,Poet,Tags
      const parts = line.split(',"');
      if (parts.length < 4) continue;
      
      const title = parts[1]?.replace(/"/g, '').trim();
      const content = parts[2]?.replace(/"/g, '').trim(); 
      const author = parts[3]?.replace(/"/g, '').split(',')[0].trim(); // Remove any tags
      
      if (title && author && content && content.length > 100) {
        insert.run(title, author, content);
        imported++;
      }
    }
  });
  
  transaction(lines);
  
  console.log(`✅ Imported ${imported} poems to database`);
  
  // Show stats
  const count = db.prepare('SELECT COUNT(*) as count FROM poems').get();
  console.log(`Total poems in database: ${count.count}`);
  
  db.close();
}

if (require.main === module) {
  importToDatabase();
}

module.exports = { importToDatabase }; 