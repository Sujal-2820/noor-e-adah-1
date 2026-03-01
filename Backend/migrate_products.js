const mongoose = require('mongoose');
require('dotenv').config();
const { connectDB } = require('./config/database');
const Product = require('./models/Product');
const Category = require('./models/Category');

async function migrate() {
    try {
        await connectDB();
        console.log('Starting migration...');

        const products = await Product.find();
        console.log(`Found ${products.length} products to check...`);

        for (const product of products) {
            let updated = false;

            // Migrate category
            if (typeof product.category === 'string' || (product.category && !mongoose.Types.ObjectId.isValid(product.category.toString()))) {
                const val = product.category.toString();
                const cat = await Category.findOne({
                    $or: [
                        { slug: val.toLowerCase() },
                        { name: new RegExp('^' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
                    ]
                });
                if (cat) {
                    product.category = cat._id;
                    updated = true;
                    console.log(`Migrated category for product: ${product.name}`);
                }
            }

            // Migrate look, theme, collection
            const fields = ['look', 'theme', 'collection'];
            for (const field of fields) {
                if (product[field] && (typeof product[field] === 'string' || !mongoose.Types.ObjectId.isValid(product[field].toString()))) {
                    const val = product[field].toString();
                    const cat = await Category.findOne({
                        $or: [
                            { slug: val.toLowerCase() },
                            { name: new RegExp('^' + val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') }
                        ]
                    });
                    if (cat) {
                        product[field] = cat._id;
                        updated = true;
                        console.log(`Migrated ${field} for product: ${product.name}`);
                    } else {
                        // Keep as is or set undefined if it's junk
                        // If it's not a valid ID and not found in Category, it's probably junk
                        if (!mongoose.Types.ObjectId.isValid(val)) {
                            // product[field] = undefined;
                            // updated = true;
                        }
                    }
                }
            }

            if (updated) {
                await product.save();
            }
        }

        console.log('Migration complete!');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        process.exit(0);
    }
}

migrate();
