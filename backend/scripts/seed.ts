import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from '../src/models/User';
import { Unit } from '../src/models/Unit';

dotenv.config();

const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const MONGODB_URI = process.env.MONGODB_URI;

if (!SEED_ADMIN_EMAIL || !SEED_ADMIN_PASSWORD || !MONGODB_URI) {
  console.error('Missing environment variables for seeding.');
  process.exit(1);
}

const defaultUnits = [
  { name: 'Metro', symbol: 'm', allowsDecimals: true },
  { name: 'Centímetro', symbol: 'cm', allowsDecimals: true },
  { name: 'Kilogramo', symbol: 'kg', allowsDecimals: true },
  { name: 'Gramo', symbol: 'g', allowsDecimals: true },
  { name: 'Litro', symbol: 'L', allowsDecimals: true },
  { name: 'Unidad', symbol: 'u', allowsDecimals: false },
  { name: 'Pieza', symbol: 'pz', allowsDecimals: false },
  { name: 'Par', symbol: 'par', allowsDecimals: false },
  { name: 'Caja', symbol: 'caja', allowsDecimals: false },
  { name: 'Rollo', symbol: 'rollo', allowsDecimals: true },
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to DB for seeding.');

    // 1. Seed Units
    for (const unit of defaultUnits) {
      await Unit.updateOne(
        { name: unit.name },
        { $setOnInsert: unit },
        { upsert: true }
      );
    }
    console.log('✅ Units seeded.');

    // 2. Seed Admin User
    const existingAdmin = await User.findOne({ email: SEED_ADMIN_EMAIL });
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD!, 12);
      await User.create({
        name: 'Administrador Principal',
        email: SEED_ADMIN_EMAIL,
        passwordHash,
        role: 'admin',
        isActive: true,
      });
      console.log('✅ Admin user created.');
    } else {
      console.log('✅ Admin user already exists.');
    }

    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

seed();
