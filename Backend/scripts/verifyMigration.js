/**
 * Verify Database Migration
 * Quick script to check if migration was successful
 */

const mongoose = require('mongoose');

const NEW_DB_URL = 'mongodb+srv://agarwaldeeksha03:YvsvnVCtrP8rYX2R@ecomm-satpura.3fa8s.mongodb.net/?retryWrites=true&w=majority&appName=ecomm-satpura';

async function verifyMigration() {
    console.log('\n🔍 Verifying Database Migration...\n');

    try {
        // Connect to new database
        await mongoose.connect(NEW_DB_URL);
        console.log('✅ Connected to NEW database\n');

        // Get all collections
        const collections = await mongoose.connection.db.listCollections().toArray();

        console.log(`📊 Total Collections: ${collections.length}\n`);
        console.log('Collection Details:');
        console.log('─'.repeat(50));

        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            const status = count > 0 ? '📋 HAS DATA' : '📭 EMPTY';
            console.log(`${status} | ${col.name.padEnd(30)} | ${count} records`);
        }

        console.log('─'.repeat(50));

        // Check admin data specifically
        const adminCount = await mongoose.connection.db.collection('admins').countDocuments();
        if (adminCount > 0) {
            console.log('\n✅ Admin data found!');
            const admins = await mongoose.connection.db.collection('admins').find({}, { projection: { email: 1, name: 1, role: 1 } }).toArray();
            console.log('Admin accounts:');
            admins.forEach((admin, index) => {
                console.log(`  ${index + 1}. ${admin.email} (${admin.name || 'No name'})`);
            });
        } else {
            console.log('\n⚠️  No admin data found. You may need to create an admin manually.');
        }

        console.log('\n✅ Migration verification complete!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from database\n');
    }
}

verifyMigration();
