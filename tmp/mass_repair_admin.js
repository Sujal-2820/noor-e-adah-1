const fs = require('fs');

const targetFile = 'Backend/controllers/adminController.js';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Fix shadowing of User model
// Replace 'const User = await User' with 'const user = await User'
content = content.replace(/const User = await User/g, 'const user = await User');

// 2. Fix broken aggregations ($project blocks with dangling commas or missing keys)
content = content.replace(/\$project: \{([\s\S]*?)\}/g, (match, body) => {
    let cleanBody = body
        .split('\n')
        .map(line => {
            const trimmed = line.trim();
            // Remove dangling numbers or empty entries
            if (trimmed === '1,' || trimmed === '1' || trimmed === ',') return '';
            // Remove entries without keys (e.g., '{ $arrayElemAt: ... }')
            if (trimmed.startsWith('{') && !trimmed.includes(':') && trimmed.endsWith('},')) return '';
            return line;
        })
        .filter(line => line !== '')
        .join('\n');

    // Remove duplicate keys in this block
    const lines = cleanBody.split('\n');
    const seen = new Set();
    const result = [];
    for (const line of lines) {
        const keyMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
        if (keyMatch) {
            const key = keyMatch[1];
            if (seen.has(key)) continue;
            seen.add(key);
        }
        result.push(line);
    }
    return `$project: {${result.join('\n')}}`;
});

// 3. Fix price field collisions in createProduct and updateProduct
// (I already did createProduct, but let's do more generally if needed)
// Actually, let's just make sure finalPriceToUser is unique if it appears twice.
content = content.replace(/let finalPriceToUser = priceToUser;\n\s*let finalPriceToUser = priceToUser;/g,
    `let finalWholesalePrice = wholesalePrice;
    let finalPublicPrice = publicPrice;`);

// 4. Remove any remaining Seller model references that might cause crashes
// We'll replace Seller.find etc with a comment if it's outside our removed blocks
// But usually it's safer to just let it fail if it's truly gone.

fs.writeFileSync(targetFile, content);
console.log('Mass repair finished');
