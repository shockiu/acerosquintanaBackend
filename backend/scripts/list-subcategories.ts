import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../src/models/Category';
import '../src/models/Unit';
import { Subcategory } from '../src/models/Subcategory';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || '');
  const subcategories = await Subcategory.find().populate('category').sort({ name: 1 });
  console.log(`Found ${subcategories.length} subcategories:`);
  for (const s of subcategories) {
    const cat = (s.category as any)?.name || 'Sin categoría';
    console.log(`- "${s.name}" | Cat: "${cat}" | Kind: "${s.kind}" | Image: ${s.imageUrl ? 'YES' : 'NO'}`);
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
