/**
 * Transform Blog Data Script
 * Chuyển đổi blog_posts_merged.json sang format MongoDB-friendly
 * 
 * Usage: node scripts/transformBlogData.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../../data/blog_posts_merged.json');
const OUTPUT_DIR = path.join(__dirname, '../data/transformed');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  // Try to parse Vietnamese date format like "Tháng mười một 1, 2025"
  const months = {
    'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'sáu': 6,
    'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10, 'mười một': 11, 'mười hai': 12
  };
  
  try {
    const match = dateStr.match(/Tháng\s+([^0-9]+)\s+(\d+),\s+(\d+)/);
    if (match) {
      const monthName = match[1].trim();
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);
      const month = months[monthName];
      
      if (month && day && year) {
        return new Date(year, month - 1, day);
      }
    }
    
    // Fallback to standard Date parsing
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
}

/**
 * Generate slug from title
 */
function generateSlug(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
}

/**
 * Calculate reading time from content
 */
function calculateReadingTime(content, blogItems) {
  const wordsPerMinute = 200;
  let wordCount = 0;
  
  if (content && typeof content === 'string') {
    wordCount += content.split(/\s+/).length;
  }
  
  if (blogItems && Array.isArray(blogItems)) {
    blogItems.forEach(item => {
      if (item.lstDescription && Array.isArray(item.lstDescription)) {
        item.lstDescription.forEach(desc => {
          if (typeof desc === 'string') {
            wordCount += desc.split(/\s+/).length;
          }
        });
      }
    });
  }
  
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

/**
 * Extract excerpt from subtitle or first content
 */
function extractExcerpt(subtitle, blogItems) {
  if (subtitle && subtitle.length > 0) {
    return subtitle.length > 500 ? subtitle.substring(0, 497) + '...' : subtitle;
  }
  
  if (blogItems && blogItems.length > 0) {
    const firstItem = blogItems[0];
    if (firstItem.lstDescription && firstItem.lstDescription.length > 0) {
      const firstDesc = firstItem.lstDescription[0];
      return firstDesc.length > 500 ? firstDesc.substring(0, 497) + '...' : firstDesc;
    }
  }
  
  return '';
}

/**
 * Transform single blog data entry
 */
function transformBlogData(blogData) {
  const slug = generateSlug(blogData.title);
  const publishedDate = parseDate(blogData.publishDate);
  const readingTime = calculateReadingTime(blogData.content, blogData.blog_items);
  const excerpt = extractExcerpt(blogData.subtitle, blogData.blog_items);
  
  return {
    // Basic info
    url: blogData.url || null,
    title: blogData.title?.trim() || '',
    subtitle: blogData.subtitle?.trim() || '',
    slug: slug || null,
    
    // Author (can be linked to User later)
    authorName: blogData.author?.trim() || null,
    avatar: blogData.avatar || null,
    
    // Content
    content: blogData.content || null,
    excerpt: excerpt,
    blog_items: blogData.blog_items || [],
    
    // Images
    featuredImage: blogData.featuredImage?.original || blogData.featuredImage || '',
    featuredImageData: blogData.featuredImage || null,
    images: blogData.images || [],
    
    // Metadata
    category: 'news', // Default, can be extracted from tags or URL later
    tags: blogData.tags || [],
    
    // Publishing
    status: 'published', // Assuming crawled blogs are published
    publishDate: blogData.publishDate || null,
    publishedAt: publishedDate || new Date(),
    isFeatured: false,
    isPinned: false,
    
    // Statistics (initialize to 0)
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    readingTime: readingTime,
    
    // SEO
    seoTitle: blogData.title || null,
    seoDescription: excerpt || null,
    seoKeywords: blogData.tags || [],
    
    // Relations (empty initially)
    relatedProducts: [],
    relatedBlogs: [],
    
    // Settings
    allowComments: true,
    isPublic: true,
    
    // Computed
    sourceUrl: blogData.url || null
  };
}

/**
 * Transform and split data into smaller chunks
 */
function transformAndSplit(data, chunkSize = 50) {
  const transformed = data.map(transformBlogData);
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
    console.log('📖 Reading blog data from:', INPUT_FILE);
    
    const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    console.log(`✅ Loaded ${rawData.length} blog records`);
    
    console.log('🔄 Transforming data...');
    const { transformed, chunks } = transformAndSplit(rawData);
    
    // Save full transformed data
    const fullOutputPath = path.join(OUTPUT_DIR, 'blog_data_transformed.json');
    fs.writeFileSync(fullOutputPath, JSON.stringify(transformed, null, 2));
    console.log(`✅ Saved full transformed data to: ${fullOutputPath}`);
    
    // Save chunks for batch import
    chunks.forEach((chunk, index) => {
      const chunkPath = path.join(OUTPUT_DIR, `blog_data_chunk_${index + 1}.json`);
      fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2));
      console.log(`✅ Saved chunk ${index + 1}/${chunks.length} (${chunk.length} items)`);
    });
    
    // Save summary
    const summary = {
      totalRecords: transformed.length,
      totalChunks: chunks.length,
      chunkSize: chunks[0]?.length || 0,
      timestamp: new Date().toISOString(),
      categories: [...new Set(transformed.map(b => b.category))],
      stats: {
        withImages: transformed.filter(b => b.featuredImage || b.images.length > 0).length,
        withBlogItems: transformed.filter(b => b.blog_items.length > 0).length,
        averageReadingTime: transformed.reduce((sum, b) => sum + b.readingTime, 0) / transformed.length
      }
    };
    
    const summaryPath = path.join(OUTPUT_DIR, 'blog_data_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`✅ Saved summary to: ${summaryPath}`);
    
    console.log('\n📊 Summary:');
    console.log(`   Total records: ${summary.totalRecords}`);
    console.log(`   Total chunks: ${summary.totalChunks}`);
    console.log(`   Categories: ${summary.categories.join(', ')}`);
    console.log(`   Blogs with images: ${summary.stats.withImages}`);
    console.log(`   Average reading time: ${summary.stats.averageReadingTime.toFixed(1)} minutes`);
    
    console.log('\n✨ Transformation completed successfully!');
    
  } catch (error) {
    console.error('❌ Error transforming blog data:', error);
    process.exit(1);
  }
}

main();


