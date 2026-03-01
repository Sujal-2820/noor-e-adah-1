const mongoose = require('mongoose');

// Try with explicit database name
const NEW_DB_URL = 'mongodb+srv://sujal99ds_db_user:65MPJxARvf5ieXSS@clustercanx.j0g3biq.mongodb.net/Canx_international?retryWrites=true&w=majority&appName=ClusterCanx';

async function testConnection() {
    console.log('Testing connection to ClusterCanx with database name...');
    console.log('URL:', NEW_DB_URL.replace(/:[^:@]+@/, ':****@')); // Hide password

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
        console.log('\n✅ Connection test completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.error('\n⚠️  Possible issues:');
        console.error('  1. Cluster is paused or not running');
        console.error('  2. Username/password is incorrect');
        console.error('  3. Network connectivity issue');
        console.error('  4. Cluster is still initializing (wait a few minutes)');
        process.exit(1);
    }
}

testConnection();
