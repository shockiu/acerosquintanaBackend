import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../src/models/User';
import { Unit } from '../src/models/Unit';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI environment variable.');
  process.exit(1);
}

const isApplyMode = process.argv.includes('--apply');

// Colecciones que BAJO NINGUNA CIRCUNSTANCIA se deben eliminar
const PRESERVED_COLLECTIONS = new Set(['users', 'units']);

// Orden recomendado de limpieza para respetar dependencias lógicas:
// 1. Obras y Solicitudes de cambio
// 2. Movimientos de inventario y Retazos
// 3. Registros de auditoría
// 4. Ítems de inventario
// 5. Subcategorías y Categorías
const PURGE_COLLECTIONS_ORDER = [
  'works',
  'changerequests',
  'inventorymovements',
  'remnants',
  'auditlogs',
  'inventoryitems',
  'subcategories',
  'categories',
];

async function run() {
  try {
    await mongoose.connect(MONGODB_URI!);
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('No database instance found.');
    }

    console.log(`\n================================================================`);
    console.log(`🧹 SCRIPT DE LIMPIEZA DE BASE DE DATOS - ACEROS QUINTANA`);
    console.log(`Modo: ${isApplyMode ? '🔴 APPLY (Eliminación definitiva)' : '🟡 DRY-RUN (Simulación, sin cambios)'}`);
    console.log(`================================================================\n`);

    const allCollections = await db.listCollections().toArray();
    const existingCollectionNames = new Set(allCollections.map((c) => c.name));

    // Determinar colecciones a eliminar
    const collectionsToPurge: string[] = [];
    for (const name of PURGE_COLLECTIONS_ORDER) {
      if (existingCollectionNames.has(name)) {
        collectionsToPurge.push(name);
      }
    }

    // Identificar colecciones no estándar o adicionales que no estén en la whitelist
    for (const col of allCollections) {
      if (!PRESERVED_COLLECTIONS.has(col.name) && !collectionsToPurge.includes(col.name)) {
        collectionsToPurge.push(col.name);
      }
    }

    console.log(`🛡️  COLECCIONES PROTEGIDAS (NO SE TOCARÁN):`);
    for (const name of PRESERVED_COLLECTIONS) {
      const count = existingCollectionNames.has(name)
        ? await db.collection(name).countDocuments()
        : 0;
      console.log(`   🔒 [PRESERVADA] ${name}: ${count} documentos`);
    }

    console.log(`\n🗑️  COLECCIONES A LIMPIAR:`);
    const countsBefore: Record<string, number> = {};
    for (const name of collectionsToPurge) {
      const count = await db.collection(name).countDocuments();
      countsBefore[name] = count;
      console.log(`   ⚠️  [A ELIMINAR] ${name}: ${count} documentos`);
    }

    if (!isApplyMode) {
      console.log(`\n================================================================`);
      console.log(`✨ SIMULACIÓN FINALIZADA. NINGÚN DOCUMENTO FUE ELIMINADO.`);
      console.log(`Para ejecutar la eliminación definitiva, corre:`);
      console.log(`👉 npm run clean:db -- --apply`);
      console.log(`================================================================\n`);
      process.exit(0);
    }

    // Modo APPLY: Proceder con la eliminación
    console.log(`\n🚀 Iniciando eliminación de documentos...`);
    for (const name of collectionsToPurge) {
      if (PRESERVED_COLLECTIONS.has(name)) {
        throw new Error(`CRITICAL ABORT: Se intentó eliminar la colección protegida "${name}"!`);
      }
      const deleteResult = await db.collection(name).deleteMany({});
      console.log(`   ✅ Limpiada colección "${name}": ${deleteResult.deletedCount} eliminados.`);
    }

    // Verificación post-limpieza
    console.log(`\n--- VERIFICACIÓN POST-LIMPIEZA ---`);
    for (const name of collectionsToPurge) {
      const count = await db.collection(name).countDocuments();
      console.log(`   - ${name}: ${count} documentos (esperado: 0)`);
    }

    const usersCount = await User.countDocuments();
    const unitsCount = await Unit.countDocuments();
    console.log(`\n--- ESTADO DE COLECCIONES PRESERVADAS ---`);
    console.log(`   🔒 users: ${usersCount} documentos intactos`);
    console.log(`   🔒 units: ${unitsCount} documentos intactos`);

    console.log(`\n================================================================`);
    console.log(`🎉 LIMPIEZA COMPLETADA CON ÉXITO.`);
    console.log(`La base de datos está lista para ejecutar el catálogo de inventario:`);
    console.log(`👉 npm run seed:catalog -- --apply`);
    console.log(`================================================================\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la limpieza de la BD:', error);
    process.exit(1);
  }
}

run();
