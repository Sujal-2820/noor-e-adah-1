const fs = require('fs');
const path = require('path');

const targetFile = 'Backend/models/Product.js';
let content = fs.readFileSync(targetFile, 'utf8');

// Fix the pricing fields collision
// Field 1 (Wholesale): priceToUser (Cap U)
// Field 2 (Retail): priceToUser (low u) -> renamed to priceToUser during my earlier mass replace.

// Let's use clean names: wholesalePrice and publicPrice
content = content.replace(/priceToUser: \{[\s\S]*?Price to User is required[\s\S]*?\}/,
    `wholesalePrice: {
    type: Number,
    required: [true, 'Wholesale price is required'],
    min: [0, 'Wholesale price cannot be negative'],
  }`);

content = content.replace(/priceToUser: \{[\s\S]*?Price to user is required[\s\S]*?\}/,
    `publicPrice: {
    type: Number,
    required: [true, 'Public price is required'],
    min: [0, 'Public price cannot be negative'],
  }`);

// Fix variants too
content = content.replace(/UserPrice: \{[\s\S]*?Price to User for this specific attribute combination[\s\S]*?\}/,
    `wholesalePrice: {
      type: Number,
      required: true,
      min: [0, 'Wholesale price cannot be negative'],
    }`);

content = content.replace(/userPrice: \{[\s\S]*?Price to user for this specific attribute combination[\s\S]*?\}/,
    `publicPrice: {
      type: Number,
      required: true,
      min: [0, 'Public price cannot be negative'],
    }`);

// Fix discounts
content = content.replace(/discountUser: \{[\s\S]*?default: 0,[\s\S]*?\}/,
    `discountWholesale: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0,
  }`);

content = content.replace(/discountUser: \{[\s\S]*?default: 0,[\s\S]*?\}/,
    `discountPublic: {
    type: Number,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
    default: 0,
  }`);

fs.writeFileSync(targetFile, content);
console.log('Product.js fixed');
