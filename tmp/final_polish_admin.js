const fs = require('fs');

const targetFile = 'Backend/controllers/adminController.js';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Update populate strings
content = content.replace(/'([^']*)priceToUser([^']*)'/g, (match, prefix, suffix) => {
    return "'" + prefix + "wholesalePrice publicPrice" + suffix + "'";
});
content = content.replace(/'([^']*)discountUser([^']*)'/g, (match, prefix, suffix) => {
    return "'" + prefix + "discountWholesale discountPublic" + suffix + "'";
});

// 2. Update destructuring in createProduct and updateProduct
// Use a more targeted regex for req.body destructuring
content = content.replace(/const\s+\{([^}]*)priceToUser([^}]*)\}\s*=\s*req\.body/g, (match, before, after) => {
    return "const {" + before + "wholesalePrice, publicPrice, discountWholesale, discountPublic" + after + "} = req.body";
});

// 3. Fix the topUsers / topSellers blocks that I broke (double keys)
content = content.replace(/userId: sellerId: \{ \$ne: null \}/g, 'userId: { $ne: null }');
content = content.replace(/sellerId: { \$ne: null }/g, 'userId: { $ne: null }'); // Since sellerId is gone

// 4. Final syntax fix for dangling commas in project blocks if any left
content = content.replace(/\$project: \{([\s\S]*?)\}/g, (match, body) => {
    let clean = body.split('\n').filter(l => l.trim().length > 0 && l.trim() !== '1,' && l.trim() !== '1').join('\n');
    return '$project: {' + clean + '}';
});

fs.writeFileSync(targetFile, content);
console.log('Final polish finished');
