require('dotenv').config({ path: './Backend/.env' });
const mongoose = require('mongoose');
const User = require('./Backend/models/User');
const Order = require('./Backend/models/Order');
const UserPurchase = require('./Backend/models/UserPurchase');

async function checkData() {
  try {
    const mongoURI = process.env.MONGO_URI;
    console.log('Connecting to:', mongoURI);
    await mongoose.connect(mongoURI);
    const userCount = await User.countDocuments();
    const orderCount = await Order.countDocuments();
    const purchaseCount = await UserPurchase.countDocuments();
    
    const users = await User.find().limit(5).lean();
    
    console.log('--- DB Stats ---');
    console.log('Users:', userCount);
    console.log('Orders:', orderCount);
    console.log('UserPurchases:', purchaseCount);
    console.log('--- Sample Users ---');
    users.forEach(u => console.log(`ID: ${u._id}, Name: ${u.name}, Role: ${u.role}, Status: ${u.status}, Type: ${u.userType}`));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
