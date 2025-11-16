import { Product } from "./product.model.js";
import { Category } from "../category/category.model.js";
import { Brand } from "../brand/brand.model.js";
import { ProductDetail } from "./productDetail.model.js";
import { ProductImage } from "./productImage.model.js";
import { ProductVariant } from "./productVariant.model.js";
import mongoose from "mongoose";
import { AppError } from "../../core/errors/AppError.js";
import { populateProductReferences, populateProductsReferences } from "./product.populate.helpers.js";

/**
 * Helper function để tìm product bằng _id (hỗ trợ cả string và number)
 * _id giờ là Number, nhưng có thể nhận vào string hoặc number
 */
export async function findProductById(id) {
  if (!id) return null;
  
  // Convert to number nếu có thể
  let numericId = null;
  if (typeof id === 'number') {
    numericId = id;
  } else {
    const parsed = parseInt(String(id).trim(), 10);
    if (!isNaN(parsed)) {
      numericId = parsed;
    }
  }
  
  if (numericId !== null) {
    return await Product.findOne({ _id: numericId });
  }
  
  // Nếu không phải number, thử tìm bằng SKU hoặc slug
  const stringId = String(id).trim();
  return await Product.findOne({ 
    $or: [
      { sku: stringId },
      { slug: stringId }
    ]
  });
}

