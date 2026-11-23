require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');

const seedAdmin = async () => {
  if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
    console.error('❌ Set ADMIN_PASSWORD to a value of at least 12 characters before seeding.');
    process.exit(1);
  }
  await connectDB();

  const adminUserID = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;
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
    console.log(`   Name     : ${admin.name}`);
    console.log(`   Role     : ${admin.role}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('⚠️  The administrator must change this password after first login.\n');
  } catch (err) {
    console.error('❌ Failed to create admin:', err.message);
    process.exit(1);
  }

  await mongoose.connection.close();
  process.exit(0);
};

seedAdmin();