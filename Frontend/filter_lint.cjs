const fs = require('fs');
const content = fs.readFileSync('lint_results.txt', 'utf16le');
const lines = content.split('\n');
let currentFile = '';
lines.forEach(line => {
    if (line.trim().startsWith('C:\\')) {
        currentFile = line.trim();
    }
    if (line.includes('error') && !line.includes('no-unused-vars')) {
        console.log(`${currentFile}: ${line.trim()}`);
    }
});
