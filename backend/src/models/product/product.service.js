import { Product } from "./product.model.js";
import { Category } from "../category/category.model.js";

export const productService = {
  // Tạo sản phẩm mới
  async createProduct(data) {
    try {
      // Kiểm tra danh mục tồn tại
      const category = await Category.findById(data.category);
      if (!category) {
        throw new Error("Danh mục không tồn tại");
      }

      const product = new Product(data);
      await product.save();
      
      // Populate category info
      await product.populate("category", "name slug");
      
      return product;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("SKU hoặc slug đã tồn tại");
      }
      throw error;
    }
  },

  // Lấy tất cả sản phẩm với phân trang, lọc và tìm kiếm
  async getAllProducts(query = {}) {
    const {
      page = 1,
      limit = 12,
      search = "",
      category,
      brand,
      minPrice,
      maxPrice,
      isActive,
      isFeatured,
      isNew,
      isBestSeller,
      sortBy = "createdAt",
      sortOrder = "desc",
      tags,
      inStock
    } = query;

    // Xây dựng filter
    const filter = {};
    
    // Tìm kiếm theo tên, mô tả, thương hiệu
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
        { model: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } }
      ];
    }

    // Lọc theo danh mục
    if (category) {
      filter.category = category;
    }

    // Lọc theo thương hiệu
    if (brand) {
      filter.brand = { $regex: brand, $options: "i" };
    }

    // Lọc theo giá
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Lọc theo trạng thái
    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (isFeatured !== undefined) {
      filter.isFeatured = isFeatured === "true";
    }

    if (isNew !== undefined) {
      filter.isNew = isNew === "true";
    }

    if (isBestSeller !== undefined) {
      filter.isBestSeller = isBestSeller === "true";
    }

    // Lọc theo tags
    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      filter.tags = { $in: tagArray };
    }

    // Lọc theo tồn kho
    if (inStock !== undefined) {
      if (inStock === "true") {
        filter.stock = { $gt: 0 };
      } else if (inStock === "false") {
        filter.stock = { $lte: 0 };
      }
    }

    // Xây dựng sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Tính toán phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate("category", "name slug")
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

  // Lấy sản phẩm theo ID
  async getProductById(id) {
    const product = await Product.findById(id)
      .populate("category", "name slug description");
    
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }
    
    return product;
  },

  // Lấy sản phẩm theo slug
  async getProductBySlug(slug) {
    const product = await Product.findOne({ slug })
      .populate("category", "name slug description");
    
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }
    
    return product;
  },

  // Cập nhật sản phẩm
  async updateProduct(id, updateData) {
    const allowedFields = [
      "name", "description", "shortDescription", "price", "originalPrice", 
      "discount", "category", "brand", "model", "images", "thumbnail",
      "specifications", "variants", "stock", "tags", "isActive", 
      "isFeatured", "isNew", "isBestSeller", "warranty", 
      "metaTitle", "metaDescription", "seoKeywords"
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Kiểm tra danh mục nếu có thay đổi
    if (filteredData.category) {
      const category = await Category.findById(filteredData.category);
      if (!category) {
        throw new Error("Danh mục không tồn tại");
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      filteredData,
      { new: true, runValidators: true }
    ).populate("category", "name slug");

    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    return product;
  },

  // Xóa sản phẩm
  async deleteProduct(id) {
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    return { message: "Xóa sản phẩm thành công" };
  },

  // Lấy sản phẩm theo danh mục
  async getProductsByCategory(categoryId, query = {}) {
    const {
      page = 1,
      limit = 12,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    const filter = { category: categoryId, isActive: true };
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(filter)
      .populate("category", "name slug")
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
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
  },

  // Lấy sản phẩm mới
  async getNewProducts(limit = 8) {
    return Product.find({ 
      isActive: true, 
      isNew: true 
    })
    .populate("category", "name slug")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
  },

  // Lấy sản phẩm bán chạy
  async getBestSellerProducts(limit = 8) {
    return Product.find({ 
      isActive: true, 
      isBestSeller: true 
    })
    .populate("category", "name slug")
    .sort({ sold: -1 })
    .limit(parseInt(limit));
  },

  // Lấy sản phẩm liên quan
  async getRelatedProducts(productId, limit = 4) {
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    return Product.find({
      _id: { $ne: productId },
      category: product.category,
      isActive: true
    })
    .populate("category", "name slug")
    .sort({ rating: -1, sold: -1 })
    .limit(parseInt(limit));
  },

  // Tìm kiếm sản phẩm
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
    if (category) filter.category = category;
    if (brand) filter.brand = { $regex: brand, $options: "i" };
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
      .populate("category", "name slug")
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
    const product = await Product.findById(productId);
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
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    product.sold += quantity;
    await product.save();
    return product;
  },

  // Cập nhật đánh giá
  async updateRating(productId, rating, reviewCount) {
    const product = await Product.findById(productId);
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
    const product = await Product.findById(id);
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

  // Lấy danh sách thương hiệu
  async getBrands() {
    return Product.distinct("brand", { isActive: true }).sort();
  },

  // Lấy danh sách tags
  async getTags() {
    const tags = await Product.distinct("tags", { isActive: true });
    return tags.filter(tag => tag).sort();
  }
};
