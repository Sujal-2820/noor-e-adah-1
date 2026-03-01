const fs = require('fs');

const targetFile = 'Backend/controllers/adminController.js';
const lines = fs.readFileSync(targetFile, 'utf8').split('\n');

// We want to remove lines from 2892 to 4022 (approx)
// To be safe, we'll find the markers
const startMarker = 2892; // // ============================================================================ // SELLER MANAGEMENT CONTROLLERS
const endMarker = 4022; // The end of rejectSellerChangeRequest

// Remove the lines (0-indexed, so -1)
const newLines = [
    ...lines.slice(0, startMarker - 1),
    ...lines.slice(endMarker)
];

fs.writeFileSync(targetFile, newLines.join('\n'));
console.log('Seller sections removed from adminController.js');
