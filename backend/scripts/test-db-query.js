/**
 * Script để test query dữ liệu từ database
 * Chạy: node scripts/test-db-query.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../src/models/product/product.model.js';
import { ProductDetail } from '../src/models/product/productDetail.model.js';
import { ProductImage } from '../src/models/product/productImage.model.js';
import { ProductVariant } from '../src/models/product/productVariant.model.js';
import FlashSale from '../src/models/flashSale/flashSale.model.js';
import { Brand } from '../src/models/brand/brand.model.js';
import { Category } from '../src/models/category/category.model.js';

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lmobile';

async function testDatabaseQueries() {
  try {
    console.log('🔌 Đang kết nối database...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Đã kết nối database thành công\n');

    // 1. Query Product
    console.log('='.repeat(80));
    console.log('📦 QUERY PRODUCTS');
    console.log('='.repeat(80));
    const products = await Product.find().limit(3).lean();
    console.log(`Tìm thấy ${products.length} sản phẩm (giới hạn 3):\n`);
    products.forEach((product, index) => {
      console.log(`\n--- Product ${index + 1} ---`);
      console.log(JSON.stringify(product, null, 2));
    });

    // 2. Query ProductDetail
    console.log('\n' + '='.repeat(80));
    console.log('📄 QUERY PRODUCT DETAILS');
    console.log('='.repeat(80));
    const productDetails = await ProductDetail.find().limit(2).lean();
    console.log(`Tìm thấy ${productDetails.length} product details (giới hạn 2):\n`);
    productDetails.forEach((detail, index) => {
      console.log(`\n--- ProductDetail ${index + 1} ---`);
      console.log(JSON.stringify({
        _id: detail._id,
        productId: detail.productId,
        description: detail.description?.substring(0, 100) + '...',
        highlights: detail.highlights?.slice(0, 2),
        promotions: detail.promotions?.slice(0, 2),
        warranty: detail.warranty?.slice(0, 2),
        hasSpecifications: !!detail.specifications,
        contentTocCount: detail.contentToc?.length || 0
      }, null, 2));
    });

    // 3. Query ProductImage
    console.log('\n' + '='.repeat(80));
    console.log('🖼️  QUERY PRODUCT IMAGES');
    console.log('='.repeat(80));
    const productImages = await ProductImage.find().limit(5).lean();
    console.log(`Tìm thấy ${productImages.length} product images (giới hạn 5):\n`);
    productImages.forEach((image, index) => {
      console.log(`\n--- ProductImage ${index + 1} ---`);
      console.log(JSON.stringify({
        _id: image._id,
        productId: image.productId,
        url: image.url,
        highResUrl: image.highResUrl,
        alt: image.alt,
        color: image.color,
        sortOrder: image.sortOrder,
        isPrimary: image.isPrimary
      }, null, 2));
    });

    // 4. Query ProductVariant
    console.log('\n' + '='.repeat(80));
    console.log('🔄 QUERY PRODUCT VARIANTS');
    console.log('='.repeat(80));
    const productVariants = await ProductVariant.find().limit(5).lean();
    console.log(`Tìm thấy ${productVariants.length} product variants (giới hạn 5):\n`);
    productVariants.forEach((variant, index) => {
      console.log(`\n--- ProductVariant ${index + 1} ---`);
      console.log(JSON.stringify({
        _id: variant._id,
        productId: variant.productId,
        type: variant.type,
        sku: variant.sku,
        label: variant.label,
        price: variant.price,
        priceNumber: variant.priceNumber,
        imageUrl: variant.imageUrl,
        isDefault: variant.isDefault,
        sortOrder: variant.sortOrder
      }, null, 2));
    });

    // 5. Query FlashSale
    console.log('\n' + '='.repeat(80));
    console.log('⚡ QUERY FLASH SALE ITEMS');
    console.log('='.repeat(80));
    const flashSales = await FlashSale.find().limit(3).lean();
    console.log(`Tìm thấy ${flashSales.length} flash sales (giới hạn 3):\n`);
    flashSales.forEach((item, index) => {
      console.log(`\n--- FlashSale ${index + 1} ---`);
      console.log(JSON.stringify({
        _id: item._id,
        id: item.id,
        session_id: item.session_id,
        product_id: item.product_id,
        flash_price: item.flash_price,
        total_stock: item.total_stock,
        sold: item.sold,
        limit_per_user: item.limit_per_user,
        sort_order: item.sort_order
      }, null, 2));
    });

    // 6. Query Brand
    console.log('\n' + '='.repeat(80));
    console.log('🏷️  QUERY BRANDS');
    console.log('='.repeat(80));
    const brands = await Brand.find().limit(3).lean();
    console.log(`Tìm thấy ${brands.length} brands (giới hạn 3):\n`);
    brands.forEach((brand, index) => {
      console.log(`\n--- Brand ${index + 1} ---`);
      console.log(JSON.stringify(brand, null, 2));
    });

    // 7. Query Category
    console.log('\n' + '='.repeat(80));
    console.log('📁 QUERY CATEGORIES');
    console.log('='.repeat(80));
    const categories = await Category.find().limit(3).lean();
    console.log(`Tìm thấy ${categories.length} categories (giới hạn 3):\n`);
    categories.forEach((category, index) => {
      console.log(`\n--- Category ${index + 1} ---`);
      console.log(JSON.stringify(category, null, 2));
    });

    // 8. Test relationship query - Lấy product với detail, images, variants
    console.log('\n' + '='.repeat(80));
    console.log('🔗 TEST RELATIONSHIP QUERY');
    console.log('='.repeat(80));
    if (products.length > 0) {
      const testProductId = products[0]._id;
      console.log(`\nTesting với Product ID: ${testProductId}\n`);

      const [detail, images, variants, flashSale] = await Promise.all([
        ProductDetail.findOne({ productId: testProductId }).lean(),
        ProductImage.find({ productId: testProductId }).sort({ sortOrder: 1 }).lean(),
        ProductVariant.find({ productId: testProductId }).sort({ sortOrder: 1 }).lean(),
        FlashSale.findOne({ product_id: testProductId }).lean()
      ]);

      console.log('Product:', {
        _id: products[0]._id,
        name: products[0].name,
        brandRef: products[0].brandRef,
        categoryRefs: products[0].categoryRefs
      });

      console.log('\nProductDetail:', detail ? {
        _id: detail._id,
        productId: detail.productId,
        hasDescription: !!detail.description,
        highlightsCount: detail.highlights?.length || 0,
        promotionsCount: detail.promotions?.length || 0
      } : 'Không có');

      console.log('\nProductImages:', images.length > 0 ? images.map(img => ({
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder
      })) : 'Không có');

      console.log('\nProductVariants:', variants.length > 0 ? variants.map(v => ({
        type: v.type,
        label: v.label,
        price: v.price,
        isDefault: v.isDefault
      })) : 'Không có');

      console.log('\nFlashSale:', flashSale ? {
        session_id: flashSale.session_id,
        flash_price: flashSale.flash_price,
        total_stock: flashSale.total_stock,
        sold: flashSale.sold
      } : 'Không có');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Hoàn thành query test!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Đã ngắt kết nối database');
    process.exit(0);
  }
}

// Chạy script
testDatabaseQueries();

