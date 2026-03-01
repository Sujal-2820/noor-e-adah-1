/**
 * CREATE GEOSPATIAL INDEX FOR VENDOR LOCATION
 * Ensures 500m radius queries work efficiently
 */

const mongoose = require('mongoose');
require('dotenv').config();

const createGeospatialIndex = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✓ Connected to database');

        const db = mongoose.connection.db;
        const vendorsCollection = db.collection('vendors');

        // Check existing indexes
        console.log('\nChecking existing indexes on vendors collection...');
        const existingIndexes = await vendorsCollection.indexes();
        console.log('Existing indexes:', existingIndexes.map(idx => idx.name).join(', '));

        // Check if 2dsphere index already exists
        const has2dsphere = existingIndexes.some(idx =>
            idx.key && idx.key['location.coordinates'] === '2dsphere'
        );

        if (has2dsphere) {
            console.log('\n✓ Geospatial index already exists on location.coordinates');
        } else {
            console.log('\nCreating 2dsphere index on location.coordinates...');

            const result = await vendorsCollection.createIndex(
                { 'location.coordinates': '2dsphere' },
                { name: 'location_coordinates_2dsphere' }
            );

            console.log(`✓ Index created successfully: ${result}`);
        }

        // Verify index
        console.log('\nVerifying index creation...');
        const finalIndexes = await vendorsCollection.indexes();
        const geoIndex = finalIndexes.find(idx =>
            idx.key && idx.key['location.coordinates'] === '2dsphere'
        );

        if (geoIndex) {
            console.log('✓ Geospatial index verified:');
            console.log('  Name:', geoIndex.name);
            console.log('  Key:', JSON.stringify(geoIndex.key));
            console.log('\n✓ 500m vendor radius queries will now work efficiently!');
        } else {
            console.log('✗ Index verification failed');
        }

        await mongoose.disconnect();
        console.log('\n✓ Database disconnected');
        console.log('\n========================================');
        console.log('GEOSPATIAL INDEX SETUP - COMPLETED');
        console.log('========================================');

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
};

createGeospatialIndex();
