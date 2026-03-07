const mongoose = require('mongoose');
const Product = require('../models/Product');

async function checkProducts() {
  try {
    await mongoose.connect('mongodb+srv://nooreadah5_db_user:c5yFgmliZjH88quQ@nooreadah.hfuemub.mongodb.net/?appName=NoorEAdah');
    console.log('Connected to DB');

    const products = await Product.find({}).select('name publicPrice discountPublic discountUser sizes').lean();
    console.log('--- Products ---');
    products.forEach(p => {
      console.log(`Name: ${p.name}`);
      console.log(`Public Price: ${p.publicPrice}`);
      console.log(`Discount (Public): ${p.discountPublic}%`);
      if (p.sizes && p.sizes.length > 0) {
        console.log(`Sizes found: ${p.sizes.length}`);
        p.sizes.forEach(s => {
            console.log(`  Size ${s.label}: price=${s.price}, discount=${s.discountPublic}%`);
        });
      }
      console.log('----------------');
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkProducts();
