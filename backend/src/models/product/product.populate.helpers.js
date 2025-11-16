/**
 * Manual Population Helpers for Product
 * Vì Mongoose populate không hoạt động đúng với Number IDs,
 * nên cần manual populate brand và categories
 */

import { Brand } from "../brand/brand.model.js";
import { Category } from "../category/category.model.js";

/**
 * Populate brand và categories cho một product
 */
export async function populateProductReferences(product) {
  if (!product) return product;

  // Populate brandRef
  if (product.brandRef) {
    const brandId = typeof product.brandRef === 'number' 
      ? product.brandRef 
      : parseInt(String(product.brandRef), 10);
    
    if (!isNaN(brandId)) {
      const brand = await Brand.findOne({ _id: brandId })
        .select("name slug logoUrl description")
        .lean();
      if (brand) {
        product.brandRef = brand;
      }
    }
  }

  // Populate categoryRefs
  if (product.categoryRefs && Array.isArray(product.categoryRefs) && product.categoryRefs.length > 0) {
    const categoryIds = product.categoryRefs
      .map(catId => typeof catId === 'number' ? catId : parseInt(String(catId), 10))
      .filter(id => !isNaN(id));
    
    if (categoryIds.length > 0) {
      const categories = await Category.find({ _id: { $in: categoryIds } })
        .select("name slug description")
        .lean();
      
      // Map categories back to categoryRefs
      const categoryMap = new Map();
      categories.forEach(cat => {
        categoryMap.set(cat._id, cat);
      });
      
      product.categoryRefs = product.categoryRefs.map(catId => {
        const numId = typeof catId === 'number' ? catId : parseInt(String(catId), 10);
        return categoryMap.get(numId) || catId;
      });
    }
  }

  return product;
}

/**
 * Populate brand và categories cho nhiều products
 */
export async function populateProductsReferences(products) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return products;
  }

  // Collect all brand and category IDs
  const brandIds = new Set();
  const categoryIds = new Set();

  products.forEach(product => {
    if (product.brandRef) {
      const brandId = typeof product.brandRef === 'number' 
        ? product.brandRef 
        : parseInt(String(product.brandRef), 10);
      if (!isNaN(brandId)) {
        brandIds.add(brandId);
      }
    }

    if (product.categoryRefs && Array.isArray(product.categoryRefs)) {
      product.categoryRefs.forEach(catId => {
        const numId = typeof catId === 'number' ? catId : parseInt(String(catId), 10);
        if (!isNaN(numId)) {
          categoryIds.add(numId);
        }
      });
    }
  });

  // Fetch all brands and categories in one query
  const [brands, categories] = await Promise.all([
    brandIds.size > 0 ? Brand.find({ _id: { $in: Array.from(brandIds) } })
      .select("name slug logoUrl description")
      .lean() : [],
    categoryIds.size > 0 ? Category.find({ _id: { $in: Array.from(categoryIds) } })
      .select("name slug description")
      .lean() : []
  ]);

  // Create maps for quick lookup
  const brandMap = new Map();
  brands.forEach(brand => {
    brandMap.set(brand._id, brand);
  });

  const categoryMap = new Map();
  categories.forEach(cat => {
    categoryMap.set(cat._id, cat);
  });

  // Populate each product
  return products.map(product => {
    const populated = { ...product };

    // Populate brandRef
    if (product.brandRef) {
      const brandId = typeof product.brandRef === 'number' 
        ? product.brandRef 
        : parseInt(String(product.brandRef), 10);
      if (!isNaN(brandId) && brandMap.has(brandId)) {
        populated.brandRef = brandMap.get(brandId);
      }
    }

    // Populate categoryRefs
    if (product.categoryRefs && Array.isArray(product.categoryRefs)) {
      populated.categoryRefs = product.categoryRefs.map(catId => {
        const numId = typeof catId === 'number' ? catId : parseInt(String(catId), 10);
        return categoryMap.get(numId) || catId;
      });
    }

    return populated;
  });
}

