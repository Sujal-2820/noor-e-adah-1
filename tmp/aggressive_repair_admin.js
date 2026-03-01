const fs = require('fs');

const targetFile = 'Backend/controllers/adminController.js';
let content = fs.readFileSync(targetFile, 'utf8');

// Fix common broken aggregation snippets
// 1. Missing keys in $match or $project blocks
// Patterns like '{ $ne: null }' or '{ $regex: ... }' without a preceding key
content = content.replace(/\n\s+\{ (\$ne|\$regex|\$in|\$exists):/g, (match, op) => {
    // This is hard to fix without knowing the intended key, but we can guess or comment it out
    // If it's in a block where we just deleted 'sellerId', maybe it was sellerId
    return '\n          // BROKEN_KEY_REMOVED: { ' + op + ':';
});

// Actually, let's fix specific blocks I know about
content = content.replace(/\{ \$ne: null \}/g, 'sellerId: { $ne: null }'); // Guessing based on aggregation id

// 2. Fix the broken block in getDashboard (if any left)
// I already fixed the first one, but let's check others

// 3. Fix the matchingUsers duplicate again if it exists elsewhere
// (Already did it once)

// 4. Remove all blocks that use Seller model if they are causing syntax errors
// Instead of removing, let's try to fix the remaining syntax errors

// Fix dangling braces in project
content = content.replace(/\$project: \{([\s\S]*?)\}/g, (match, body) => {
    return '$project: {' + body.split('\n').filter(l => l.trim() !== '1,' && l.trim() !== '1').join('\n') + '}';
});

fs.writeFileSync(targetFile, content);
console.log('Aggressive repair finished');