export const productService = {
  // Tạo sản phẩm mới
  async createProduct(data) {
    try {
      // Generate _id nếu chưa có
      if (!data._id) {
        // Lấy _id lớn nhất và tăng lên 1
        const lastProduct = await Product.findOne().sort({ _id: -1 }).select('_id');
        data._id = lastProduct ? lastProduct._id + 1 : 1;
      }

      // Kiểm tra brand tồn tại
      if (data.brandRef) {
        // Convert brandRef to number
        const brandId = typeof data.brandRef === 'number' 
          ? data.brandRef 
          : parseInt(String(data.brandRef), 10);
        
        if (isNaN(brandId)) {
          throw new Error("brandRef phải là số");
        }
        
        const brand = await Brand.findOne({ _id: brandId });
        if (!brand) {
          throw new Error("Thương hiệu không tồn tại");
        }
      } else {
        throw new Error("brandRef là bắt buộc");
      }

      // Kiểm tra categories tồn tại (nếu có)
      if (data.categoryRefs && data.categoryRefs.length > 0) {
        // Convert categoryRefs to numbers
        const categoryIds = data.categoryRefs.map(catId => 
          typeof catId === 'number' ? catId : parseInt(String(catId), 10)
        ).filter(id => !isNaN(id));
        
        const categories = await Category.find({ _id: { $in: categoryIds } });
        if (categories.length !== categoryIds.length) {
          throw new Error("Một hoặc nhiều danh mục không tồn tại");
        }
      }

      const product = new Product(data);
      await product.save();
      
      // Manual populate brand và categories info (vì Number ID)
      const populatedProduct = await populateProductReferences(product.toObject());
      return populatedProduct;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("SKU hoặc slug đã tồn tại");
      }
      throw error;
    }
  },

  // Lấy tất cả sản phẩm với phân trang
  async getAllProducts(query = {}) {
    const {
      page = 1,
      limit = 12,
      featured,
      brand,
      minPrice,
      maxPrice,
      storage,
      screenSize,
      search, // Search query parameter
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    // Xây dựng filter
    const filter = {
      isActive: true // Chỉ lấy sản phẩm active
    };
    
    // Filter featured products
    if (featured === "true" || featured === true) {
      filter.isFeatured = true;
    }

    // Lọc theo thương hiệu
    // Frontend gửi brand dưới dạng comma-separated string: "8,9,10"
    // Đơn giản hơn nhiều so với xử lý brand[] array
    if (brand !== undefined && brand !== null) {
      let brandIds = [];
      
      // Nếu brand là string (comma-separated), split thành array
      if (typeof brand === 'string') {
        brandIds = brand
          .split(',')
          .map(id => parseInt(id.trim(), 10))
          .filter(id => !isNaN(id));
      } 
      // Nếu brand là array (fallback cho trường hợp cũ)
      else if (Array.isArray(brand)) {
        brandIds = brand
          .map(b => typeof b === 'number' ? b : parseInt(String(b), 10))
          .filter(id => !isNaN(id));
      }
      // Nếu brand là single number
      else if (typeof brand === 'number') {
        brandIds = [brand];
      }
      // Nếu brand là single string number
      else {
        const brandId = parseInt(String(brand), 10);
        if (!isNaN(brandId)) {
          brandIds = [brandId];
        }
      }
      
      if (brandIds.length > 0) {
        if (brandIds.length === 1) {
          filter.brandRef = brandIds[0];
        } else {
          filter.brandRef = { $in: brandIds };
        }
      }
    }

    // Lọc theo giá (dùng priceNumber thay vì parse price string)
    if (minPrice || maxPrice) {
      const min = minPrice ? parseFloat(minPrice) : null;
      const max = maxPrice ? parseFloat(maxPrice) : null;
      
      // Dùng priceNumber thay vì parse price string
      if (min !== null && min >= 0 && max !== null && max < Infinity) {
        filter.priceNumber = { $gte: min, $lte: max };
      } else if (min !== null && min >= 0) {
        filter.priceNumber = { $gte: min };
      } else if (max !== null && max < Infinity) {
        filter.priceNumber = { $lte: max };
      }
    }

    // Lọc theo storage (model có field này)
    if (storage !== undefined && storage !== null) {
      let storageValues = [];
      
      // Nếu storage là string (comma-separated), split thành array
      if (typeof storage === 'string') {
        storageValues = storage.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (Array.isArray(storage)) {
        storageValues = storage.map(s => String(s).trim()).filter(s => s.length > 0);
      }
      
      if (storageValues.length > 0) {
        if (storageValues.length === 1) {
          filter.storage = { $regex: storageValues[0], $options: 'i' };
        } else {
          filter.storage = { $in: storageValues };
        }
      }
    }

    // Lọc theo screenSize (model có field này)
    if (screenSize !== undefined && screenSize !== null) {
      let screenSizeValues = [];
      
      // Nếu screenSize là string (comma-separated), split thành array
      if (typeof screenSize === 'string') {
        screenSizeValues = screenSize.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (Array.isArray(screenSize)) {
        screenSizeValues = screenSize.map(s => String(s).trim()).filter(s => s.length > 0);
      }
      
      if (screenSizeValues.length > 0) {
        if (screenSizeValues.length === 1) {
          filter.screenSize = { $regex: screenSizeValues[0], $options: 'i' };
        } else {
          filter.screenSize = { $in: screenSizeValues };
        }
      }
    }

    // Lọc theo search text (tìm kiếm trong name, sku, model, shortDescription)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchTerm = search.trim();
      // Escape special regex characters
      const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Search trong nhiều fields: name, sku, model, shortDescription
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { sku: { $regex: escapedSearch, $options: 'i' } },
        { model: { $regex: escapedSearch, $options: 'i' } },
        { shortDescription: { $regex: escapedSearch, $options: 'i' } }
      ];
    }

    // Xây dựng sort object
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Tính toán phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Debug: Log filter để kiểm tra
    console.log('🔍 getAllProducts - Final filter:', JSON.stringify(filter, null, 2));

    // Lấy sản phẩm với filter và sort
    const products = await Product.find(filter)
      .populate("brandRef", "name slug logoUrl")
      .populate("categoryRefs", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Đếm tổng số sản phẩm
    const total = await Product.countDocuments(filter);

    return {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy sản phẩm theo ID (hỗ trợ number _id, SKU, và slug)
  // Options: { includeDetail: boolean, includeImages: boolean, includeVariants: boolean }
  async getProductById(id, options = {}) {
    const { includeDetail = false, includeImages = false, includeVariants = false } = options;
    let product = null;
    let productId = null;
    
    // Convert to number nếu có thể
    const numericId = typeof id === 'number' 
      ? id 
      : parseInt(String(id).trim(), 10);
    
    // Ưu tiên tìm bằng numeric _id
    if (!isNaN(numericId)) {
      const found = await Product.findOne({ _id: numericId }).lean();
      if (found) {
        product = await populateProductReferences(found);
        productId = found._id;
      }
    }
    
    // Nếu không tìm thấy, thử tìm bằng SKU
    if (!product) {
      const stringId = String(id).trim();
      const found = await Product.findOne({ sku: stringId }).lean();
      if (found) {
        product = await populateProductReferences(found);
        productId = found._id;
      }
    }
    
    // Nếu vẫn không tìm thấy, thử tìm bằng slug
    if (!product) {
      const stringId = String(id).trim();
      const found = await Product.findOne({ slug: stringId }).lean();
      if (found) {
        product = await populateProductReferences(found);
        productId = found._id;
      }
    }
    
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }
    
    // Load additional data if requested
    if (productId) {
      const promises = [];
      
      if (includeDetail) {
        promises.push(
          ProductDetail.findOne({ productId }).lean().then(detail => {
            if (detail) product.detail = detail;
          })
        );
      }
      
      if (includeImages) {
        promises.push(
          ProductImage.find({ productId }).sort({ sortOrder: 1, createdAt: 1 }).lean().then(images => {
            if (images) {
              // Map to old format for backward compatibility
              product.images = images.map(img => ({
                url: img.url,
                highResUrl: img.highResUrl,
                alt: img.alt,
                color: img.color
              }));
            }
          })
        );
      }
      
      if (includeVariants) {
        promises.push(
          ProductVariant.find({ productId }).sort({ sortOrder: 1, createdAt: 1 }).lean().then(variants => {
            if (variants) {
              console.log('[Product Service] Variants from DB:', variants.map(v => ({ _id: v._id, sku: v.sku, type: v.type })));
              product.variants = variants;
              // Map variants to old format for backward compatibility
              const storageVariants = variants.filter(v => v.type === 'storage');
              const colorVariants = variants.filter(v => v.type === 'color');
              
              if (storageVariants.length > 0) {
                product.versions = storageVariants.map(v => {
                  const version = {
                    _id: v._id,
                    sku: v.sku,
                    label: v.label,
                    price: v.price
                  };
                  console.log('[Product Service] Mapped version:', version);
                  return version;
                });
              }
              
              if (colorVariants.length > 0) {
                product.colors = colorVariants.map(v => ({
                  _id: v._id,
                  name: v.label,
                  sku: v.sku,
                  price: v.price,
                  imageUrl: v.imageUrl
                }));
              }
            }
          })
        );
      }
      
      await Promise.all(promises);
    }
    
    return product;
  },

  // Lấy sản phẩm theo slug
  async getProductBySlug(slug, options = {}) {
    const found = await Product.findOne({ slug }).lean();
    if (!found) {
      throw new Error("Sản phẩm không tồn tại");
    }
    
    const product = await populateProductReferences(found);
    const productId = found._id;
    
    // Load additional data if requested
    if (productId) {
      const { includeDetail = false, includeImages = false, includeVariants = false } = options;
      const promises = [];
      
      if (includeDetail) {
        promises.push(
          ProductDetail.findOne({ productId }).lean().then(detail => {
            if (detail) product.detail = detail;
          })
        );
      }
      
      if (includeImages) {
        promises.push(
          ProductImage.find({ productId }).sort({ sortOrder: 1, createdAt: 1 }).lean().then(images => {
            if (images) {
              // Map to old format for backward compatibility
              product.images = images.map(img => ({
                url: img.url,
                highResUrl: img.highResUrl,
                alt: img.alt,
                color: img.color
              }));
            }
          })
        );
      }
      
      if (includeVariants) {
        promises.push(
          ProductVariant.find({ productId }).sort({ sortOrder: 1, createdAt: 1 }).lean().then(variants => {
            if (variants) {
              console.log('[Product Service] Variants from DB:', variants.map(v => ({ _id: v._id, sku: v.sku, type: v.type })));
              product.variants = variants;
              // Map variants to old format for backward compatibility
              const storageVariants = variants.filter(v => v.type === 'storage');
              const colorVariants = variants.filter(v => v.type === 'color');
              
              if (storageVariants.length > 0) {
                product.versions = storageVariants.map(v => {
                  const version = {
                    _id: v._id,
                    sku: v.sku,
                    label: v.label,
                    price: v.price
                  };
                  console.log('[Product Service] Mapped version:', version);
                  return version;
                });
              }
              
              if (colorVariants.length > 0) {
                product.colors = colorVariants.map(v => ({
                  _id: v._id,
                  name: v.label,
                  sku: v.sku,
                  price: v.price,
                  imageUrl: v.imageUrl
                }));
              }
            }
          })
        );
      }
      
      await Promise.all(promises);
    }
    
    return product;
  },

  // Cập nhật sản phẩm
  async updateProduct(id, updateData) {
    const allowedFields = [
      "name", "shortDescription", "price", "priceNumber", "oldPrice", "oldPriceNumber",
      "discount", "importPrice", "brandRef", "categoryRefs", "model", "thumbnail", "imageUrl",
      "stock", "sold", "rating", "reviewCount", "tags", "isActive", "availability",
      "isFeatured", "isNew", "isBestSeller", "slug", "sku",
      "cpu", "storage", "screenSize",
      "metaTitle", "metaDescription", "seoKeywords"
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Kiểm tra brand nếu có thay đổi
    if (filteredData.brandRef) {
      const brandId = typeof filteredData.brandRef === 'number' 
        ? filteredData.brandRef 
        : parseInt(String(filteredData.brandRef), 10);
      
      if (isNaN(brandId)) {
        throw new Error("brandRef phải là số");
      }
      
      const brand = await Brand.findOne({ _id: brandId });
      if (!brand) {
        throw new Error("Thương hiệu không tồn tại");
      }
    }

    // Kiểm tra categories nếu có thay đổi
    if (filteredData.categoryRefs && filteredData.categoryRefs.length > 0) {
      const categoryIds = filteredData.categoryRefs.map(catId => 
        typeof catId === 'number' ? catId : parseInt(String(catId), 10)
      ).filter(id => !isNaN(id));
      
      const categories = await Category.find({ _id: { $in: categoryIds } });
      if (categories.length !== categoryIds.length) {
        throw new Error("Một hoặc nhiều danh mục không tồn tại");
      }
    }

    // Tìm product bằng _id (number)
    let product = await findProductById(id);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }
    
    // Update product
    product = await Product.findOneAndUpdate(
      { _id: product._id },
      filteredData,
      { new: true, runValidators: true }
    )
    .populate("brandRef", "name slug logoUrl")
    .populate("categoryRefs", "name slug");

    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    return product;
  },

  // Xóa sản phẩm
  async deleteProduct(id) {
    // Tìm product bằng _id (number)
    let product = await findProductById(id);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }
    
    // Delete product
    product = await Product.findOneAndDelete({ _id: product._id });

    return { message: "Xóa sản phẩm thành công" };
  },

  // Lấy sản phẩm theo danh mục (many-to-many)
  async getProductsByCategory(categoryId, query = {}) {
    const {
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc",
      brand,
      minPrice,
      maxPrice,
      storage,
      screenSize,
      search, // Search query parameter
      inStock
    } = query;

    // categoryRefs là array of numbers
    // Convert categoryId to number
    const categoryNumId = typeof categoryId === 'number' 
      ? categoryId 
      : parseInt(String(categoryId).trim(), 10);
    
    if (isNaN(categoryNumId)) {
      throw new Error("Category ID không hợp lệ");
    }
    
    const filter = { 
      categoryRefs: categoryNumId, // MongoDB tự động match với array (categoryRefs là array)
      isActive: true // Chỉ lấy sản phẩm active
    };
    
    // Debug: Log filter để kiểm tra
    console.log('🔍 getProductsByCategory - categoryId:', categoryId);
    console.log('🔍 getProductsByCategory - categoryNumId:', categoryNumId);
    console.log('🔍 getProductsByCategory - query params:', JSON.stringify(query, null, 2));
    console.log('🔍 getProductsByCategory - brand type:', typeof brand, 'value:', brand);
    console.log('🔍 getProductsByCategory - brand isArray:', Array.isArray(brand));

    // Lọc theo thương hiệu
    // Frontend gửi brand dưới dạng comma-separated string: "8,9,10"
    // Đơn giản hơn nhiều so với xử lý brand[] array
    if (brand !== undefined && brand !== null) {
      let brandIds = [];
      
      // Nếu brand là string (comma-separated), split thành array
      if (typeof brand === 'string') {
        brandIds = brand
          .split(',')
          .map(id => parseInt(id.trim(), 10))
          .filter(id => !isNaN(id));
      } 
      // Nếu brand là array (fallback cho trường hợp cũ)
      else if (Array.isArray(brand)) {
        brandIds = brand
          .map(b => typeof b === 'number' ? b : parseInt(String(b), 10))
          .filter(id => !isNaN(id));
      }
      // Nếu brand là single number
      else if (typeof brand === 'number') {
        brandIds = [brand];
      }
      // Nếu brand là single string number
      else {
        const brandId = parseInt(String(brand), 10);
        if (!isNaN(brandId)) {
          brandIds = [brandId];
        } else {
          // Nếu brand là name string, tìm brand trước
          const brandDoc = await Brand.findOne({ name: { $regex: brand, $options: "i" } });
          if (brandDoc) {
            brandIds = [brandDoc._id];
          }
        }
      }
      
      if (brandIds.length > 0) {
        if (brandIds.length === 1) {
          filter.brandRef = brandIds[0];
        } else {
          filter.brandRef = { $in: brandIds };
        }
      }
    }

    // Lọc theo tồn kho
    if (inStock !== undefined) {
      if (inStock === "true" || inStock === true) {
        filter.stock = { $gt: 0 };
      } else if (inStock === "false" || inStock === false) {
        filter.stock = { $lte: 0 };
      }
    }

    // Lọc theo giá (dùng priceNumber thay vì parse price string)
    // priceNumber là number field trong Product model, dễ query hơn
    if (minPrice || maxPrice) {
      const min = minPrice ? parseFloat(minPrice) : null;
      const max = maxPrice ? parseFloat(maxPrice) : null;
      
      // Dùng priceNumber thay vì parse price string
      if (min !== null && min >= 0 && max !== null && max < Infinity) {
        filter.priceNumber = { $gte: min, $lte: max };
      } else if (min !== null && min >= 0) {
        filter.priceNumber = { $gte: min };
      } else if (max !== null && max < Infinity) {
        filter.priceNumber = { $lte: max };
      }
    }

    // Lọc theo storage (model có field này)
    if (storage !== undefined && storage !== null) {
      let storageValues = [];
      
      // Nếu storage là string (comma-separated), split thành array
      if (typeof storage === 'string') {
        storageValues = storage.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (Array.isArray(storage)) {
        storageValues = storage.map(s => String(s).trim()).filter(s => s.length > 0);
      }
      
      if (storageValues.length > 0) {
        if (storageValues.length === 1) {
          filter.storage = { $regex: storageValues[0], $options: 'i' };
        } else {
          filter.storage = { $in: storageValues };
        }
      }
    }

    // Lọc theo screenSize (model có field này)
    if (screenSize !== undefined && screenSize !== null) {
      let screenSizeValues = [];
      
      // Nếu screenSize là string (comma-separated), split thành array
      if (typeof screenSize === 'string') {
        screenSizeValues = screenSize.split(',').map(s => s.trim()).filter(s => s.length > 0);
      } else if (Array.isArray(screenSize)) {
        screenSizeValues = screenSize.map(s => String(s).trim()).filter(s => s.length > 0);
      }
      
      if (screenSizeValues.length > 0) {
        if (screenSizeValues.length === 1) {
          filter.screenSize = { $regex: screenSizeValues[0], $options: 'i' };
        } else {
          filter.screenSize = { $in: screenSizeValues };
        }
      }
    }

    // Lọc theo search text (tìm kiếm trong name, sku, model, shortDescription)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const searchTerm = search.trim();
      // Escape special regex characters
      const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Search trong nhiều fields: name, sku, model, shortDescription
      // Nếu đã có $or từ filter khác, merge vào
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          {
            $or: [
              { name: { $regex: escapedSearch, $options: 'i' } },
              { sku: { $regex: escapedSearch, $options: 'i' } },
              { model: { $regex: escapedSearch, $options: 'i' } },
              { shortDescription: { $regex: escapedSearch, $options: 'i' } }
            ]
          }
        ];
        delete filter.$or;
      } else {
        filter.$or = [
          { name: { $regex: escapedSearch, $options: 'i' } },
          { sku: { $regex: escapedSearch, $options: 'i' } },
          { model: { $regex: escapedSearch, $options: 'i' } },
          { shortDescription: { $regex: escapedSearch, $options: 'i' } }
        ];
      }
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Debug: Log final filter
    console.log('🔍 getProductsByCategory - Final filter:', JSON.stringify(filter, null, 2));
    console.log('🔍 getProductsByCategory - Sort:', sort);
    console.log('🔍 getProductsByCategory - Skip:', skip, 'Limit:', parseInt(limit));

    try {
      console.log('🔍 getProductsByCategory - Starting Product.find()...');
      const products = await Product.find(filter)
        .populate("brandRef", "name slug logoUrl")
        .populate("categoryRefs", "name slug")
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));
      
      console.log('🔍 getProductsByCategory - Product.find() completed, products count:', products.length);

      const total = await Product.countDocuments(filter);
      
      // Debug: Log results
      console.log(`📊 getProductsByCategory - Found ${products.length} products (total: ${total})`);
      if (products.length > 0) {
        console.log('📦 First product sample:', {
          _id: products[0]._id,
          name: products[0].name,
          price: products[0].price,
          categoryRefs: products[0].categoryRefs,
          isActive: products[0].isActive
        });
      } else {
        // Debug: Test query without price filter
        const testFilter = { categoryRefs: categoryNumId };
        const testCount = await Product.countDocuments(testFilter);
        console.log(`⚠️ Test query without price filter: ${testCount} products found`);
        
        // Test với isActive
        const testFilter2 = { categoryRefs: categoryNumId, isActive: true };
        const testCount2 = await Product.countDocuments(testFilter2);
        console.log(`⚠️ Test query with isActive=true: ${testCount2} products found`);
      }

      return {
        products,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      };
    } catch (error) {
      console.error('❌ Error in getProductsByCategory:', error);
      console.error('❌ Error stack:', error.stack);
      throw error; // Re-throw để errorHandler xử lý
    }
  },

  // Lấy sản phẩm theo categoryId (API mới cho CategorySidebar)
  async getProductsByCategoryId(categoryId, query = {}) {
    const {
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    const numericCategoryId = typeof categoryId === 'number' 
      ? categoryId 
      : parseInt(String(categoryId).trim(), 10);
    
    if (isNaN(numericCategoryId)) {
      return {
        products: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parseInt(limit)
        }
      };
    }

    // Filter theo categoryId trong categoryRefs array
    const filter = {
      categoryRefs: numericCategoryId,
      isActive: true
    };

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate("brandRef", "name slug logoUrl")
      .populate("categoryRefs", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate products manually
    const populatedProducts = await Promise.all(
      products.map(product => populateProductReferences(product))
    );

    const total = await Product.countDocuments(filter);

    return {
      products: populatedProducts,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy sản phẩm chỉ filter theo categoryRefs (đơn giản, không có filter khác)
  async getProductsByCategoryRefs(categoryRefs, query = {}) {
    const {
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    // Xử lý categoryRefs: có thể là string (single) hoặc array (multiple)
    let categoryIds = [];
    
    if (Array.isArray(categoryRefs)) {
      // Nếu là array, convert tất cả sang number
      categoryIds = categoryRefs
        .map(cat => typeof cat === 'number' ? cat : parseInt(String(cat), 10))
        .filter(id => !isNaN(id));
    } else if (typeof categoryRefs === 'string') {
      // Nếu là string, có thể là single ID hoặc comma-separated IDs
      if (categoryRefs.includes(',')) {
        // Comma-separated: "id1,id2,id3"
        categoryIds = categoryRefs
          .split(',')
          .map(cat => parseInt(cat.trim(), 10))
          .filter(id => !isNaN(id));
      } else {
        // Single ID
        const parsed = parseInt(categoryRefs.trim(), 10);
        if (!isNaN(parsed)) {
          categoryIds = [parsed];
        }
      }
    } else if (typeof categoryRefs === 'number') {
      categoryIds = [categoryRefs];
    }

    if (categoryIds.length === 0) {
      return {
        products: [],
        pagination: {
          currentPage: parseInt(page),
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parseInt(limit)
        }
      };
    }

    // Filter chỉ theo categoryRefs
    const filter = {
      categoryRefs: categoryIds.length === 1 
        ? categoryIds[0]  // Single category: direct match
        : { $in: categoryIds }  // Multiple categories: match any
    };

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate("brandRef", "name slug logoUrl")
      .populate("categoryRefs", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    return {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy sản phẩm nổi bật
  async getFeaturedProducts(limit = 8) {
    return Product.find({ 
      isActive: true, 
      isFeatured: true 
    })
    .populate("brandRef", "name slug logoUrl")
    .populate("categoryRefs", "name slug")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
  },

  // Lấy sản phẩm mới
  async getNewProducts(limit = 8) {
    return Product.find({ 
      isActive: true, 
      isNew: true 
    })
    .populate("brandRef", "name slug logoUrl")
    .populate("categoryRefs", "name slug")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
  },

  // Lấy sản phẩm bán chạy
  async getBestSellerProducts(limit = 8) {
    return Product.find({ 
      isActive: true, 
      isBestSeller: true 
    })
    .populate("brandRef", "name slug logoUrl")
    .populate("categoryRefs", "name slug")
    .sort({ sold: -1 })
    .limit(parseInt(limit));
  },

  /**
   * Lấy sản phẩm theo loại với pagination (API mới)
   * @param {string} type - 'featured', 'new', 'bestSeller'
   * @param {object} query - Pagination và filter params
   */
  async getProductsByType(type, query = {}) {
    const {
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    // Validate type
    const validTypes = ['featured', 'new', 'bestSeller'];
    if (!validTypes.includes(type)) {
      throw new AppError(`Loại sản phẩm không hợp lệ. Chỉ chấp nhận: ${validTypes.join(', ')}`, 400);
    }

    // Build filter
    const filter = {
      isActive: true
    };

    // Add type filter
    switch (type) {
      case 'featured':
        filter.isFeatured = true;
        break;
      case 'new':
        filter.isNew = true;
        break;
      case 'bestSeller':
        filter.isBestSeller = true;
        break;
    }

    // Build sort
    const sort = {};
    if (sortBy === 'sold' && type === 'bestSeller') {
      sort.sold = sortOrder === 'desc' ? -1 : 1;
    } else if (sortBy === 'createdAt' && type === 'new') {
      sort.createdAt = sortOrder === 'desc' ? -1 : 1;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Query products
    const products = await Product.find(filter)
      .populate("brandRef", "name slug logoUrl")
      .populate("categoryRefs", "name slug")
      .select("name slug sku price priceNumber oldPrice oldPriceNumber thumbnail imageUrl stock sold rating reviewCount isFeatured isNew isBestSeller brandRef categoryRefs")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Product.countDocuments(filter);

    return {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy sản phẩm liên quan (dựa vào categoryRefs chung)
  async getRelatedProducts(productId, limit = 4) {
    const product = await findProductById(productId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    // Convert productId to number for comparison
    const productNumId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId), 10);

    // Tìm products có ít nhất 1 category chung
    const relatedProducts = await Product.find({
      _id: { $ne: productNumId },
      categoryRefs: { $in: product.categoryRefs },
      isActive: true
    })
    .populate("brandRef", "name slug logoUrl")
    .populate("categoryRefs", "name slug")
    .sort({ rating: -1, sold: -1 })
    .limit(parseInt(limit));

    return relatedProducts;
  },

  // Tìm kiếm sản phẩm
  // API search nhanh cho dropdown (tối đa 4 sản phẩm, sort theo bán chạy)
  async quickSearchProducts(searchTerm, limit = 4) {
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 2) {
      return {
        products: [],
        total: 0
      };
    }

    const searchTermTrimmed = searchTerm.trim();
    const escapedSearch = searchTermTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const filter = {
      isActive: true,
      $or: [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { sku: { $regex: escapedSearch, $options: 'i' } },
        { model: { $regex: escapedSearch, $options: 'i' } },
        { shortDescription: { $regex: escapedSearch, $options: 'i' } }
      ]
    };

    const products = await Product.find(filter)
      .populate("brandRef", "name slug logoUrl")
      .populate("categoryRefs", "name slug")
      .sort({ sold: -1, createdAt: -1 })
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    return {
      products,
      total
    };
  },

  async searchProducts(searchTerm, query = {}) {
    const {
      page = 1,
      limit = 12,
      category,
      brand,
      minPrice,
      maxPrice,
      sortBy = "relevance",
      sortOrder = "desc"
    } = query;

    const filter = {
      $text: { $search: searchTerm },
      isActive: true
    };

    // Thêm các filter khác
    if (category) {
      const categoryId = typeof category === 'number' 
        ? category 
        : parseInt(String(category), 10);
      if (!isNaN(categoryId)) {
        filter.categoryRefs = categoryId;
      }
    }
    
    if (brand) {
      const brandId = typeof brand === 'number' 
        ? brand 
        : parseInt(String(brand), 10);
      
      if (!isNaN(brandId)) {
        filter.brandRef = brandId;
      } else {
        // Nếu brand là name string, tìm brand trước
        const brandDoc = await Brand.findOne({ name: { $regex: brand, $options: "i" } });
        if (brandDoc) {
          filter.brandRef = brandDoc._id;
        }
      }
    }
    
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Xây dựng sort
    const sort = {};
    if (sortBy === "relevance") {
      sort.score = { $meta: "textScore" };
    } else {
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate("brandRef", "name slug logoUrl")
      .populate("categoryRefs", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(filter);

    return {
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Cập nhật số lượng tồn kho
  async updateStock(productId, quantity, operation = "set") {
    const product = await findProductById(productId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    switch (operation) {
      case "add":
        product.stock += quantity;
        break;
      case "subtract":
        product.stock = Math.max(0, product.stock - quantity);
        break;
      case "set":
      default:
        product.stock = quantity;
        break;
    }

    await product.save();
    return product;
  },

  // Cập nhật số lượng đã bán
  async updateSold(productId, quantity) {
    const product = await findProductById(productId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    product.sold += quantity;
    await product.save();
    return product;
  },

  // Cập nhật đánh giá
  async updateRating(productId, rating, reviewCount) {
    const product = await findProductById(productId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    product.rating = rating;
    product.reviewCount = reviewCount;
    await product.save();
    return product;
  },

  // Toggle trạng thái active
  async toggleActive(id) {
    const product = await findProductById(id);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    product.isActive = !product.isActive;
    await product.save();
    
    return product;
  },

  // Lấy thống kê sản phẩm
  async getProductStats() {
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const featuredProducts = await Product.countDocuments({ isFeatured: true });
    const newProducts = await Product.countDocuments({ isNew: true });
    const outOfStock = await Product.countDocuments({ stock: 0 });
    
    const totalSold = await Product.aggregate([
      { $group: { _id: null, total: { $sum: "$sold" } } }
    ]);

    return {
      totalProducts,
      activeProducts,
      inactiveProducts: totalProducts - activeProducts,
      featuredProducts,
      newProducts,
      outOfStock,
      totalSold: totalSold[0]?.total || 0
    };
  },

  // Lấy danh sách thương hiệu từ Brand collection (không dùng distinct từ Product nữa)
  async getBrands() {
    return Brand.find({ isActive: true })
      .select("name slug logoUrl")
      .sort({ name: 1 });
  },

  // Lấy danh sách tags
  async getTags() {
    const tags = await Product.distinct("tags", { isActive: true });
    return tags.filter(tag => tag).sort();
  }
};


