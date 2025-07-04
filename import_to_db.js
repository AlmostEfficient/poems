const fs = require('fs');
const Database = require('better-sqlite3');
const csv = require('csv-parser');

function importToDatabase() {
  return new Promise((resolve, reject) => {
    console.log('Importing Poetry Foundation data directly to SQLite...');
    
    // Test if CSV file exists
    if (!fs.existsSync('PoetryFoundationData.csv')) {
      console.error('CSV file not found!');
      reject(new Error('CSV file not found'));
      return;
    }
    
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
    
    // Parse CSV records properly
    const insert = db.prepare('INSERT OR IGNORE INTO poems (title, author, content) VALUES (?, ?, ?)');
    
    let imported = 0;
    let finished = false;
    
    function finishImport() {
      if (finished) return;
      finished = true;
      
      // Show stats
      const count = db.prepare('SELECT COUNT(*) as count FROM poems').get();
      console.log(`Total poems in database: ${count.count}`);
      
      // Show sample titles
      const samples = db.prepare('SELECT title, author FROM poems LIMIT 5').all();
      console.log('\nSample poems:');
      samples.forEach((poem, i) => {
        console.log(`  ${i + 1}. "${poem.title}" by ${poem.author}`);
      });
      
      db.close();
      resolve(imported);
    }
    
    const stream = fs.createReadStream('PoetryFoundationData.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Stop processing if we've hit our limit
        if (imported >= 50) {
          stream.destroy();
          return;
        }
        
        // CSV columns: (empty), Title, Poem, Poet, Tags
        const title = row.Title?.trim();
        const rawContent = row.Poem?.trim();
        const author = row.Poet?.trim();
        
        // Normalize content: clean up excessive whitespace while preserving stanza breaks
        const content = rawContent ? rawContent
          .replace(/\r\n/g, '\n')           // Normalize line endings
          .replace(/\n{3,}/g, '\n\n')       // Max 2 consecutive newlines (stanza break)
          .replace(/[ \t]+/g, ' ')          // Multiple spaces/tabs → single space
          .replace(/[ \t]*\n[ \t]*/g, '\n') // Remove spaces around newlines
          .trim() : '';
        
        // Debug first few records
        if (imported < 3) {
          console.log(`\nRecord ${imported + 1}:`);
          console.log(`  Title: "${title?.substring(0, 50)}${title?.length > 50 ? '...' : ''}"`);
          console.log(`  Author: "${author?.substring(0, 30)}${author?.length > 30 ? '...' : ''}"`);
          console.log(`  Content length: ${content?.length || 0}`);
          console.log(`  Content preview: "${content?.substring(0, 100)}${content?.length > 100 ? '...' : ''}"`);
        }
        
        // Filter valid poems
        if (title && author && content && content.length > 10) {
          try {
            insert.run(title, author, content);
            imported++;
            console.log(`Imported ${imported}/50: "${title}"`);
          } catch (e) {
            console.log(`Error inserting poem "${title}": ${e.message}`);
          }
        }
      })
      .on('end', () => {
        console.log(`\n✅ CSV parsing complete. Imported ${imported} poems to database`);
        finishImport();
      })
      .on('close', () => {
        console.log(`\n✅ Stream closed. Imported ${imported} poems to database`);
        finishImport();
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);
        db.close();
        reject(error);
      });
  });
}

if (require.main === module) {
  importToDatabase().catch(console.error);
}

module.exports = { importToDatabase }; 