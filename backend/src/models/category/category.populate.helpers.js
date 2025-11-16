/**
 * Manual Population Helpers for Category
 * Vì Mongoose populate không hoạt động đúng với Number IDs,
 * nên cần manual populate parentCategory
 */

import { Category } from "./category.model.js";

/**
 * Populate parentCategory cho một category
 */
export async function populateCategoryParent(category) {
  if (!category) return category;

  // Populate parentCategory
  if (category.parentCategory) {
    const parentId = typeof category.parentCategory === 'number' 
      ? category.parentCategory 
      : parseInt(String(category.parentCategory), 10);
    
    if (!isNaN(parentId)) {
      const parent = await Category.findOne({ _id: parentId })
        .select("name slug")
        .lean();
      if (parent) {
        category.parentCategory = parent;
      }
    }
  }

  return category;
}

/**
 * Populate parentCategory cho nhiều categories
 */
export async function populateCategoriesParent(categories) {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return categories;
  }

  // Collect all parent IDs
  const parentIds = new Set();
  categories.forEach(category => {
    if (category.parentCategory) {
      const parentId = typeof category.parentCategory === 'number' 
        ? category.parentCategory 
        : parseInt(String(category.parentCategory), 10);
      if (!isNaN(parentId)) {
        parentIds.add(parentId);
      }
    }
  });

  // Fetch all parents in one query
  const parents = parentIds.size > 0 
    ? await Category.find({ _id: { $in: Array.from(parentIds) } })
        .select("name slug")
        .lean()
    : [];

  // Create map for quick lookup
  const parentMap = new Map();
  parents.forEach(parent => {
    parentMap.set(parent._id, parent);
  });

  // Populate each category
  return categories.map(category => {
    const populated = { ...category };

    if (category.parentCategory) {
      const parentId = typeof category.parentCategory === 'number' 
        ? category.parentCategory 
        : parseInt(String(category.parentCategory), 10);
      if (!isNaN(parentId) && parentMap.has(parentId)) {
        populated.parentCategory = parentMap.get(parentId);
      }
    }

    return populated;
  });
}

