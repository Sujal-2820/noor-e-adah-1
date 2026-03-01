/**
 * Check Admin Data in New Database
 */

const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const NEW_DB_URL = 'mongodb+srv://agarwaldeeksha03:YvsvnVCtrP8rYX2R@ecomm-satpura.3fa8s.mongodb.net/?retryWrites=true&w=majority&appName=ecomm-satpura';

async function checkAdminData() {
    try {
        console.log('\n🔍 Checking Admin Data in New Database...\n');

        await mongoose.connect(NEW_DB_URL);
        console.log('✅ Connected to database\n');

        const admins = await Admin.find({}).select('-password');

        if (admins.length === 0) {
            console.log('⚠️  No admin accounts found!');
            console.log('You need to create an admin using:');
            console.log('   npm run create-admin\n');
            return;
        }

        console.log(`✅ Found ${admins.length} admin account(s):\n`);
        console.log('─'.repeat(70));

        admins.forEach((admin, index) => {
            console.log(`Admin #${index + 1}:`);
            console.log(`  📧 Email: ${admin.email}`);
            console.log(`  👤 Name: ${admin.name || 'Not set'}`);
            console.log(`  🔑 Role: ${admin.role || 'admin'}`);
            console.log(`  🆔 ID: ${admin._id}`);
            console.log(`  📅 Created: ${admin.createdAt || 'N/A'}`);
            console.log('─'.repeat(70));
        });

        console.log('\n✅ Admin data verification complete!');
        console.log('You can now use these credentials to login to the admin panel.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
    }
}

checkAdminData();
