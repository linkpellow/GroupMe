import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LeadModel from '../models/Lead';

dotenv.config({ path: process.cwd() + '/.env' });

// --- helpers --------------------------------------------------------------
function safeParseDate(raw: any): Date | null {
  if (!raw) return null;
  const str = String(raw).trim();
  // ISO or yyyy-mm-dd
  const iso = new Date(str);
  if (!isNaN(iso.getTime())) return iso;
  // mm/dd/yyyy
  const md = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (md) {
    const m = parseInt(md[1]) - 1;
    const d = parseInt(md[2]);
    const y = parseInt(md[3]);
    const dt = new Date(Date.UTC(y, m, d));
    return dt;
  }
  return null;
}

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);

  console.log('Connected to DB');

  const cursor = LeadModel.find({ source: 'CSV Import' })
    .cursor();

  let scanned = 0;
  let updated = 0;

  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    scanned++;
    const rawCreated = (doc as any).notesMetadata?.originalData?.created_at ||
      (doc as any).notesMetadata?.originalData?.created || null;
    const parsed = safeParseDate(rawCreated);
    if (!parsed) continue;
    // If stored createdAt is within 24h of importedAt (likely wrong) OR after parsed date
    const diff = Math.abs(doc.createdAt.getTime() - parsed.getTime());
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (diff > oneDayMs && parsed < doc.createdAt) {
      await LeadModel.updateOne({ _id: doc._id }, { $set: { createdAt: parsed } });
      updated++;
    }
  }

  console.log(`Scanned ${scanned} leads, updated ${updated}`);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error('Migration failed', e);
  process.exit(1);
}); 