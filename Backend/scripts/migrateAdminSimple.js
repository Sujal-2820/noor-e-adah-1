/**
 * Migrate Admin Data - Simplified Version
 */

const { MongoClient } = require('mongodb');

const OLD_DB_URL = 'mongodb+srv://yash007patidar_db_user:XNJIg0oR0Fz6mqyj@cluster0.bjmsiqo.mongodb.net/nooreadah?retryWrites=true&w=majority&appName=Cluster0';
const NEW_DB_URL = 'mongodb+srv://agarwaldeeksha03:YvsvnVCtrP8rYX2R@ecomm-Noor E Adah.3fa8s.mongodb.net/Noor E Adahbio?retryWrites=true&w=majority&appName=ecomm-Noor E Adah';

async function migrateAdmins() {
    const oldClient = new MongoClient(OLD_DB_URL);
    const newClient = new MongoClient(NEW_DB_URL);

    try {
        console.log('\n🔄 Admin Data Migration\n');

        // Connect to old database
        console.log('📡 Connecting to OLD database...');
        await oldClient.connect();
        const oldDb = oldClient.db('nooreadah');
        console.log('✅ Connected to OLD database');

        // Connect to new database  
        console.log('📡 Connecting to NEW database...');
        await newClient.connect();
        const newDb = newClient.db('Noor E Adahbio');
        console.log('✅ Connected to NEW database\n');

        // Get admin data
        console.log('📊 Fetching admin data from OLD database...');
        const admins = await oldDb.collection('admins').find({}).toArray();
        console.log(`   Found ${admins.length} admin record(s)\n`);

        if (admins.length === 0) {
            console.log('⚠️  No admin data in old database.');
            console.log('You will need to create a new admin.\n');
            return;
        }

        // Display admin info (without password)
        console.log('Admin accounts found:');
        console.log('─'.repeat(70));
        admins.forEach((admin, i) => {
            console.log(`${i + 1}. Email: ${admin.email}`);
            console.log(`   Name: ${admin.name || 'Not set'}`);
            console.log(`   ID: ${admin._id}`);
            console.log('─'.repeat(70));
        });

        // Clear existing admins in new DB
        console.log('\n🗑️  Clearing existing admin data in NEW database...');
        await newDb.collection('admins').deleteMany({});
        console.log('✅ Cleared\n');

        // Insert admin data
        console.log('📝 Inserting admin data into NEW database...');
        const result = await newDb.collection('admins').insertMany(admins);
        console.log(`✅ Inserted ${result.insertedCount} admin record(s)\n`);

        // Verify
        const verifyCount = await newDb.collection('admins').countDocuments();
        console.log('✅ Verification:');
        console.log(`   Admins in NEW database: ${verifyCount}`);
        console.log(`   Expected: ${admins.length}`);

        if (verifyCount === admins.length) {
            console.log('\n🎉 SUCCESS! Admin data migrated successfully!\n');
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error);
    } finally {
        await oldClient.close();
        await newClient.close();
        console.log('🔌 Connections closed\n');
    }
}

migrateAdmins();
