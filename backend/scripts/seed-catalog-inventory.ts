import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Category } from '../src/models/Category';
import { Subcategory } from '../src/models/Subcategory';
import { InventoryItem } from '../src/models/InventoryItem';
import { Unit } from '../src/models/Unit';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI environment variable.');
  process.exit(1);
}

const isApplyMode = process.argv.includes('--apply');

// 1. Definición de Categorías Oficiales
const categoriesData = [
  { name: 'Tubería de Acero Inoxidable', description: 'Tubos redondos, cuadrados y rectangulares para carpintería metálica y pasamanos' },
  { name: 'Accesorios y Herrajes para Vidrio', description: 'Pisa vidrios, clips, distanciadores, botellas y herrajes para puertas de cristal' },
  { name: 'Accesorios y Conexiones para Pasamanos', description: 'Codos, bridas, copas decorativas, tapas y soportes de pasamanos' },
  { name: 'Abrasivos y Químicos de Pulitura', description: 'Discos de corte, desbaste, ruedas flap, lijas y pastas pulidoras' },
  { name: 'Fijaciones y Herrajes Generales', description: 'Tornillería inoxidable, tuercas, remaches, bisagras y correderas' },
  { name: 'Equipos y Maquinaria de Taller', description: 'Máquinas de soldar, esmeriles, pulidoras y herramientas eléctricas de taller' },
  { name: 'Herramientas Manuales e Insumos de Taller', description: 'Llaves, alicates, destornilladores, logística e insumos menores' },
];

// 2. Definición de Subcategorías Oficiales
interface SubcategoryDef {
  categoryName: string;
  name: string;
  unitName: string;
  kind: 'material' | 'tool';
}

