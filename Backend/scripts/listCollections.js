const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function listCollections() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('--- COLLECTIONS IN CURRENT DATABASE ---');
        collections.forEach(c => console.log(`- ${c.name}`));

        await mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

listCollections();
