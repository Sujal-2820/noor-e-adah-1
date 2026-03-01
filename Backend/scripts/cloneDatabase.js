const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SOURCE_URI = process.env.MONGO_URI;
// Replace database name in URI
const TARGET_URI = SOURCE_URI.replace('/satpurabio?', '/Canx_international?').replace('/satpurabio', '/Canx_international');

async function cloneDatabase() {
    let sourceConn, targetConn;
    try {
        console.log('Connecting to Source Database: satpurabio...');
        sourceConn = await mongoose.createConnection(SOURCE_URI).asPromise();

        console.log('Connecting to Target Database: Canx_international...');
        targetConn = await mongoose.createConnection(TARGET_URI).asPromise();

        const collections = await sourceConn.db.listCollections().toArray();
        console.log(`Found ${collections.length} collections to clone.`);

        for (const collInfo of collections) {
            const collName = collInfo.name;
            console.log(`Cloning collection: ${collName}...`);

            const sourceColl = sourceConn.db.collection(collName);
            const targetColl = targetConn.db.collection(collName);

            const data = await sourceColl.find({}).toArray();

            if (data.length > 0) {
                // Clear target collection first if exists (safety)
                await targetColl.deleteMany({});
                await targetColl.insertMany(data);
                console.log(`✅ Successfully cloned ${data.length} documents for ${collName}`);
            } else {
                console.log(`ℹ️ Collection ${collName} is empty. Skipping.`);
                // Ensure the collection is created even if empty
                await targetConn.db.createCollection(collName).catch(() => { });
            }
        }

        console.log('\n--- CLONE COMPLETE ---');
        console.log(`New Database: Canx_international is ready.`);

    } catch (err) {
        console.error('❌ Error during cloning:', err.message);
    } finally {
        if (sourceConn) await sourceConn.close();
        if (targetConn) await targetConn.close();
        process.exit(0);
    }
}

cloneDatabase();
