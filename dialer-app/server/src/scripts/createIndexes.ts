/**
 * Database Index Creation Script
 * Creates all necessary indexes for optimal query performance.
 * Run this during deployment or as part of the build process.
 */

import mongoose from 'mongoose';
import { QUERY_CONFIG } from '@shared/config/queryConfig';

async function createIndexes() {
  console.log('Creating database indexes...');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  const collection = db.collection('leads');

  try {
    // Drop existing indexes (except _id)
    console.log('Dropping existing indexes...');
    await collection.dropIndexes();

    // Single field indexes
    console.log('Creating single field indexes...');
    await collection.createIndex({ createdAt: -1 }, { name: 'createdAt_single' });
    await collection.createIndex({ state: 1 }, { name: 'state_single' });
    await collection.createIndex({ disposition: 1 }, { name: 'disposition_single' });
    await collection.createIndex({ source: 1 }, { name: 'source_single' });
    await collection.createIndex({ assignedTo: 1 }, { name: 'assignedTo_single' });

    // Compound indexes for common filter + sort combinations
    console.log('Creating compound indexes...');

    // State + createdAt (common filter pattern)
    await collection.createIndex({ state: 1, createdAt: -1 }, { name: 'state_createdAt_compound' });

    // Disposition + createdAt (common filter pattern)
    await collection.createIndex(
      { disposition: 1, createdAt: -1 },
      { name: 'disposition_createdAt_compound' }
    );

    // State + Disposition + createdAt (multi-filter pattern)
    await collection.createIndex(
      { state: 1, disposition: 1, createdAt: -1 },
      { name: 'state_disposition_createdAt_compound' }
    );

    // Source + createdAt (pipeline filter)
    await collection.createIndex(
      { source: 1, createdAt: -1 },
      { name: 'source_createdAt_compound' }
    );

    // Text search index for search functionality
    console.log('Creating text search index...');
    await collection.createIndex(
      {
        name: 'text',
        email: 'text',
        phone: 'text',
        firstName: 'text',
        lastName: 'text',
      },
      {
        name: 'text_search_index',
        weights: {
          name: 10,
          phone: 8,
          email: 5,
          firstName: 3,
          lastName: 3,
        },
      }
    );

    // Partial indexes for optional fields
    console.log('Creating partial indexes...');

    // Index for non-null email addresses
    await collection.createIndex(
      { email: 1 },
      {
        name: 'email_partial',
        partialFilterExpression: { email: { $exists: true, $ne: '' } },
      }
    );

    // Index for non-null phone numbers
    await collection.createIndex(
      { phone: 1 },
      {
        name: 'phone_partial',
        partialFilterExpression: { phone: { $exists: true, $ne: '' } },
      }
    );

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('\nCreated indexes:');
    indexes.forEach((index) => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });

    // Analyze index usage recommendations
    console.log('\nIndex recommendations based on query patterns:');
    console.log('1. For state filtering: use state_createdAt_compound');
    console.log('2. For disposition filtering: use disposition_createdAt_compound');
    console.log('3. For combined filters: use state_disposition_createdAt_compound');
    console.log('4. For text search: use text_search_index');
    console.log('5. For exact email/phone lookup: use email_partial or phone_partial');

    console.log('\nIndexes created successfully!');
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}

// Export for use in other scripts
export { createIndexes };

// Run if called directly
if (require.main === module) {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crokodial';

  mongoose
    .connect(MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      return createIndexes();
    })
    .then(() => {
      console.log('Index creation complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to create indexes:', error);
      process.exit(1);
    });
}