const subcategoriesData: SubcategoryDef[] = [
  // Tubería
  { categoryName: 'Tubería de Acero Inoxidable', name: 'Tubo Redondo Decorativo', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Tubería de Acero Inoxidable', name: 'Tubo Cuadrado y Rectangular', unitName: 'Pieza', kind: 'material' },

  // Herrajes Vidrio
  { categoryName: 'Accesorios y Herrajes para Vidrio', name: 'Pisa Vidrios (Glass Clamps)', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Accesorios y Herrajes para Vidrio', name: 'Botellas y Copas para Vidrio', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Accesorios y Herrajes para Vidrio', name: 'Clips y Conectores de Vidrio', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Accesorios y Herrajes para Vidrio', name: 'Distanciadores y Niveladores para Vidrio', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Accesorios y Herrajes para Vidrio', name: 'Herrajes para Puertas de Vidrio', unitName: 'Pieza', kind: 'material' },

  // Pasamanos
  { categoryName: 'Accesorios y Conexiones para Pasamanos', name: 'Codos Decorativos', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Accesorios y Conexiones para Pasamanos', name: 'Bridas y Flanches de Anclaje (Base Plates)', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Accesorios y Conexiones para Pasamanos', name: 'Copas Decorativas y Tapacubos (Covers)', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Accesorios y Conexiones para Pasamanos', name: 'Tapas y Remates de Tubo (End Caps)', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Accesorios y Conexiones para Pasamanos', name: 'Soportes y Articulaciones de Pasamanos (Brackets)', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Accesorios y Conexiones para Pasamanos', name: 'Soportes de Barra (Bar Holders)', unitName: 'Pieza', kind: 'material' },

  // Abrasivos
  { categoryName: 'Abrasivos y Químicos de Pulitura', name: 'Discos de Corte y Trozadora', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Abrasivos y Químicos de Pulitura', name: 'Ruedas y Discos Flap / Lijado', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Abrasivos y Químicos de Pulitura', name: 'Químicos y Pastas de Pulitura', unitName: 'Pieza', kind: 'material' },

  // Fijaciones
  { categoryName: 'Fijaciones y Herrajes Generales', name: 'Tornillería, Tuercas y Remaches', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Fijaciones y Herrajes Generales', name: 'Bisagras y Correderas Generales', unitName: 'Pieza', kind: 'material' },
  { categoryName: 'Fijaciones y Herrajes Generales', name: 'Accesorios Varios de Carpintería Metálica', unitName: 'Pieza', kind: 'material' },

  // Equipos y Maquinaria
  { categoryName: 'Equipos y Maquinaria de Taller', name: 'Equipos de Soldadura y Gases', unitName: 'Pieza', kind: 'tool' },
  { categoryName: 'Equipos y Maquinaria de Taller', name: 'Herramientas Eléctricas de Corte y Acabado', unitName: 'Pieza', kind: 'tool' },
  { categoryName: 'Equipos y Maquinaria de Taller', name: 'Herramientas Eléctricas de Perforación', unitName: 'Pieza', kind: 'tool' },

  // Herramientas Manuales
  { categoryName: 'Herramientas Manuales e Insumos de Taller', name: 'Herramientas Manuales de Taller', unitName: 'Pieza', kind: 'tool' },
  { categoryName: 'Herramientas Manuales e Insumos de Taller', name: 'Equipamiento de Logística y Taller', unitName: 'Pieza', kind: 'tool' },
  { categoryName: 'Herramientas Manuales e Insumos de Taller', name: 'Insumos Operativos Menores', unitName: 'Pieza', kind: 'material' },
];

// 3. Definición de Ítems (Consumibles y Herramientas)
interface ItemDef {
  name: string;
  subcategoryName: string;
  kind: 'material' | 'tool';
  stock: number;
  avgUnitCost?: number;
  hasPieceSpec?: boolean;
  pieceSize?: number;
  minUsableMeasure?: number;
  notes?: string;
}

const itemsData: ItemDef[] = [
  // --- GRUPO A: TUBERÍA (Precios Detal sin IVA del catálogo) ---
  { name: 'Tubo Redondo 2" × 1.5mm × 6000mm (SS304)', subcategoryName: 'Tubo Redondo Decorativo', kind: 'material', stock: 79, avgUnitCost: 85, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Redondo 1.1/2" × 1.5mm × 6000mm (SS304)', subcategoryName: 'Tubo Redondo Decorativo', kind: 'material', stock: 80, avgUnitCost: 62, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Redondo 1.1/2" × 1.5mm × 6000mm (SS316)', subcategoryName: 'Tubo Redondo Decorativo', kind: 'material', stock: 2, avgUnitCost: 75, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3, notes: 'Ajuste inicial a verificar' },
  { name: 'Tubo Redondo 1" × 1.5mm × 6000mm (SS304)', subcategoryName: 'Tubo Redondo Decorativo', kind: 'material', stock: 34, avgUnitCost: 40, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Redondo 1/2" × 1.2mm × 6000mm (SS304)', subcategoryName: 'Tubo Redondo Decorativo', kind: 'material', stock: 232, avgUnitCost: 18, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Redondo 3" × 1.5mm × 6000mm (SS304)', subcategoryName: 'Tubo Redondo Decorativo', kind: 'material', stock: 2, avgUnitCost: 153, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Redondo 4" × 1.5mm × 6000mm (SS304)', subcategoryName: 'Tubo Redondo Decorativo', kind: 'material', stock: 1, avgUnitCost: 205, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Redondo 2.1/2" × 1.5mm × 6000mm (SS304)', subcategoryName: 'Tubo Redondo Decorativo', kind: 'material', stock: 1, avgUnitCost: 128, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Rectangular 80×40 × 2.0mm × 6000mm', subcategoryName: 'Tubo Cuadrado y Rectangular', kind: 'material', stock: 3, avgUnitCost: 189, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Cuadrado 2"×2" × 1.5mm × 6000mm (SS304)', subcategoryName: 'Tubo Cuadrado y Rectangular', kind: 'material', stock: 9, avgUnitCost: 112, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Cuadrado 1.1/2"×1.1/2" × 1.5mm × 6000mm', subcategoryName: 'Tubo Cuadrado y Rectangular', kind: 'material', stock: 8, avgUnitCost: 88, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Cuadrado 1"×1" × 1.5mm × 6000mm (SS304)', subcategoryName: 'Tubo Cuadrado y Rectangular', kind: 'material', stock: 1, avgUnitCost: 60, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Cuadrado 3/4"×3/4" × 1.2mm × 6000mm (SS304)', subcategoryName: 'Tubo Cuadrado y Rectangular', kind: 'material', stock: 4, avgUnitCost: 38, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },
  { name: 'Tubo Rectangular 2"×1" × 1.5mm × 6000mm (SS304)', subcategoryName: 'Tubo Cuadrado y Rectangular', kind: 'material', stock: 0, avgUnitCost: 87, hasPieceSpec: true, pieceSize: 6, minUsableMeasure: 0.3 },

  // --- GRUPO B: ACCESORIOS VIDRIO ---
  { name: 'Pisa Vidrio Grande Base Plana SS304', subcategoryName: 'Pisa Vidrios (Glass Clamps)', kind: 'material', stock: 82, avgUnitCost: 7 },
  { name: 'Pisa Vidrio Cuadrado Base Plana SS304', subcategoryName: 'Pisa Vidrios (Glass Clamps)', kind: 'material', stock: 8, avgUnitCost: 7 },
  { name: 'Pisa Vidrio Grande Base Curva (Tubo 2")', subcategoryName: 'Pisa Vidrios (Glass Clamps)', kind: 'material', stock: 16, avgUnitCost: 7 },
  { name: 'Pisa Vidrio Cuadrado Base Plana Pequeño', subcategoryName: 'Pisa Vidrios (Glass Clamps)', kind: 'material', stock: 3, avgUnitCost: 7 },
  { name: 'Pisa Vidrio Extra Grande Base Curva', subcategoryName: 'Pisa Vidrios (Glass Clamps)', kind: 'material', stock: 40, avgUnitCost: 8 },
  { name: 'Pisa Vidrio Neo Pequeño SS304', subcategoryName: 'Pisa Vidrios (Glass Clamps)', kind: 'material', stock: 30, avgUnitCost: 7 },
  { name: 'Pisa Vidrio Grande Cuadrado Base Curva', subcategoryName: 'Pisa Vidrios (Glass Clamps)', kind: 'material', stock: 12, avgUnitCost: 7 },
  { name: 'Pisa Vidrio Mediano Base Curva (Tubo 1 1/2")', subcategoryName: 'Pisa Vidrios (Glass Clamps)', kind: 'material', stock: 20, avgUnitCost: 7 },
  { name: 'Botella / Copa Grande Soporte Vidrio', subcategoryName: 'Botellas y Copas para Vidrio', kind: 'material', stock: 20, avgUnitCost: 10 },
  { name: 'Botella / Copa Pequeña Soporte Vidrio', subcategoryName: 'Botellas y Copas para Vidrio', kind: 'material', stock: 24, avgUnitCost: 8 },
  { name: 'Clip 45° Grande Sujeción Vidrio', subcategoryName: 'Clips y Conectores de Vidrio', kind: 'material', stock: 1, avgUnitCost: 7 },
  { name: 'Clip 45° Pequeño Sujeción Vidrio', subcategoryName: 'Clips y Conectores de Vidrio', kind: 'material', stock: 2, avgUnitCost: 6 },
  { name: 'Clip Rectangular Vidrio a Vidrio', subcategoryName: 'Clips y Conectores de Vidrio', kind: 'material', stock: 1, avgUnitCost: 7 },
  { name: 'Clip 45° Pequeño Vidrio a Vidrio', subcategoryName: 'Clips y Conectores de Vidrio', kind: 'material', stock: 2, avgUnitCost: 6 },
  { name: 'Clip 45° Fijo Grande Vidrio', subcategoryName: 'Clips y Conectores de Vidrio', kind: 'material', stock: 2, avgUnitCost: 7 },
  { name: 'Clip Paño Fijo Sencillo Tipo Espejo', subcategoryName: 'Clips y Conectores de Vidrio', kind: 'material', stock: 4, avgUnitCost: 5 },
  { name: 'Soporte Graduable Vidrio a Pared sin Tapa', subcategoryName: 'Clips y Conectores de Vidrio', kind: 'material', stock: 18, avgUnitCost: 9 },
  { name: 'Distanciador Glass Standoff 1 1/2" × 40mm', subcategoryName: 'Distanciadores y Niveladores para Vidrio', kind: 'material', stock: 75, avgUnitCost: 10 },
  { name: 'Distanciador 1 1/2" con Tornillo Allen', subcategoryName: 'Distanciadores y Niveladores para Vidrio', kind: 'material', stock: 15, avgUnitCost: 10 },
  { name: 'Distanciador Glass Standoff 1"', subcategoryName: 'Distanciadores y Niveladores para Vidrio', kind: 'material', stock: 4, avgUnitCost: 8 },
  { name: 'Nivelador de 2" para Vidrio', subcategoryName: 'Distanciadores y Niveladores para Vidrio', kind: 'material', stock: 43, avgUnitCost: 9 },
  { name: 'Nivelador Pequeño Vidrio a Vidrio', subcategoryName: 'Distanciadores y Niveladores para Vidrio', kind: 'material', stock: 51, avgUnitCost: 7 },
  { name: 'Nivelador de 1 1/2" para Vidrio', subcategoryName: 'Distanciadores y Niveladores para Vidrio', kind: 'material', stock: 19, avgUnitCost: 8 },
  { name: 'Bisagra Acero Inoxidable Pared a Vidrio', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 1, avgUnitCost: 15 },
  { name: 'Bisagra Acero Pared a Vidrio Negra', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 18, avgUnitCost: 18 },
  { name: 'Bisagra Pared a Vidrio Satinada', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 4, avgUnitCost: 15 },
  { name: 'Pomo / Tirador Doble Puerta Vidrio', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 15, avgUnitCost: 16 },
  { name: 'Pomo / Tirador Puerta Vidrio Negro', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 11, avgUnitCost: 18 },
  { name: 'Pomo / Tirador Negro Pequeño', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 7, avgUnitCost: 10 },
  { name: 'Freno Superficial Hidráulico para Puerta', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 1, avgUnitCost: 45 },
  { name: 'Cerradura Tipo Cacho de Vaca Vidrio', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 1, avgUnitCost: 25 },
  { name: 'Manilla de Embutir para Puerta Vidrio', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 14, avgUnitCost: 14 },
  { name: 'Imán de Retención para Puerta', subcategoryName: 'Herrajes para Puertas de Vidrio', kind: 'material', stock: 23, avgUnitCost: 6 },

  // --- GRUPO C: ACCESORIOS PASAMANOS ---
  { name: 'Codo Liso 90° para Tubo 2" SS304', subcategoryName: 'Codos Decorativos', kind: 'material', stock: 18, avgUnitCost: 5 },
  { name: 'Codo Liso 90° para Tubo 1 1/2" SS304', subcategoryName: 'Codos Decorativos', kind: 'material', stock: 22, avgUnitCost: 4 },
  { name: 'Codo de Embutir 90° Tubo 1 1/2"', subcategoryName: 'Codos Decorativos', kind: 'material', stock: 3, avgUnitCost: 4 },
  { name: 'Codo Articulado Regulable Tubo 1 1/2"', subcategoryName: 'Codos Decorativos', kind: 'material', stock: 9, avgUnitCost: 6 },
  { name: 'Codo Articulado para Tubo 1/2"', subcategoryName: 'Codos Decorativos', kind: 'material', stock: 46, avgUnitCost: 4 },
  { name: 'Codo Decorativo 90° para Tubo Cuadrado', subcategoryName: 'Codos Decorativos', kind: 'material', stock: 50, avgUnitCost: 6 },
  { name: 'Flanche Anclaje Lateral Tubo 1 1/2"', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 0, avgUnitCost: 4, notes: 'Ajuste requerido' },
  { name: 'Flanche Base con Hueco para Tubo 2"', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 100, avgUnitCost: 3.5 },
  { name: 'Flanche Base 2" Diámetro 90mm', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 73, avgUnitCost: 3.5 },
  { name: 'Flanche Base 1 1/2" Diámetro 85mm', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 0, avgUnitCost: 3.5, notes: 'Ajuste requerido' },
  { name: 'Flanche Base 1 1/2" Diámetro 90mm', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 25, avgUnitCost: 3.5 },
  { name: 'Flanche Base 1 1/2" Diámetro 95mm', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 105, avgUnitCost: 3.5 },
  { name: 'Flanche Base 1 1/2" Espesor 3mm', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 70, avgUnitCost: 3.5 },
  { name: 'Flanche Liso Espesor 5mm × 95mm', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 46, avgUnitCost: 4 },
  { name: 'Flanche Liso Espesor 3mm × 95mm', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 15, avgUnitCost: 3.5 },
  { name: 'Flanche Pequeño para Tubo 1 1/2"', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 38, avgUnitCost: 3 },
  { name: 'Flanche Decorativo para Tubo 1 1/2"', subcategoryName: 'Bridas y Flanches de Anclaje (Base Plates)', kind: 'material', stock: 37, avgUnitCost: 3.5 },
  { name: 'Copa Decorativa (Cover) 1 1/2" × 85mm', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 59, avgUnitCost: 2 },
  { name: 'Copa Decorativa 1 1/2" Calidad SS316', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 20, avgUnitCost: 3 },
  { name: 'Copa Decorativa Pequeña 1 1/2"', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 263, avgUnitCost: 2 },
  { name: 'Copa Pequeña 1 1/2" Estampada', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 35, avgUnitCost: 2 },
  { name: 'Copa Decorativa (Cover) 2" × 90mm', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 96, avgUnitCost: 2 },
  { name: 'Copa Decorativa 2" Pequeña', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 98, avgUnitCost: 2 },
  { name: 'Copa Decorativa 2" Grande 120mm', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 110, avgUnitCost: 3 },
  { name: 'Copa Pequeña para Tubo 1/2"', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 25, avgUnitCost: 1.5 },
  { name: 'Copa Pequeña Ciega', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 20, avgUnitCost: 1.5 },
  { name: 'Copa Pequeña para Tubo 1 5/8"', subcategoryName: 'Copas Decorativas y Tapacubos (Covers)', kind: 'material', stock: 31, avgUnitCost: 2 },
  { name: 'Tapa Abombada (End Cap) Tubo 2"', subcategoryName: 'Tapas y Remates de Tubo (End Caps)', kind: 'material', stock: 263, avgUnitCost: 2 },
  { name: 'Tapa Abombada (End Cap) Tubo 1 1/2"', subcategoryName: 'Tapas y Remates de Tubo (End Caps)', kind: 'material', stock: 13, avgUnitCost: 2 },
  { name: 'Tapa Ciega Plana para Tubo 1 5/8"', subcategoryName: 'Tapas y Remates de Tubo (End Caps)', kind: 'material', stock: 15, avgUnitCost: 2 },
  { name: 'Arandela / Tapa Anillo Tubo 2"', subcategoryName: 'Tapas y Remates de Tubo (End Caps)', kind: 'material', stock: 210, avgUnitCost: 2 },
  { name: 'Arandela / Tapa Anillo Tubo 1 1/2"', subcategoryName: 'Tapas y Remates de Tubo (End Caps)', kind: 'material', stock: 190, avgUnitCost: 2 },
  { name: 'Bracket / Lápiz Articulado Tubo 1 1/2"', subcategoryName: 'Soportes y Articulaciones de Pasamanos (Brackets)', kind: 'material', stock: 184, avgUnitCost: 8 },
  { name: 'Bracket / Lápiz Articulado Tubo 2"', subcategoryName: 'Soportes y Articulaciones de Pasamanos (Brackets)', kind: 'material', stock: 46, avgUnitCost: 9 },
  { name: 'Bracket / Lápiz Articulado Ajustable', subcategoryName: 'Soportes y Articulaciones de Pasamanos (Brackets)', kind: 'material', stock: 24, avgUnitCost: 9 },
  { name: 'Soporte Conector Pasamano a Vidrio', subcategoryName: 'Soportes y Articulaciones de Pasamanos (Brackets)', kind: 'material', stock: 50, avgUnitCost: 9 },
  { name: 'Soporte Ajustable Pasamano a Vidrio', subcategoryName: 'Soportes y Articulaciones de Pasamanos (Brackets)', kind: 'material', stock: 24, avgUnitCost: 9 },
  { name: 'Soporte Brida Pasamano a Pared', subcategoryName: 'Soportes y Articulaciones de Pasamanos (Brackets)', kind: 'material', stock: 0, avgUnitCost: 9, notes: 'Ajuste requerido' },
  { name: 'Bar Holder Pasante 1/2"', subcategoryName: 'Soportes de Barra (Bar Holders)', kind: 'material', stock: 0, avgUnitCost: 3.5, notes: 'Ajuste requerido' },
  { name: 'Bar Holder Pasante 5/8"', subcategoryName: 'Soportes de Barra (Bar Holders)', kind: 'material', stock: 239, avgUnitCost: 3.5 },

  // --- GRUPO D: ABRASIVOS Y QUÍMICOS ---
  { name: 'Disco de Corte Extra Fino 4 1/2"', subcategoryName: 'Discos de Corte y Trozadora', kind: 'material', stock: 317, avgUnitCost: 2 },
  { name: 'Disco de Corte Grueso 7" Acero', subcategoryName: 'Discos de Corte y Trozadora', kind: 'material', stock: 82, avgUnitCost: 3.5 },
  { name: 'Disco de Corte Fino 7" Inox', subcategoryName: 'Discos de Corte y Trozadora', kind: 'material', stock: 98, avgUnitCost: 3.5 },
  { name: 'Disco para Trozadora 12"', subcategoryName: 'Discos de Corte y Trozadora', kind: 'material', stock: 41, avgUnitCost: 8 },
  { name: 'Disco para Trozadora 14"', subcategoryName: 'Discos de Corte y Trozadora', kind: 'material', stock: 13, avgUnitCost: 10 },
  { name: 'Disco Flap para Esmeril Grano #40', subcategoryName: 'Ruedas y Discos Flap / Lijado', kind: 'material', stock: 212, avgUnitCost: 2 },
  { name: 'Rueda Flap Satinadora Grano #60', subcategoryName: 'Ruedas y Discos Flap / Lijado', kind: 'material', stock: 13, avgUnitCost: 2 },
  { name: 'Rueda Flap Satinadora Grano #80', subcategoryName: 'Ruedas y Discos Flap / Lijado', kind: 'material', stock: 3, avgUnitCost: 2 },
  { name: 'Rueda Flap Satinadora Grano #120', subcategoryName: 'Ruedas y Discos Flap / Lijado', kind: 'material', stock: 1, avgUnitCost: 2 },
  { name: 'Rueda Flap Satinadora Grano #150', subcategoryName: 'Ruedas y Discos Flap / Lijado', kind: 'material', stock: 1, avgUnitCost: 2 },
  { name: 'Rueda Flap Satinadora Grano #240', subcategoryName: 'Ruedas y Discos Flap / Lijado', kind: 'material', stock: 2, avgUnitCost: 2 },
  { name: 'Respaldo / Disco de Goma para Esmeril', subcategoryName: 'Ruedas y Discos Flap / Lijado', kind: 'material', stock: 8, avgUnitCost: 4 },
  { name: 'Banda de Lija para Pulidora Satinadora', subcategoryName: 'Ruedas y Discos Flap / Lijado', kind: 'material', stock: 10, avgUnitCost: 3, notes: 'Lote variado' },
  { name: 'Lijas Manuales Pliego', subcategoryName: 'Ruedas y Discos Flap / Lijado', kind: 'material', stock: 20, avgUnitCost: 1, notes: 'Lote a inventariar' },
  { name: 'Químico Pulidor Acero Brill en Polvo', subcategoryName: 'Químicos y Pastas de Pulitura', kind: 'material', stock: 25, avgUnitCost: 12 },
  { name: 'Químico Pulidor Acero Brill Líquido', subcategoryName: 'Químicos y Pastas de Pulitura', kind: 'material', stock: 20, avgUnitCost: 12 },

  // --- GRUPO E: FIJACIONES Y ACCESORIOS GENERALES ---
  { name: 'Cajas de Remaches de Impacto', subcategoryName: 'Tornillería, Tuercas y Remaches', kind: 'material', stock: 6, avgUnitCost: 12 },
  { name: 'Caja de Tornillos Azules Tapcon 2 1/4"', subcategoryName: 'Tornillería, Tuercas y Remaches', kind: 'material', stock: 5, avgUnitCost: 15 },
  { name: 'Caja de Tornillos 3/16" × 1/4"', subcategoryName: 'Tornillería, Tuercas y Remaches', kind: 'material', stock: 2, avgUnitCost: 10 },
  { name: 'Tornillos de Acero Inoxidable 3/8"', subcategoryName: 'Tornillería, Tuercas y Remaches', kind: 'material', stock: 25, avgUnitCost: 0.5 },
  { name: 'Tuerca Ciega Decorativa Inox 3/8"', subcategoryName: 'Tornillería, Tuercas y Remaches', kind: 'material', stock: 24, avgUnitCost: 0.6 },
  { name: 'Broca / Mecha SDS Plus 3/16"', subcategoryName: 'Tornillería, Tuercas y Remaches', kind: 'material', stock: 2, avgUnitCost: 5 },
  { name: 'Bisagra Tipo Omega Inox (Par)', subcategoryName: 'Bisagras y Correderas Generales', kind: 'material', stock: 30, avgUnitCost: 6 },
  { name: 'Bisagras Tipo Pistón 5/8"', subcategoryName: 'Bisagras y Correderas Generales', kind: 'material', stock: 2, avgUnitCost: 4 },
  { name: 'Bisagra Hidráulica con Cierre Automático', subcategoryName: 'Bisagras y Correderas Generales', kind: 'material', stock: 11, avgUnitCost: 18 },
  { name: 'Corredera Telescópica Cierre Suave 35cm', subcategoryName: 'Bisagras y Correderas Generales', kind: 'material', stock: 79, avgUnitCost: 8 },
  { name: 'Termómetro / Reloj Analógico para Parrillera', subcategoryName: 'Accesorios Varios de Carpintería Metálica', kind: 'material', stock: 5, avgUnitCost: 15 },

  // --- GRUPO F & G: HERRAMIENTAS Y EQUIPOS DE TALLER ---
  { name: 'Máquina de Soldar TIG Inverter', subcategoryName: 'Equipos de Soldadura y Gases', kind: 'tool', stock: 8, avgUnitCost: 350 },
  { name: 'Cilindro de Gas Argón Industrial 2000 psi', subcategoryName: 'Equipos de Soldadura y Gases', kind: 'tool', stock: 4, avgUnitCost: 180 },
  { name: 'Esmeril Angular Bosch Professional 4 1/2"', subcategoryName: 'Herramientas Eléctricas de Corte y Acabado', kind: 'tool', stock: 2, avgUnitCost: 95 },
  { name: 'Esmeril Angular Milwaukee Heavy Duty 4 1/2"', subcategoryName: 'Herramientas Eléctricas de Corte y Acabado', kind: 'tool', stock: 3, avgUnitCost: 120 },
  { name: 'Pulidora Orbital Rotativa para Acero', subcategoryName: 'Herramientas Eléctricas de Corte y Acabado', kind: 'tool', stock: 2, avgUnitCost: 110 },
  { name: 'Máquina Satinadora / Lijadora de Rodillo', subcategoryName: 'Herramientas Eléctricas de Corte y Acabado', kind: 'tool', stock: 5, avgUnitCost: 180 },
  { name: 'Sopladora Eléctrica de Limpieza', subcategoryName: 'Herramientas Eléctricas de Corte y Acabado', kind: 'tool', stock: 1, avgUnitCost: 45 },
  { name: 'Kit Mototool Dremel 4300 con Maletín', subcategoryName: 'Herramientas Eléctricas de Corte y Acabado', kind: 'tool', stock: 2, avgUnitCost: 130 },
  { name: 'Taladro Percutor Milwaukee SDS / Mandril', subcategoryName: 'Herramientas Eléctricas de Perforación', kind: 'tool', stock: 4, avgUnitCost: 160 },
  { name: 'Juego de Destornilladores Aislados / Taller', subcategoryName: 'Herramientas Manuales de Taller', kind: 'tool', stock: 1, avgUnitCost: 25 },
  { name: 'Juego de Llaves Allen Métricas y Pulgadas', subcategoryName: 'Herramientas Manuales de Taller', kind: 'tool', stock: 3, avgUnitCost: 20 },
  { name: 'Mazo de Goma con Mango de Madera', subcategoryName: 'Herramientas Manuales de Taller', kind: 'tool', stock: 2, avgUnitCost: 12 },
  { name: 'Juego de Llaves de Boca Fijas Combinadas', subcategoryName: 'Herramientas Manuales de Taller', kind: 'tool', stock: 1, avgUnitCost: 35 },
  { name: 'Juego de Llave Rache y Dados', subcategoryName: 'Herramientas Manuales de Taller', kind: 'tool', stock: 2, avgUnitCost: 65 },
  { name: 'Alicate de Corte Frío Reforzado', subcategoryName: 'Herramientas Manuales de Taller', kind: 'tool', stock: 3, avgUnitCost: 15 },
  { name: 'Cinta Métrica Larga (30m / 50m)', subcategoryName: 'Equipamiento de Logística y Taller', kind: 'tool', stock: 2, avgUnitCost: 25 },
  { name: 'Extensiones Eléctricas de Uso Rudo (10m/20m/40m)', subcategoryName: 'Equipamiento de Logística y Taller', kind: 'tool', stock: 5, avgUnitCost: 30 },
  { name: 'Escalera Tijera de Aluminio Reforzada', subcategoryName: 'Equipamiento de Logística y Taller', kind: 'tool', stock: 2, avgUnitCost: 90 },
  { name: 'Caja Portaherramientas Rígida (Milwaukee/DeWalt)', subcategoryName: 'Equipamiento de Logística y Taller', kind: 'tool', stock: 3, avgUnitCost: 45 },
  { name: 'Goma Perfil para Tubo Ranurado de Vidrio', subcategoryName: 'Insumos Operativos Menores', kind: 'material', stock: 15, avgUnitCost: 2 },
  { name: 'Marcador Industrial Barra Rayas Milwaukee', subcategoryName: 'Insumos Operativos Menores', kind: 'material', stock: 4, avgUnitCost: 4 },
  { name: 'Adhesivo / Sellador de Montaje Ultrabond', subcategoryName: 'Insumos Operativos Menores', kind: 'material', stock: 2, avgUnitCost: 12 },
  { name: 'Estuche de Hojillas Repuesto para Cúter', subcategoryName: 'Insumos Operativos Menores', kind: 'material', stock: 1, avgUnitCost: 3 },
];

async function run() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log(`\n================================================================`);
    console.log(`🚀 SCRIPT DE CATALOGO E INVENTARIO - ACEROS QUINTANA`);
    console.log(`Modo de ejecución: ${isApplyMode ? '🟢 APPLY (Persistiendo en Base de Datos)' : '🟡 DRY-RUN (Simulación Segura, BD intacta)'}`);
    console.log(`================================================================\n`);

    // 1. Cargar unidades de referencia
    const units = await Unit.find();
    const unitMap = new Map<string, any>();
    units.forEach(u => unitMap.set(u.name.toLowerCase(), u));

    const defaultPieceUnit = unitMap.get('pieza') || unitMap.get('unidad');
    const meterUnit = unitMap.get('metro');

    if (!defaultPieceUnit || !meterUnit) {
      console.warn('⚠️ Advertencia: No se encontraron las unidades estándar "Pieza" o "Metro" en la BD.');
    }

    console.log(`📋 Total categorías a procesar: ${categoriesData.length}`);
    console.log(`📋 Total subcategorías a procesar: ${subcategoriesData.length}`);
    console.log(`📋 Total ítems a procesar: ${itemsData.length} (Materiales: ${itemsData.filter(i => i.kind === 'material').length}, Herramientas: ${itemsData.filter(i => i.kind === 'tool').length})\n`);

    // --- PROCESAR CATEGORÍAS ---
    console.log(`--- [1/3] CATEGORÍAS ---`);
    const categoryDocMap = new Map<string, any>();
    for (const cat of categoriesData) {
      if (isApplyMode) {
        const doc = await Category.findOneAndUpdate(
          { name: cat.name },
          { $set: { description: cat.description, isActive: true } },
          { upsert: true, returnDocument: 'after' }
        );
        categoryDocMap.set(cat.name, doc);
        console.log(`  [APPLY] ✅ Categoría: "${cat.name}"`);
      } else {
        console.log(`  [DRY-RUN] 🔍 Categoría simulada: "${cat.name}"`);
      }
    }

    // --- PROCESAR SUBCATEGORÍAS ---
    console.log(`\n--- [2/3] SUBCATEGORÍAS ---`);
    const subcategoryDocMap = new Map<string, any>();
    for (const sub of subcategoriesData) {
      const unitDoc = unitMap.get(sub.unitName.toLowerCase()) || defaultPieceUnit;
      if (isApplyMode) {
        const catDoc = categoryDocMap.get(sub.categoryName);
        if (!catDoc) {
          console.error(`  ❌ Error: No se encontró el ID de la categoría "${sub.categoryName}"`);
          continue;
        }
        const doc = await Subcategory.findOneAndUpdate(
          { category: catDoc._id, name: sub.name },
          { 
            $set: { 
              unit: unitDoc?._id,
              kind: sub.kind,
              isActive: true 
            } 
          },
          { upsert: true, returnDocument: 'after' }
        );
        subcategoryDocMap.set(sub.name, doc);
        console.log(`  [APPLY] ✅ Subcategoría: "${sub.name}" (${sub.kind}, Unidad: ${sub.unitName})`);
      } else {
        console.log(`  [DRY-RUN] 🔍 Subcategoría simulada: "${sub.name}" -> Cat: "${sub.categoryName}" (${sub.kind}, Unidad: ${sub.unitName})`);
      }
    }

    // --- PROCESAR ÍTEMS ---
    console.log(`\n--- [3/3] ÍTEMS DE INVENTARIO ---`);
    let itemsProcessed = 0;
    for (const it of itemsData) {
      if (isApplyMode) {
        const subDoc = subcategoryDocMap.get(it.subcategoryName);
        if (!subDoc) {
          console.error(`  ❌ Error: Subcategoría "${it.subcategoryName}" no encontrada para el ítem "${it.name}"`);
          continue;
        }

        const payload: any = {
          name: it.name,
          subcategory: subDoc._id,
          kind: it.kind,
          stock: it.stock,
          avgUnitCost: it.avgUnitCost ?? 0,
          isActive: true,
        };

        if (it.hasPieceSpec && meterUnit) {
          payload.pieceSpec = {
            pieceSize: it.pieceSize || 6,
            measureUnit: meterUnit._id,
            minUsableMeasure: it.minUsableMeasure || 0.3,
          };
        }

        await InventoryItem.findOneAndUpdate(
          { name: it.name, subcategory: subDoc._id },
          { $set: payload },
          { upsert: true }
        );
        console.log(`  [APPLY] ✅ Ítem: "${it.name}" | Stock: ${it.stock} | Detal: $${it.avgUnitCost || 0} | Tipo: ${it.kind}${it.hasPieceSpec ? ' | (pieceSpec 6m)' : ''}`);
      } else {
        console.log(`  [DRY-RUN] 🔍 Ítem simulado: "${it.name}" | Subcat: "${it.subcategoryName}" | Stock: ${it.stock} | Detal: $${it.avgUnitCost || 0} | ${it.kind}${it.hasPieceSpec ? ' | (pieceSpec 6m)' : ''}`);
      }
      itemsProcessed++;
    }

    console.log(`\n================================================================`);
    if (isApplyMode) {
      console.log(`🎉 ¡CARGA COMPLETADA CON ÉXITO!`);
      console.log(`Se insertaron/actualizaron ${categoriesData.length} categorías, ${subcategoriesData.length} subcategorías y ${itemsProcessed} ítems.`);
    } else {
      console.log(`✨ SIMULACIÓN (DRY-RUN) FINALIZADA SIN ERRORES`);
      console.log(`BD INTACTA: Ningún registro fue modificado ni insertado.`);
      console.log(`Para aplicar estos cambios en la base de datos cuando estés listo, ejecuta:`);
      console.log(`👉 npm run seed:catalog -- --apply`);
    }
    console.log(`================================================================\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante la ejecución del script:', error);
    process.exit(1);
  }
}

run();
