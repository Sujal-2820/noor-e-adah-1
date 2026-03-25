/**
 * Database Migration Script
 * 
 * Purpose: Migrate schema structure and admin data to new database
 * Safety: Does NOT modify source database
 * 
 * Source: nooreadah database
 * Target: ecomm-Noor E Adah database
 * 
 * Actions:
 * 1. Connect to both databases
 * 2. Drop all collections in target database
 * 3. Create empty collections with schemas
 * 4. Copy ONLY admin data
 * 5. Verify migration
 */

const mongoose = require('mongoose');

// Database URLs
const OLD_DB_URL = 'mongodb+srv://agarwaldeeksha03:YvsvnVCtrP8rYX2R@ecomm-Noor E Adah.3fa8s.mongodb.net/Canx_international?retryWrites=true&w=majority&appName=ecomm-Noor E Adah';
const NEW_DB_URL = 'mongodb+srv://sujal99ds_db_user:DvEHC8z9ApZteyDI@clustercanx.bcazxvt.mongodb.net/?retryWrites=true&w=majority&appName=ClusterCanx';

// Color codes for console output
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

async function connectToDatabases() {
    logSection('STEP 1: Connecting to Databases');

    try {
        // Create separate connections
        log('📡 Connecting to OLD database (source)...', 'cyan');
        const oldDbConnection = await mongoose.createConnection(OLD_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).asPromise();
        log('✅ Connected to OLD database', 'green');

        log('📡 Connecting to NEW database (target)...', 'cyan');
        const newDbConnection = await mongoose.createConnection(NEW_DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }).asPromise();
        log('✅ Connected to NEW database', 'green');

        return { oldDbConnection, newDbConnection };
    } catch (error) {
        log('❌ Connection failed: ' + error.message, 'red');
        throw error;
    }
}

async function getCollectionSchemas(connection) {
    logSection('STEP 2: Analyzing Source Database Schema');

    try {
        const db = connection.db;
        const collections = await db.listCollections().toArray();

        log(`📊 Found ${collections.length} collections in source database:`, 'cyan');
        collections.forEach((col, index) => {
            log(`   ${index + 1}. ${col.name}`, 'yellow');
        });

        return collections.map(col => col.name);
    } catch (error) {
        log('❌ Schema analysis failed: ' + error.message, 'red');
        throw error;
    }
}

async function dropAllCollectionsInTarget(newDbConnection) {
    logSection('STEP 3: Cleaning Target Database');

    try {
        const db = newDbConnection.db;
        const collections = await db.listCollections().toArray();

        if (collections.length === 0) {
            log('ℹ️  Target database is already empty', 'blue');
            return;
        }

        log(`🗑️  Dropping ${collections.length} collections from target database...`, 'yellow');

        for (const col of collections) {
            await db.dropCollection(col.name);
            log(`   ✓ Dropped: ${col.name}`, 'green');
        }

        log('✅ Target database cleaned successfully', 'green');
    } catch (error) {
        log('❌ Cleanup failed: ' + error.message, 'red');
        throw error;
    }
}

async function createEmptyCollections(oldDbConnection, newDbConnection, collectionNames) {
    logSection('STEP 4: Creating Empty Collections in Target Database');

    try {
        const newDb = newDbConnection.db;

        log('📝 Creating collections with proper schemas...', 'cyan');

        for (const collectionName of collectionNames) {
            // Create collection in new database
            await newDb.createCollection(collectionName);
            log(`   ✓ Created: ${collectionName}`, 'green');
        }

        log('✅ All collections created successfully', 'green');
    } catch (error) {
        log('❌ Collection creation failed: ' + error.message, 'red');
        throw error;
    }
}

async function copyAdminData(oldDbConnection, newDbConnection) {
    logSection('STEP 5: Copying Admin Data');

    try {
        const oldDb = oldDbConnection.db;
        const newDb = newDbConnection.db;

        // Check if admins collection exists
        const oldAdmins = await oldDb.collection('admins').find({}).toArray();

        if (oldAdmins.length === 0) {
            log('⚠️  No admin data found in source database', 'yellow');
            log('ℹ️  You will need to create an admin manually using the createAdmin script', 'blue');
            return;
        }

        log(`📋 Found ${oldAdmins.length} admin record(s) in source database`, 'cyan');

        // Copy admin data
        await newDb.collection('admins').insertMany(oldAdmins);
        log(`✅ Copied ${oldAdmins.length} admin record(s) to target database`, 'green');

        // Display admin info (without password)
        oldAdmins.forEach((admin, index) => {
            log(`\n   Admin ${index + 1}:`, 'yellow');
            log(`   - Email: ${admin.email}`, 'cyan');
            log(`   - Name: ${admin.name || 'N/A'}`, 'cyan');
            log(`   - Role: ${admin.role || 'admin'}`, 'cyan');
        });

    } catch (error) {
        log('❌ Admin data copy failed: ' + error.message, 'red');
        throw error;
    }
}

