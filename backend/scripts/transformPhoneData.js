/**
 * Transform Phone Data Script
 * Chuyển đổi phone_data_details.json sang Product format (unified model)
 * 
 * Usage: node scripts/transformPhoneData.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../../data/phone_data_details.json');
const OUTPUT_DIR = path.join(__dirname, '../data/transformed');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Parse price string to number (remove currency symbols and spaces)
 */
function parsePrice(priceStr) {
  if (!priceStr || typeof priceStr !== 'string') return null;
  const cleaned = priceStr.replace(/[^\d.]/g, '');
  return cleaned ? parseFloat(cleaned) : null;
}

/**
 * Extract numeric value from discount rate
 */
function parseDiscountRate(rateStr) {
  if (!rateStr || typeof rateStr !== 'string') return null;
  const cleaned = rateStr.replace(/[^\d.]/g, '');
  return cleaned ? parseFloat(cleaned) : null;
}

/**
 * Transform single phone data entry
 */
function transformPhoneData(phoneData) {
  return {
    name: phoneData.name?.trim() || '',
    sku: phoneData.sku?.trim().toUpperCase() || '',
    brand: phoneData.brand?.trim() || '',
    
    // Pricing
    price: phoneData.price || null,
    oldPrice: phoneData.oldPrice || null,
    discount: phoneData.discount || null,
    memberPrice: phoneData.memberPrice || null,
    lastPrice: phoneData.lastPrice || null,
    discountRate: phoneData.discountRate || null,
    installmentPrice: phoneData.installmentPrice || null,
    memberDiscount: phoneData.memberDiscount || null,
    points: phoneData.points || null,
    extraPoints: phoneData.extraPoints || null,
    
    // Product details
    imageUrl: phoneData.imageUrl || null,
    availability: phoneData.availability ?? 0,
    cpu: phoneData.cpu || null,
    storage: phoneData.storage || null,
    screenSize: phoneData.screenSize || null,
    
    // Nested arrays (already in correct format)
    images: phoneData.images || [],
    colorVariants: phoneData.colorVariants || [],
    versions: phoneData.versions || [],
    colors: phoneData.colors || [],
    promotions: phoneData.promotions || [],
    morePromotionsCount: phoneData.morePromotionsCount || 0,
    warranty: phoneData.warranty || [],
    highlights: phoneData.highlights || [],
    contentToc: phoneData.contentToc || [],
    
    // Specifications - convert to Map format for MongoDB
    specifications: phoneData.specifications || {},
    
    // Metadata
    isActive: true,
    sourceUrl: phoneData.link || null,
    
    // Add computed fields
    priceNumber: parsePrice(phoneData.price),
    oldPriceNumber: parsePrice(phoneData.oldPrice),
    discountRateNumber: parseDiscountRate(phoneData.discountRate),
    hasDiscount: !!(phoneData.discount && phoneData.discount !== null)
  };
}

/**
 * Transform and split data into smaller chunks for easier import
 */
function transformAndSplit(data, chunkSize = 100) {
  const transformed = data.map(transformPhoneData);
  const chunks = [];
  
  for (let i = 0; i < transformed.length; i += chunkSize) {
    chunks.push(transformed.slice(i, i + chunkSize));
  }
  
  return { transformed, chunks };
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('📖 Reading phone data from:', INPUT_FILE);
    
    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`✅ Loaded ${rawData.length} phone records`);
    
    console.log('🔄 Transforming data...');
    const { transformed, chunks } = transformAndSplit(rawData);
    
    // Save full transformed data (as products)
    const fullOutputPath = path.join(OUTPUT_DIR, 'product_data_transformed.json');
    fs.writeFileSync(fullOutputPath, JSON.stringify(transformed, null, 2));
    console.log(`✅ Saved full transformed data to: ${fullOutputPath}`);
    
    // Save chunks for batch import
    chunks.forEach((chunk, index) => {
      const chunkPath = path.join(OUTPUT_DIR, `product_data_chunk_${index + 1}.json`);
      fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
      console.log(`✅ Saved chunk ${index + 1}/${chunks.length} (${chunk.length} items)`);
    });
    
    // Save summary
    const summary = {
      totalRecords: transformed.length,
      totalChunks: chunks.length,
      chunkSize: chunks[0]?.length || 0,
      timestamp: new Date().toISOString(),
      brands: [...new Set(transformed.map(p => p.brand))].sort(),
      stats: {
        withDiscount: transformed.filter(p => p.hasDiscount).length,
        withAvailability: transformed.filter(p => p.availability > 0).length,
        averagePrice: transformed
          .filter(p => p.priceNumber)
          .reduce((sum, p) => sum + p.priceNumber, 0) / transformed.filter(p => p.priceNumber).length
      }
    };
    
    const summaryPath = path.join(OUTPUT_DIR, 'product_data_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Saved summary to: ${summaryPath}`);
    
    console.log('\n📊 Summary:');
    console.log(`   Total records: ${summary.totalRecords}`);
    console.log(`   Total chunks: ${summary.totalChunks}`);
    console.log(`   Unique brands: ${summary.brands.length}`);
    console.log(`   Products with discount: ${summary.stats.withDiscount}`);
    console.log(`   Products in stock: ${summary.stats.withAvailability}`);
    
    console.log('\n✨ Transformation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error transforming phone data:', error);
    process.exit(1);
  }
}

main();

