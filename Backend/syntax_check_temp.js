try {
    console.log("Checking models/VendorNotification...");
    require('./models/VendorNotification');
    console.log("Checking models/SellerNotification...");
    require('./models/SellerNotification');

    console.log("Checking controllers/userController...");
    require('./controllers/userController');

    console.log("Checking controllers/adminController...");
    require('./controllers/adminController');

    console.log("Checking services/earningsService...");
    require('./services/earningsService');

    console.log("✅ ALL FILES LOADED SUCCESSFULLY. SYNTAX IS CORRECT.");
} catch (e) {
    console.error("❌ SYNTAX/IMPORT ERROR DETECTED:");
    console.error(e);
    process.exit(1);
}
