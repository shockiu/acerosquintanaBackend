import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import '../src/models/Category';
import '../src/models/Unit';
import { Subcategory } from '../src/models/Subcategory';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI');
  process.exit(1);
}

const imagesDir = 'C:\\Users\\galea\\.gemini\\antigravity-ide\\brain\\7a432902-057f-4530-9933-b546f0581359\\scratch\\pdf_images';

// Mapeo detallado de subcategorías a imágenes extraídas del catálogo PDF
const subcategoryImageMap: Record<string, string> = {
  // Tubería
  'Tubo Redondo Decorativo': 'img_02.jpg',
  'Tubo Cuadrado y Rectangular': 'img_01.jpg',

  // Herrajes Vidrio
  'Pisa Vidrios (Glass Clamps)': 'img_03.jpg',
  'Botellas y Copas para Vidrio': 'img_10.jpg',
  'Clips y Conectores de Vidrio': 'img_12.jpg',
  'Distanciadores y Niveladores para Vidrio': 'img_13.jpg',
  'Herrajes para Puertas de Vidrio': 'img_11.jpg',

  // Pasamanos y Conexiones
  'Codos Decorativos': 'img_04.jpg',
  'Bridas y Flanches de Anclaje (Base Plates)': 'img_07.jpg',
  'Copas Decorativas y Tapacubos (Covers)': 'img_08.jpg',
  'Tapas y Remates de Tubo (End Caps)': 'img_06.jpg',
  'Soportes y Articulaciones de Pasamanos (Brackets)': 'img_09.jpg',
  'Soportes de Barra (Bar Holders)': 'img_05.jpg',

  // Abrasivos y Pulitura
  'Discos de Corte y Trozadora': 'img_26.jpg',
  'Ruedas y Discos Flap / Lijado': 'img_17.jpg',
  'Químicos y Pastas de Pulitura': 'img_23.jpg',

  // Taller y Accesorios
  'Herramientas Manuales de Taller': 'img_27.jpg',
  'Herramientas Eléctricas de Corte y Acabado': 'img_19.jpg',
  'Accesorios Varios de Carpintería Metálica': 'img_14.jpg',
  'Insumos Operativos Menores': 'img_15.jpg',
};

async function attachImages() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('✅ Conectado a MongoDB.');

    let updatedCount = 0;

    for (const [subcatName, imgFileName] of Object.entries(subcategoryImageMap)) {
      const imgPath = path.join(imagesDir, imgFileName);
      if (!fs.existsSync(imgPath)) {
        console.warn(`⚠️ Archivo de imagen no encontrado: ${imgPath}`);
        continue;
      }

      const fileBuffer = fs.readFileSync(imgPath);
      const base64DataUri = `data:image/jpeg;base64,${fileBuffer.toString('base64')}`;

      const result = await Subcategory.updateOne(
        { name: subcatName },
        { $set: { imageUrl: base64DataUri } }
      );

      if (result.matchedCount > 0) {
        console.log(`🖼️ [${imgFileName}] -> Subcategoría "${subcatName}" actualizada con éxito.`);
        updatedCount++;
      } else {
        console.warn(`❓ Subcategoría "${subcatName}" no encontrada en la base de datos.`);
      }
    }

    console.log(`\n🎉 Proceso completado: ${updatedCount} subcategorías actualizadas con sus imágenes del catálogo.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al adjuntar imágenes a las subcategorías:', err);
    process.exit(1);
  }
}

attachImages();
