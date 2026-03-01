const mongoose = require('mongoose');

const NEW_DB_URL = 'mongodb+srv://sujal99ds_db_user:65MPJxARvf5ieXSS@clustercanx.j0g3biq.mongodb.net/?retryWrites=true&w=majority&appName=ClusterCanx';

async function testConnection() {
    console.log('Testing connection to ClusterCanx...');
    try {
        const connection = await mongoose.createConnection(NEW_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000
        }).asPromise();

        console.log('✅ Successfully connected to ClusterCanx!');

        // List collections
        const collections = await connection.db.listCollections().toArray();
        console.log(`\nFound ${collections.length} collections:`);
        collections.forEach(c => console.log(`  - ${c.name}`));

        await connection.close();
        console.log('\n✅ Connection test completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('\n⚠️  Please check:');
        console.error('  1. Your IP is whitelisted in MongoDB Atlas');
        console.error('  2. The database credentials are correct');
        console.error('  3. The cluster is running');
        process.exit(1);
    }
}

testConnection();
