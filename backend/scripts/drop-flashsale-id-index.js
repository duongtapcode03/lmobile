/**
 * Script để xóa index id_1 trong collection flashsales
 * Index này gây conflict khi tạo flash sale mới
 * Chạy: node scripts/drop-flashsale-id-index.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lmobile';

async function dropIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('flashsales');

    // Kiểm tra indexes hiện tại
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => ({ name: idx.name, key: idx.key })));

    // Tìm index id_1
    const idIndex = indexes.find(idx => idx.name === 'id_1' || (idx.key && idx.key.id === 1));
    
    if (idIndex) {
      console.log('Found index id_1, dropping...');
      await collection.dropIndex('id_1');
      console.log('Successfully dropped index id_1');
    } else {
      console.log('Index id_1 not found, nothing to drop');
    }

    // Kiểm tra lại indexes sau khi drop
    const indexesAfter = await collection.indexes();
    console.log('Indexes after drop:', indexesAfter.map(idx => ({ name: idx.name, key: idx.key })));

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    if (error.code === 27 || error.codeName === 'IndexNotFound') {
      console.log('Index id_1 does not exist, nothing to drop');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

dropIndex();

