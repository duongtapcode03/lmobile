import { Category } from "./category.model.js";

export const categoryService = {
  // Tạo danh mục mới
  async createCategory(data) {
    try {
      const category = new Category(data);
      await category.save();
      return category;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Tên danh mục hoặc slug đã tồn tại");
      }
      throw error;
    }
  },

  // Lấy tất cả danh mục với phân trang và lọc
  async getAllCategories(query = {}) {
    const {
      page = 1,
      limit = 10,
      search = "",
      isActive,
      parentCategory,
      sortBy = "sortOrder",
      sortOrder = "asc"
    } = query;

    // Xây dựng filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (parentCategory) {
      if (parentCategory === "null") {
        filter.parentCategory = null;
      } else {
        filter.parentCategory = parentCategory;
      }
    }

    // Xây dựng sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Tính toán phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const categories = await Category.find(filter)
      .populate("parentCategory", "name slug")
      .populate("productCount")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Category.countDocuments(filter);

    return {
      categories,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy danh mục theo ID
  async getCategoryById(id) {
    const category = await Category.findById(id)
      .populate("parentCategory", "name slug")
      .populate("productCount")
      .populate("subCategories", "name slug isActive");
    
    if (!category) {
      throw new Error("Danh mục không tồn tại");
    }
    
    return category;
  },

  // Lấy danh mục theo slug
  async getCategoryBySlug(slug) {
    const category = await Category.findOne({ slug })
      .populate("parentCategory", "name slug")
      .populate("productCount")
      .populate("subCategories", "name slug isActive");
    
    if (!category) {
      throw new Error("Danh mục không tồn tại");
    }
    
    return category;
  },

  // Cập nhật danh mục
  async updateCategory(id, updateData) {
    const allowedFields = [
      "name", "description", "image", "icon", "isActive", 
      "sortOrder", "parentCategory", "metaTitle", "metaDescription"
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    const category = await Category.findByIdAndUpdate(
      id,
      filteredData,
      { new: true, runValidators: true }
    ).populate("parentCategory", "name slug");

    if (!category) {
      throw new Error("Danh mục không tồn tại");
    }

    return category;
  },

  // Xóa danh mục
  async deleteCategory(id) {
    // Kiểm tra xem danh mục có sản phẩm không
    const { Product } = await import("../product/product.model.js");
    const productCount = await Product.countDocuments({ category: id });
    
    if (productCount > 0) {
      throw new Error("Không thể xóa danh mục có sản phẩm");
    }

    // Kiểm tra xem có danh mục con không
    const subCategoryCount = await Category.countDocuments({ parentCategory: id });
    if (subCategoryCount > 0) {
      throw new Error("Không thể xóa danh mục có danh mục con");
    }

    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      throw new Error("Danh mục không tồn tại");
    }

    return { message: "Xóa danh mục thành công" };
  },

  // Lấy danh mục cấp cha (không có parentCategory)
  async getParentCategories() {
    return Category.find({ 
      parentCategory: null, 
      isActive: true 
    })
    .populate("productCount")
    .sort({ sortOrder: 1, name: 1 });
  },

  // Lấy danh mục con theo danh mục cha
  async getSubCategories(parentId) {
    return Category.find({ 
      parentCategory: parentId, 
      isActive: true 
    })
    .populate("productCount")
    .sort({ sortOrder: 1, name: 1 });
  },

  // Lấy tất cả danh mục active (cho dropdown, menu)
  async getActiveCategories() {
    return Category.find({ isActive: true })
      .populate("parentCategory", "name slug")
      .populate("productCount")
      .sort({ sortOrder: 1, name: 1 });
  },

  // Cập nhật thứ tự sắp xếp
  async updateSortOrder(categories) {
    const updatePromises = categories.map(({ id, sortOrder }) =>
      Category.findByIdAndUpdate(id, { sortOrder })
    );
    
    await Promise.all(updatePromises);
    return { message: "Cập nhật thứ tự thành công" };
  },

  // Toggle trạng thái active
  async toggleActive(id) {
    const category = await Category.findById(id);
    if (!category) {
      throw new Error("Danh mục không tồn tại");
    }

    category.isActive = !category.isActive;
    await category.save();
    
    return category;
  },

  // Lấy thống kê danh mục
  async getCategoryStats() {
    const totalCategories = await Category.countDocuments();
    const activeCategories = await Category.countDocuments({ isActive: true });
    const parentCategories = await Category.countDocuments({ parentCategory: null });
    
    return {
      totalCategories,
      activeCategories,
      inactiveCategories: totalCategories - activeCategories,
      parentCategories,
      subCategories: totalCategories - parentCategories
    };
  }
};
