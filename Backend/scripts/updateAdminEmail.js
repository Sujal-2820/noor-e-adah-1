/**
 * Update Admin Email to admin@Noor E Adahbio.com
 */

const { MongoClient } = require('mongodb');

const NEW_DB_URL = 'mongodb+srv://agarwaldeeksha03:YvsvnVCtrP8rYX2R@ecomm-Noor E Adah.3fa8s.mongodb.net/Noor E Adahbio?retryWrites=true&w=majority&appName=ecomm-Noor E Adah';

async function updateAdminEmail() {
    const client = new MongoClient(NEW_DB_URL);

    try {
        console.log('\n🔄 Updating Admin Email...\n');

        await client.connect();
        const db = client.db('Noor E Adahbio');

        // Get current admin
        const currentAdmin = await db.collection('admins').findOne({});

        if (!currentAdmin) {
            console.log('❌ No admin found in database!');
            return;
        }

        console.log('Current admin:');
        console.log(`  📧 Email: ${currentAdmin.email}`);
        console.log(`  👤 Name: ${currentAdmin.name || 'Not set'}`);

        // Update email
        const result = await db.collection('admins').updateOne(
            { _id: currentAdmin._id },
            { $set: { email: 'admin@Noor E Adahbio.com' } }
        );

        if (result.modifiedCount === 1) {
            console.log('\n✅ Email updated successfully!\n');

            // Verify update
            const updatedAdmin = await db.collection('admins').findOne({ _id: currentAdmin._id });
            console.log('Updated admin:');
            console.log(`  📧 Email: ${updatedAdmin.email}`);
            console.log(`  👤 Name: ${updatedAdmin.name || 'Not set'}`);
            console.log(`  🆔 ID: ${updatedAdmin._id}`);

            console.log('\n🎉 Admin email is now: admin@Noor E Adahbio.com\n');
            console.log('Use this email to login to the admin panel.\n');
        } else {
            console.log('\n⚠️  No changes made.');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await client.close();
    }
}

updateAdminEmail();
