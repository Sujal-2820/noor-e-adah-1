const mongoose = require('mongoose');

const NEW_DB_URL = 'mongodb+srv://sujal99ds_db_user:DvEHC8z9ApZteyDI@clustercanx.bcazxvt.mongodb.net/?retryWrites=true&w=majority&appName=ClusterCanx';

async function testConnection() {
    console.log('Testing connection with CORRECT credentials...');

    try {
        const connection = await mongoose.createConnection(NEW_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000
        }).asPromise();

        console.log('✅ Successfully connected to ClusterCanx!');
        console.log('Database:', connection.db.databaseName);

        // List collections
        const collections = await connection.db.listCollections().toArray();
        console.log(`\nFound ${collections.length} collections:`);
        collections.forEach(c => console.log(`  - ${c.name}`));

        await connection.close();
        console.log('\n✅ Connection test PASSED! Ready to migrate!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

testConnection();
