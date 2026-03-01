/**
 * Complete Database Migration Script - Copy ALL Data
 * 
 * This script copies ALL documents from ALL collections
 * from the old database to the new database.
 */

const mongoose = require('mongoose');

// Database URLs
const OLD_DB_URL = 'mongodb+srv://agarwaldeeksha03:YvsvnVCtrP8rYX2R@ecomm-satpura.3fa8s.mongodb.net/Canx_international?retryWrites=true&w=majority&appName=ecomm-satpura';
const NEW_DB_URL = 'mongodb+srv://sujal99ds_db_user:DvEHC8z9ApZteyDI@clustercanx.bcazxvt.mongodb.net/?retryWrites=true&w=majority&appName=ClusterCanx';

// Color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(70));
    log(title, 'bright');
    console.log('='.repeat(70) + '\n');
}

async function copyAllData() {
    console.clear();
    logSection('🚀 COMPLETE DATABASE MIGRATION - Copy ALL Data');

    log('Source: Canx_international @ ecomm-satpura', 'cyan');
    log('Target: ClusterCanx', 'magenta');
    log('\n⚠️  This will copy ALL documents from ALL collections', 'yellow');

    let oldDbConnection = null;
    let newDbConnection = null;

    try {
        // Connect to both databases
        logSection('STEP 1: Connecting to Databases');

        log('📡 Connecting to OLD database...', 'cyan');
        oldDbConnection = await mongoose.createConnection(OLD_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).asPromise();
        log('✅ Connected to OLD database', 'green');

        log('📡 Connecting to NEW database...', 'cyan');
        newDbConnection = await mongoose.createConnection(NEW_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).asPromise();
        log('✅ Connected to NEW database', 'green');

        // Get all collections
        logSection('STEP 2: Getting Collections');
        const oldDb = oldDbConnection.db;
        const newDb = newDbConnection.db;

        const collections = await oldDb.listCollections().toArray();
        log(`📊 Found ${collections.length} collections to migrate`, 'cyan');

        // Copy each collection
        logSection('STEP 3: Copying Data from Each Collection');

        let totalDocuments = 0;
        const migrationStats = [];

        for (const collectionInfo of collections) {
            const collectionName = collectionInfo.name;

            try {
                // Get all documents from old collection
                const documents = await oldDb.collection(collectionName).find({}).toArray();

                if (documents.length === 0) {
                    log(`   ⚪ ${collectionName}: 0 documents (empty)`, 'blue');
                    migrationStats.push({ name: collectionName, count: 0, status: 'empty' });
                    continue;
                }

                // Drop the collection in new database if it exists
                try {
                    await newDb.collection(collectionName).drop();
                } catch (err) {
                    // Collection might not exist, that's okay
                }

                // Insert all documents into new collection
                await newDb.collection(collectionName).insertMany(documents);

                totalDocuments += documents.length;
                log(`   ✅ ${collectionName}: ${documents.length} documents copied`, 'green');
                migrationStats.push({ name: collectionName, count: documents.length, status: 'success' });

            } catch (error) {
                log(`   ❌ ${collectionName}: FAILED - ${error.message}`, 'red');
                migrationStats.push({ name: collectionName, count: 0, status: 'failed', error: error.message });
            }
        }

        // Verification
        logSection('STEP 4: Verification');

        log(`✅ Total collections processed: ${collections.length}`, 'green');
        log(`✅ Total documents copied: ${totalDocuments}`, 'green');

        log('\n📊 Migration Summary:', 'cyan');
        migrationStats.forEach(stat => {
            if (stat.status === 'success') {
                log(`   ✅ ${stat.name}: ${stat.count} documents`, 'green');
            } else if (stat.status === 'empty') {
                log(`   ⚪ ${stat.name}: empty`, 'blue');
            } else {
                log(`   ❌ ${stat.name}: ${stat.error}`, 'red');
            }
        });

        logSection('✅ MIGRATION COMPLETED SUCCESSFULLY');
        log(`Total documents migrated: ${totalDocuments}`, 'bright');
        log('\nNext steps:', 'cyan');
        log('1. Verify data in MongoDB Atlas', 'yellow');
        log('2. Test your application thoroughly', 'yellow');
        log('3. Keep old database as backup for a few days', 'yellow');

    } catch (error) {
        logSection('❌ MIGRATION FAILED');
        log('Error: ' + error.message, 'red');
        console.error(error);

    } finally {
        if (oldDbConnection) {
            await oldDbConnection.close();
            log('\n🔌 Disconnected from OLD database', 'cyan');
        }
        if (newDbConnection) {
            await newDbConnection.close();
            log('🔌 Disconnected from NEW database', 'cyan');
        }

        process.exit(0);
    }
}

// Run migration
copyAllData();
