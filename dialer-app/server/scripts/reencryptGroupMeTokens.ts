import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
import User from '../src/models/User';

dotenv.config();

const OLD_KEY = (process.env.JWT_SECRET || 'default-secret').substring(0, 32);
const NEW_KEY = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'default-secret').digest();
const IV_LENGTH = 16;

function decryptOld(encryptedText: string): string {
  const [ivHex, dataHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedData = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(OLD_KEY), iv);
  let decrypted = decipher.update(encryptedData);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

function encryptNew(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', NEW_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dialer');
  const users = await User.find({ 'groupMe.accessToken': { $exists: true } }).select('groupMe');
  let updated = 0;
  for (const user of users) {
    const enc = user.groupMe?.accessToken as string;
    if (!enc) continue;
    try {
      // Try decrypt with new key first – if succeeds token already migrated
      try {
        const [ivHex] = enc.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', NEW_KEY, iv);
        decipher.final();
        continue; // already good
      } catch {
        /* fallthrough */
      }
      const tokenPlain = decryptOld(enc);
      const reenc = encryptNew(tokenPlain);
      await User.updateOne({ _id: user._id }, { $set: { 'groupMe.accessToken': reenc } });
      updated++;
      console.log(`Re-encrypted token for user ${user._id}`);
    } catch (err: any) {
      console.warn(`Skipping user ${user._id}:`, err?.message);
    }
  }
  console.log(`Migration complete. Tokens updated: ${updated}`);
  await mongoose.disconnect();
}

migrate().then(() => process.exit()); 