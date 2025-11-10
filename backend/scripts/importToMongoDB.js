/**
 * MongoDB Import Script
 * Import transformed data vào MongoDB
 * 
 * Usage: 
 *   node scripts/importToMongoDB.js --type=product
 *   node scripts/importToMongoDB.js --type=blog
 *   node scripts/importToMongoDB.js --type=brand
 *   node scripts/importToMongoDB.js --type=all
 * 
 * Options:
 *   --type: product | blog | brand | all (default: all)
 *   Note: product includes phone data (unified model)
 *   --chunk: chunk number to import (optional)
 *   --drop: drop collection before import (default: false)
 */

import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import { Product } from '../src/models/product/product.model.js';
import { Blog } from '../src/models/blog/blog.model.js';
import { Brand } from '../src/models/brand/brand.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const OUTPUT_DIR = path.join(__dirname, '../data/transformed');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : defaultValue;
};

const importType = getArg('type', 'all');
const chunkNumber = getArg('chunk', null);
const shouldDrop = args.includes('--drop');

/**
 * Connect to MongoDB
 */
async function connectDB() {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lmobile';
  
  try {
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB:', mongoURI);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

/**
 * Import product data (includes phone data - unified model)
 */
async function importProductData() {
  console.log('\n📱 Importing product data (unified model)...');
  
  if (shouldDrop) {
    await Product.deleteMany({});
    console.log('🗑️  Dropped existing products');
  }
  
  let filePath;
  if (chunkNumber) {
    filePath = path.join(OUTPUT_DIR, `product_data_chunk_${chunkNumber}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Chunk file not found: ${filePath}`);
      return;
    }
  } else {
    filePath = path.join(OUTPUT_DIR, 'product_data_transformed.json');
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Transformed data file not found: ${filePath}`);
      console.log('💡 Run transformPhoneData.js first to generate transformed data');
      return;
    }
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`📖 Loading ${data.length} product records...`);
  
  // Import in batches to avoid memory issues
  const batchSize = 100;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    try {
      // Use insertMany with ordered: false to continue on errors
      const result = await Product.insertMany(batch, {
        ordered: false,
        rawResult: false
      });
      
      imported += result.length;
      console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}: ${result.length} records (Total: ${imported}/${data.length})`);
    } catch (error) {
      // Count successful inserts even if some fail
      if (error.writeErrors) {
        const successful = batch.length - error.writeErrors.length;
        imported += successful;
        errors += error.writeErrors.length;
        console.log(`⚠️  Batch ${Math.floor(i / batchSize) + 1}: ${successful} imported, ${error.writeErrors.length} errors`);
      } else {
        console.error(`❌ Error importing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }
  }
  
  console.log(`\n📊 Product import summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total in database: ${await Product.countDocuments()}`);
}

/**
 * Import blog data
 */
async function importBlogData() {
  console.log('\n📝 Importing blog data...');
  
  if (shouldDrop) {
    await Blog.deleteMany({});
    console.log('🗑️  Dropped existing blogs');
  }
  
  let filePath;
  if (chunkNumber) {
    filePath = path.join(OUTPUT_DIR, `blog_data_chunk_${chunkNumber}.json`);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Chunk file not found: ${filePath}`);
      return;
    }
  } else {
    filePath = path.join(OUTPUT_DIR, 'blog_data_transformed.json');
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Transformed data file not found: ${filePath}`);
      console.log('💡 Run transformBlogData.js first to generate transformed data');
      return;
    }
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`📖 Loading ${data.length} blog records...`);
  
  // Import in batches
  const batchSize = 50;
  let imported = 0;
  let errors = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    try {
      const result = await Blog.insertMany(batch, {
        ordered: false,
        rawResult: false
      });
      
      imported += result.length;
      console.log(`✅ Imported batch ${Math.floor(i / batchSize) + 1}: ${result.length} records (Total: ${imported}/${data.length})`);
    } catch (error) {
      if (error.writeErrors) {
        const successful = batch.length - error.writeErrors.length;
        imported += successful;
        errors += error.writeErrors.length;
        console.log(`⚠️  Batch ${Math.floor(i / batchSize) + 1}: ${successful} imported, ${error.writeErrors.length} errors`);
      } else {
        console.error(`❌ Error importing batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      }
    }
  }
  
  console.log(`\n📊 Blog import summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total in database: ${await Blog.countDocuments()}`);
}

/**
 * Import brand data
 */
async function importBrandData() {
  console.log('\n🏷️  Importing brand data...');
  
  if (shouldDrop) {
    await Brand.deleteMany({});
    console.log('🗑️  Dropped existing brands');
  }
  
  const filePath = path.join(OUTPUT_DIR, 'brands_data_transformed.json');
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Transformed data file not found: ${filePath}`);
    console.log('💡 Run transformBrandData.js first to generate transformed data');
    return;
  }
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`📖 Loading ${data.length} brand records...`);
  
  let imported = 0;
  let errors = 0;
  
  // Import one by one to handle duplicates better
  for (const brandData of data) {
    try {
      await Brand.create(brandData);
      imported++;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key - try to update instead
        try {
          await Brand.findOneAndUpdate(
            { $or: [{ name: brandData.name }, { slug: brandData.slug }] },
            brandData,
            { upsert: false, new: true }
          );
          imported++;
        } catch (updateError) {
          errors++;
          console.log(`⚠️  Error with brand: ${brandData.name} - ${error.message}`);
        }
      } else {
        errors++;
        console.log(`⚠️  Error with brand: ${brandData.name} - ${error.message}`);
      }
    }
  }
  
  console.log(`\n📊 Brand import summary:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📦 Total in database: ${await Brand.countDocuments()}`);
}

/**
 * Main execution
 */
async function main() {
  try {
    await connectDB();
    
    if (importType === 'brand' || importType === 'all') {
      await importBrandData();
    }
    
    if (importType === 'product' || importType === 'all') {
      await importProductData();
    }
    
    if (importType === 'blog' || importType === 'all') {
      await importBlogData();
    }
    
    console.log('\n✨ Import completed!');
    
  } catch (error) {
    console.error('❌ Import error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

main();

