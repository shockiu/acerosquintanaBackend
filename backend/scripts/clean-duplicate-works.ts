import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Work } from '../src/models/Work';
import { ChangeRequest } from '../src/models/ChangeRequest';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI');
  process.exit(1);
}

async function cleanDuplicates() {
  try {
    await mongoose.connect(MONGODB_URI!);
    console.log('Conectado a MongoDB para auditoría de obras duplicadas.');

    const pendingWorks = await Work.find({ status: 'pending_approval' });
    console.log(`Analizando ${pendingWorks.length} obras en estado 'pending_approval'...`);

    let cleanedCount = 0;

    for (const pw of pendingWorks) {
      // Find change requests associated with this work
      const request = await ChangeRequest.findOne({
        entity: 'work',
        targetId: pw._id,
      });

      if (request) {
        if (request.status === 'approved') {
          // Check if there is another approved work with identical client and date
          const duplicateApproved = await Work.findOne({
            _id: { $ne: pw._id },
            clientName: pw.clientName,
            status: 'approved',
          });

          if (duplicateApproved) {
            console.log(`Detectada obra duplicada huérfana: "${pw.clientName}" (${pw._id}). Eliminando...`);
            await Work.deleteOne({ _id: pw._id });
            cleanedCount++;
          } else {
            console.log(`Actualizando estado de obra pendiente aprobada: "${pw.clientName}" (${pw._id})...`);
            pw.status = 'approved';
            await pw.save();
            cleanedCount++;
          }
        } else if (request.status === 'rejected') {
          console.log(`Marcando obra rechazada: "${pw.clientName}" (${pw._id})...`);
          pw.status = 'rejected';
          await pw.save();
          cleanedCount++;
        }
      }
    }

    console.log(`Proceso completado. ${cleanedCount} obras corregidas.`);
    process.exit(0);
  } catch (error) {
    console.error('Error durante la limpieza:', error);
    process.exit(1);
  }
}

cleanDuplicates();
