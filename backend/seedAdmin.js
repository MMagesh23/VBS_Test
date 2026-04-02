require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');

const seedAdmin = async () => {
  await connectDB();

  const adminUserID = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@presenceofjesus.org';

  try {
    const existing = await User.findOne({ role: 'admin' });
    if (existing) {
      console.log(`✅ Admin account already exists: ${existing.userID}`);
      console.log('   To reset, manually delete the admin document from MongoDB.');
      process.exit(0);
    }

    const admin = await User.create({
      userID: adminUserID.toLowerCase(),
      password: adminPassword,
      role: 'admin',
      name: adminName,
      email: adminEmail,
      isActive: true,
      mustChangePassword: true,
    });

    console.log('\n🎉 Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Username : ${admin.userID}`);
    console.log(`   Password : ${adminPassword}`);
    console.log(`   Name     : ${admin.name}`);
    console.log(`   Role     : ${admin.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  You will be prompted to change your password on first login.\n');
  } catch (err) {
    console.error('❌ Failed to create admin:', err.message);
    process.exit(1);
  }

  await mongoose.connection.close();
  process.exit(0);
};

seedAdmin();