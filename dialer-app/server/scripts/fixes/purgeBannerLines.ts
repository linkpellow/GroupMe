import mongoose from 'mongoose';
import dotenv from 'dotenv';
import yargs from 'yargs';
import LeadModel from '../../src/models/Lead';

// Load env (supports .env or process vars already present)
dotenv.config();

/**
 * Regex that matches the annoying banner line we previously hid in the UI.
 * Example: "🌟 New Marketplace Lead" or "🌟 New NextGen Lead" (with any suffix).
 */
const BANNER_REGEX = /^\s*🌟.*$/;

/**
 * Zero-width characters sometimes sneak in (copy-paste).  Remove them so the regex can match.
 */
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/g;

function stripBannerLines(raw: string): string {
  if (!raw) return '';
  const cleanedLines: string[] = [];
  raw.split(/\r?\n/).forEach((line) => {
    const noZW = line.replace(ZERO_WIDTH, '').trimEnd();
    if (BANNER_REGEX.test(noZW.trim())) return; // skip
    cleanedLines.push(line);
  });
  // Preserve original line breaks but trim trailing empty lines
  return cleanedLines.join('\n').replace(/\n+$/s, '');
}

async function main() {
  const argv = yargs(process.argv.slice(2))
    .option('dry', {
      type: 'boolean',
      description: 'Dry-run only – do not persist changes',
      default: false,
    })
    .option('limit', {
      type: 'number',
      description: 'Process at most N leads (useful for testing)',
    })
    .parseSync();

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dialer';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const query: any = { notes: /🌟/ };
  const limit = argv.limit && argv.limit > 0 ? argv.limit : undefined;
  const cursor = LeadModel.find(query).limit(limit ?? 0).cursor();
  let processed = 0;
  let modified = 0;

  console.log(`Scanning leads${limit ? ` (limit ${limit})` : ''}...`);

  for (let lead = await cursor.next(); lead != null; lead = await cursor.next()) {
    processed += 1;
    const updatedNotes = stripBannerLines(lead.notes || '');
    if (updatedNotes !== lead.notes) {
      modified += 1;
      if (!argv.dry) {
        await LeadModel.updateOne({ _id: lead._id }, { $set: { notes: updatedNotes } });
      }
    }
  }

  console.log(`Checked ${processed} leads, removed banners from ${modified}.`);
  if (argv.dry) {
    console.log('(dry-run mode – no DB writes performed)');
  }
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('Bulk banner purge failed:', err);
  process.exit(1);
}); 