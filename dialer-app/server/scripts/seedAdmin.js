// Seed or update the admin user in production or dev database
// Usage: node scripts/seedAdmin.js

(async () => {
  try {
    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');

    const { MONGODB_URI } = process.env;
    if (!MONGODB_URI) {
      console.error('❌  MONGODB_URI not set');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    const User = mongoose.model(
      'User',
      new mongoose.Schema({}, { strict: false })
    );

    const email = 'admin@crokodial.com';
    const plainPassword = 'admin123';
    const hashed = await bcrypt.hash(plainPassword, 10);

    const admin = await User.findOneAndUpdate(
      { email: new RegExp('^' + email + '$', 'i') },
      {
        email,
        password: hashed,
        name: 'Admin',
        role: 'admin',
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    console.log('✅  Upserted admin user:', admin);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌  Seed admin failed:', err);
    process.exit(1);
  }
})(); 