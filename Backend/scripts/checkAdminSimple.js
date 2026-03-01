/**
 * Simple Admin Check for New Database
 */

const { MongoClient } = require('mongodb');

const NEW_DB_URL = 'mongodb+srv://agarwaldeeksha03:YvsvnVCtrP8rYX2R@ecomm-satpura.3fa8s.mongodb.net/satpurabio?retryWrites=true&w=majority&appName=ecomm-satpura';

async function checkAdmin() {
    const client = new MongoClient(NEW_DB_URL);

    try {
        console.log('\n🔍 Checking NEW Database for Admin Data...\n');

        await client.connect();
        const db = client.db('satpurabio');

        const admins = await db.collection('admins').find({}).toArray();

        if (admins.length === 0) {
            console.log('❌ No admin found in new database!');
            console.log('Run: node scripts/migrateAdminSimple.js\n');
            return;
        }

        console.log(`✅ Found ${admins.length} admin account(s):\n`);
        console.log('═'.repeat(70));

        admins.forEach((admin, i) => {
            console.log(`\nAdmin #${i + 1}:`);
            console.log(`  📧 Email: ${admin.email}`);
            console.log(`  👤 Name: ${admin.name || 'Not set'}`);
            console.log(`  🆔 ID: ${admin._id}`);
            console.log(`  🔑 Role: ${admin.role || 'admin'}`);
        });

        console.log('\n═'.repeat(70));
        console.log('\n✅ Your admin is ready! Use this email to login.\n');

        // Check all collections
        const colls = await db.listCollections().toArray();
        console.log(`📊 Total collections in database: ${colls.length}\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

checkAdmin();
