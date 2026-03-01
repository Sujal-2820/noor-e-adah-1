/**
 * Admin Seed Script — Noor E Adah
 * 
 * Seeds the super admin account into MongoDB Atlas.
 * Run with: node scripts/seedAdmin.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// ─── Admin Model (inline to avoid import issues) ────────────────────────────
const adminSchema = new mongoose.Schema({
    adminId: { type: String, unique: true, trim: true, uppercase: true },
    phone: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['super_admin', 'admin', 'manager'], default: 'super_admin' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    otp: { code: String, expiresAt: Date },
    secretKey: { type: String, select: false }, // For admin secret key login
}, { timestamps: true })

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)

// ─── Seed Data ───────────────────────────────────────────────────────────────
const ADMIN_DATA = {
    adminId: 'ADM-101',
    phone: '+919981331303',
    name: 'Noor E Adah Admin',
    role: 'super_admin',
    isActive: true,
    // Password (hashed below) — used for future email/password login
    password: process.env.ADMIN_PASSWORD || 'admin123',
    // Secret key for admin OTP bypass (replaces SMS OTP)
    secretKey: process.env.ADMIN_SECRET_KEY || '123456',
}

async function seed() {
    console.log('\n🌱 Noor E Adah — Admin Seed Script')
    console.log('─'.repeat(45))

    // Connect to MongoDB Atlas
    try {
        console.log('⏳ Connecting to MongoDB Atlas...')
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        })
        console.log('✅ Connected to MongoDB Atlas:', mongoose.connection.host)
    } catch (err) {
        console.error('❌ MongoDB connection failed:', err.message)
        process.exit(1)
    }

    try {
        // Check if admin already exists
        const existing = await mongoose.connection.db
            .collection('admins')
            .findOne({ phone: ADMIN_DATA.phone })

        if (existing) {
            console.log('\n⚠️  Admin already exists with phone:', ADMIN_DATA.phone)
            console.log('   Updating secret key and password...')

            // Update password + secret key
            const hashedPassword = await bcrypt.hash(ADMIN_DATA.password, 12)
            const hashedSecretKey = await bcrypt.hash(ADMIN_DATA.secretKey, 12)

            await mongoose.connection.db.collection('admins').updateOne(
                { phone: ADMIN_DATA.phone },
                {
                    $set: {
                        name: ADMIN_DATA.name,
                        role: ADMIN_DATA.role,
                        isActive: true,
                        password: hashedPassword,
                        secretKey: hashedSecretKey,
                        updatedAt: new Date(),
                    }
                }
            )
            console.log('✅ Admin updated successfully!')
        } else {
            // Create new admin
            console.log('\n⏳ Creating super admin...')

            const hashedPassword = await bcrypt.hash(ADMIN_DATA.password, 12)
            const hashedSecretKey = await bcrypt.hash(ADMIN_DATA.secretKey, 12)

            await mongoose.connection.db.collection('admins').insertOne({
                adminId: ADMIN_DATA.adminId,
                phone: ADMIN_DATA.phone,
                name: ADMIN_DATA.name,
                role: ADMIN_DATA.role,
                isActive: true,
                password: hashedPassword,
                secretKey: hashedSecretKey,
                createdAt: new Date(),
                updatedAt: new Date(),
            })
            console.log('✅ Super admin created successfully!')
        }

        // Print summary
        console.log('\n' + '─'.repeat(45))
        console.log('📋 Admin Account Details:')
        console.log('   Admin ID  :', ADMIN_DATA.adminId)
        console.log('   Phone     :', ADMIN_DATA.phone)
        console.log('   Name      :', ADMIN_DATA.name)
        console.log('   Role      :', ADMIN_DATA.role)
        console.log('   Password  :', ADMIN_DATA.password, '(hashed in DB)')
        console.log('   Secret Key:', ADMIN_DATA.secretKey, '(hashed in DB — use for OTP bypass)')
        console.log('   Status    : Active ✅')
        console.log('─'.repeat(45))
        console.log('\n✅ Seeding complete! You can now login at:')
        console.log('   Phone     :', ADMIN_DATA.phone)
        console.log('   OTP/Secret:', ADMIN_DATA.secretKey)
        console.log()

    } catch (err) {
        console.error('❌ Seeding failed:', err.message)
        process.exit(1)
    } finally {
        await mongoose.disconnect()
        console.log('🔌 Disconnected from MongoDB')
    }
}

seed()
