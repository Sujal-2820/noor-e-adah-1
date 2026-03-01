const fs = require('fs');

const targetFile = 'Backend/controllers/adminController.js';
let content = fs.readFileSync(targetFile, 'utf8');

// Fix dangling '1,' in aggregation projections
content = content.replace(/,\s+1,\n/g, ',\n');
content = content.replace(/\{\s+1,\n/g, '{\n');
// Actually, let's look for specific line start
content = content.replace(/\n\s+1,\s*\n/g, '\n');

// Fix missing key for $arrayElemAt
content = content.replace(/\n\s+\{ \$arrayElemAt: \['\$seller', 0\] \},/g, '\n');
content = content.replace(/\n\s+\{ \$arrayElemAt: \['\$User', 0\] \},/g, '\n          User: { $arrayElemAt: ["$User", 0] },');
// Wait, Step 829 showed:
// 3772:           User: { $arrayElemAt: ['$User', 0] },
// 3773:            { $arrayElemAt: ['$seller', 0] },
// So I should just remove 3773.

// Fix duplicate keys in objects
function removeDuplicateKeys(str) {
    const lines = str.split('\n');
    const seen = new Set();
    const result = [];
    for (const line of lines) {
        const match = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
        if (match) {
            const key = match[1];
            if (seen.has(key)) {
                console.log('Removing duplicate key:', key);
                continue;
            }
            seen.add(key);
        } else if (line.trim() === '1,' || line.trim() === '1') {
            console.log('Removing dangling 1,');
            continue;
        }
        result.push(line);
    }
    return result.join('\n');
}

// Apply to PaymentHistory projection specifically if possible, or generally
// Let's try to fix the PaymentHistory block
content = content.replace(/\$project: \{[\s\S]*?\},/g, (match) => {
    return removeDuplicateKeys(match);
});

fs.writeFileSync(targetFile, content);
console.log('Cleanup script finished');
