/**
 * Migrate Admin Data Specifically
 * This script ensures admin data is copied to the new database
 */

const mongoose = require('mongoose');

const OLD_DB_URL = 'mongodb+srv://yash007patidar_db_user:XNJIg0oR0Fz6mqyj@cluster0.bjmsiqo.mongodb.net/irasathi?retryWrites=true&w=majority&appName=Cluster0';
const NEW_DB_URL = 'mongodb+srv://agarwaldeeksha03:YvsvnVCtrP8rYX2R@ecomm-satpura.3fa8s.mongodb.net/?retryWrites=true&w=majority&appName=ecomm-satpura';

async function migrateAdminData() {
    let oldConnection = null;
    let newConnection = null;

    try {
        console.log('\n🔄 Starting Admin Data Migration...\n');

        // Connect to old database
        console.log('📡 Connecting to OLD database...');
        oldConnection = await mongoose.createConnection(OLD_DB_URL);
        console.log('✅ Connected to OLD database\n');

        // Connect to new database
        console.log('📡 Connecting to NEW database...');
        newConnection = await mongoose.createConnection(NEW_DB_URL);
        console.log('✅ Connected to NEW database\n');

        // Get admin data from old database
        const oldDb = oldConnection.db;
        const admins = await oldDb.collection('admins').find({}).toArray();

        console.log(`📊 Found ${admins.length} admin record(s) in OLD database`);

        if (admins.length === 0) {
            console.log('\n⚠️  No admin data found in old database.');
            console.log('This is normal if you haven\'t created an admin yet.');
            console.log('\nRecommendation: Create a new admin using:');
            console.log('   npm run create-admin\n');
            return;
        }

        // Display admin info
        console.log('\nAdmin accounts to migrate:');
        console.log('─'.repeat(70));
        admins.forEach((admin, index) => {
            console.log(`${index + 1}. ${admin.email} (${admin.name || 'No name'})`);
        });
        console.log('─'.repeat(70));

        // Check if admins already exist in new database
        const newDb = newConnection.db;
        const existingAdmins = await newDb.collection('admins').find({}).toArray();

        if (existingAdmins.length > 0) {
            console.log(`\n⚠️  Found ${existingAdmins.length} existing admin(s) in NEW database.`);
            console.log('Clearing existing admin data...');
            await newDb.collection('admins').deleteMany({});
            console.log('✅ Cleared existing admin data\n');
        }

        // Copy admin data
        console.log('📝 Copying admin data to NEW database...');
        await newDb.collection('admins').insertMany(admins);
        console.log(`✅ Successfully copied ${admins.length} admin record(s)!\n`);

        // Verify
        const verifyCount = await newDb.collection('admins').countDocuments();
        console.log('✅ Verification:');
        console.log(`   - Admins in NEW database: ${verifyCount}`);
        console.log(`   - Admins in OLD database: ${admins.length}`);

        if (verifyCount === admins.length) {
            console.log('\n🎉 Migration successful! Admin data is now in the new database.\n');
        } else {
            console.log('\n⚠️  Warning: Admin count mismatch. Please verify manually.\n');
        }

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nFull error:', error);
    } finally {
        if (oldConnection) {
            await oldConnection.close();
            console.log('🔌 Disconnected from OLD database');
        }
        if (newConnection) {
            await newConnection.close();
            console.log('🔌 Disconnected from NEW database');
        }
    }
}

migrateAdminData();
