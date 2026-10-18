import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User';
import { Unit } from '../src/models/Unit';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

async function inspect() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('Connected to MongoDB.');
    const db = mongoose.connection.db;
    if (!db) {
      console.error('No db instance available');
      process.exit(1);
    }
    const collections = await db.listCollections().toArray();
    console.log(`\n--- COLECCIONES ENCONTRADAS (${collections.length}) ---`);
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(` - ${col.name}: ${count} documentos`);
    }

    console.log(`\n--- USUARIOS ACTUALES ---`);
    const users = await User.find({}, 'name email role isActive');
    users.forEach(u => console.log(` - ${u.name} | ${u.email} | Rol: ${u.role} | Activo: ${u.isActive}`));

    console.log(`\n--- UNIDADES DE MEDIDA ACTUALES ---`);
    const units = await Unit.find({}, 'name symbol allowsDecimals');
    units.forEach(u => console.log(` - ${u.name} (${u.symbol}) [Permite decimales: ${u.allowsDecimals}]`));

    const { InventoryItem } = await import('../src/models/InventoryItem');
    const itemsCount = await InventoryItem.countDocuments();
    const pricedItems = await InventoryItem.find({ avgUnitCost: { $gt: 0 } });
    console.log(`\n--- ESTADO DE ÍTEMS DE INVENTARIO ---`);
    console.log(` - Total de ítems: ${itemsCount}`);
    console.log(` - Ítems con precio/costo asignado (> 0): ${pricedItems.length}`);
    console.log(`\nMuestra de ítems con precio asignado:`);
    const sample = await InventoryItem.find().limit(8);
    sample.forEach(i => console.log(`   * ${i.name} -> Stock: ${i.stock} | Detal: $${i.avgUnitCost}`));

    process.exit(0);
  } catch (err) {
    console.error('Inspection failed:', err);
    process.exit(1);
  }
}

inspect();
