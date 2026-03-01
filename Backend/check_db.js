const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('./config/database');
const Product = require('./models/Product');

async function check() {
    await connectDB();
    const products = await Product.find().limit(5);
    console.log(JSON.stringify(products, null, 2));
    process.exit(0);
}

check();