async function verifyMigration(newDbConnection) {
    logSection('STEP 6: Verifying Migration');

    try {
        const db = newDbConnection.db;

        // List all collections
        const collections = await db.listCollections().toArray();
        log(`✓ Total collections created: ${collections.length}`, 'green');

        // Check admin collection
        const adminCount = await db.collection('admins').countDocuments();
        log(`✓ Admin records: ${adminCount}`, 'green');

        // Check other collections are empty
        log('\n📊 Collection Status:', 'cyan');
        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            if (col.name === 'admins') {
                log(`   ✓ ${col.name}: ${count} record(s) [ADMIN DATA]`, 'green');
            } else {
                log(`   ✓ ${col.name}: ${count} record(s) [EMPTY]`, count === 0 ? 'green' : 'yellow');
            }
        }

        log('\n✅ Migration verification complete!', 'green');
    } catch (error) {
        log('❌ Verification failed: ' + error.message, 'red');
        throw error;
    }
}

async function generateEnvironmentFile() {
    logSection('STEP 7: Environment Configuration');

    log('📝 Update your .env file with the new database URL:', 'cyan');
    log('\nOLD:', 'yellow');
    log('MONGO_URI=mongodb+srv://agarwaldeeksha03:YvsvnVCtrP8rYX2R@ecomm-Noor E Adah.3fa8s.mongodb.net/Canx_international?retryWrites=true&w=majority&appName=ecomm-Noor E Adah', 'red');
    log('\nNEW:', 'yellow');
    log('MONGO_URI=mongodb+srv://sujal99ds_db_user:DvEHC8z9ApZteyDI@clustercanx.bcazxvt.mongodb.net/?retryWrites=true&w=majority&appName=ClusterCanx', 'green');
    log('\n⚠️  Remember to update this manually in your .env file!', 'yellow');
}

async function main() {
    console.clear();
    logSection('🚀 DATABASE MIGRATION SCRIPT - Noor E Adah');

    log('Source Database: Canx_international @ ecomm-Noor E Adah (OLD)', 'cyan');
    log('Target Database: ClusterCanx (NEW)', 'magenta');
    log('\n⚠️  WARNING: This will DROP ALL collections in the target database!', 'red');
    log('⚠️  Source database will NOT be modified.', 'yellow');

    // Wait for user confirmation
    log('\n⏳ Starting migration in 3 seconds...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 3000));

    let oldDbConnection = null;
    let newDbConnection = null;

    try {
        // Step 1: Connect to both databases
        const connections = await connectToDatabases();
        oldDbConnection = connections.oldDbConnection;
        newDbConnection = connections.newDbConnection;

        // Step 2: Get collection schemas from source
        const collectionNames = await getCollectionSchemas(oldDbConnection);

        // Step 3: Drop all collections in target
        await dropAllCollectionsInTarget(newDbConnection);

        // Step 4: Create empty collections in target
        await createEmptyCollections(oldDbConnection, newDbConnection, collectionNames);

        // Step 5: Copy admin data
        await copyAdminData(oldDbConnection, newDbConnection);

        // Step 6: Verify migration
        await verifyMigration(newDbConnection);

        // Step 7: Environment file instructions
        await generateEnvironmentFile();

        logSection('✅ MIGRATION COMPLETED SUCCESSFULLY');
        log('Next steps:', 'cyan');
        log('1. Update your .env file with the new MONGO_URI', 'yellow');
        log('2. Test database connection', 'yellow');
        log('3. Verify admin login works', 'yellow');
        log('4. Begin Vendor module rework', 'yellow');

    } catch (error) {
        logSection('❌ MIGRATION FAILED');
        log('Error: ' + error.message, 'red');
        log('\nStack trace:', 'red');
        console.error(error);

        log('\n⚠️  Please check the error and try again.', 'yellow');
        log('⚠️  Your source database has NOT been modified.', 'green');

    } finally {
        // Close connections
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
main();
