const mongoose = require('mongoose');

/**
 * MongoDB Connection Configuration
 *
 * If you see ECONNREFUSED or ENOTFOUND errors, your Atlas cluster is likely:
 *   1. Paused — go to https://cloud.mongodb.com and Resume it, OR
 *   2. IP not whitelisted — add your IP (or 0.0.0.0/0) in Atlas > Network Access
 */

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY_MS = 3000;

const connectDB = async (retryCount = 0) => {
  const mongoURI = process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  const options = {
    maxPoolSize: 10,
    // Increased to 30s — gives Atlas paused clusters time to resume
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    w: 'majority',
    retryWrites: true,
  };

  try {
    await mongoose.connect(mongoURI, options);
    console.log('✅ MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed via app termination');
      process.exit(0);
    });

  } catch (error) {
    const code = error.code || (error.cause && error.cause.code) || '';
    const isNetworkError = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].some(c => error.message.includes(c) || code === c);

    if (isNetworkError) {
      console.error(`\n❌ MongoDB DNS/Network error: ${error.message}`);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('  Possible causes:');
      console.error('  1. Atlas cluster is PAUSED → visit https://cloud.mongodb.com and Resume it');
      console.error('  2. Your IP is not whitelisted → Atlas > Network Access > Add IP');
      console.error('  3. No internet connection');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } else {
      console.error('❌ MongoDB connection failed:', error.message);
    }

    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.log(`⏳ Retrying MongoDB connection in ${delay / 1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectDB(retryCount + 1);
    }

    throw error;
  }
};

module.exports = { connectDB };
