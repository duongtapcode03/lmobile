/**
 * Transform Brand Data Script
 * Chuyển đổi brands_data.json sang format MongoDB-friendly
 * 
 * Usage: node scripts/transformBrandData.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../../data/brands_data.json');
const OUTPUT_DIR = path.join(__dirname, '../data/transformed');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate slug from name
 */
function generateSlug(name) {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

/**
 * Transform single brand data entry
 */
function transformBrandData(brandData) {
  return {
    name: brandData.name?.trim() || '',
    slug: brandData.slug || generateSlug(brandData.name),
    logoUrl: brandData.logoUrl?.trim() || null,
    description: null, // Can be added later
    isActive: true,
    sortOrder: 0, // Can be customized
    metaTitle: brandData.name || null,
    metaDescription: null
  };
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('📖 Reading brand data from:', INPUT_FILE);
    
    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`✅ Loaded ${rawData.length} brand records`);
    
    console.log('🔄 Transforming data...');
    const transformed = rawData.map(transformBrandData);
    
    // Save transformed data
    const outputPath = path.join(OUTPUT_DIR, 'brands_data_transformed.json');
    fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2));
    console.log(`✅ Saved transformed data to: ${outputPath}`);
    
    // Save summary
    const summary = {
      totalRecords: transformed.length,
      timestamp: new Date().toISOString(),
      brands: transformed.map(b => ({
        name: b.name,
        slug: b.slug
      })),
      stats: {
        withLogo: transformed.filter(b => b.logoUrl).length
      }
    };
    
    const summaryPath = path.join(OUTPUT_DIR, 'brands_data_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Saved summary to: ${summaryPath}`);
    
    console.log('\n📊 Summary:');
    console.log(`   Total brands: ${summary.totalRecords}`);
    console.log(`   Brands with logo: ${summary.stats.withLogo}`);
    
    console.log('\n✨ Transformation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error transforming brand data:', error);
    process.exit(1);
  }
}

main();


