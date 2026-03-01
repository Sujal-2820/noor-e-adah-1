try {
    require('./controllers/userController');
    console.log("✅ USER CONTROLLER VALID");
} catch (e) {
    console.error(e);
    process.exit(1);
}
