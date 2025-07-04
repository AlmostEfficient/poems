const fs = require('fs');
const Database = require('better-sqlite3');

console.log('Resetting poems.db with clean poems from poems.json...');

// Load clean poems
const poems = require('./poems.json');
console.log(`Found ${poems.length} clean poems in poems.json`);

// Open database
const db = new Database('assets/poems.db');

// Clear existing data
db.exec('DELETE FROM poems;');
console.log('Cleared existing poems from database');

// Insert clean poems
const insert = db.prepare('INSERT INTO poems (title, author, content) VALUES (?, ?, ?)');

poems.forEach((poem, index) => {
    insert.run(poem.title, poem.author, poem.content);
    console.log(`${index + 1}. Added: "${poem.title}" by ${poem.author}`);
});

// Show final count
const count = db.prepare('SELECT COUNT(*) as count FROM poems').get();
console.log(`\n✅ Database reset complete! ${count.count} clean poems now in database`);

// Show sample
const samples = db.prepare('SELECT title, author FROM poems LIMIT 3').all();
console.log('\nSample poems:');
samples.forEach((poem, i) => {
    console.log(`  ${i + 1}. "${poem.title}" by ${poem.author}`);
});

db.close(); 