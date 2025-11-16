import FlashSale from "./flashSale.model.js";
import { Product } from "../product/product.model.js";
import { populateProductReferences } from "../product/product.populate.helpers.js";

/**
 * Helper function để tìm flash sale
 */
export async function findFlashSaleById(id) {
  if (!id) return null;
  
  const numericId = typeof id === 'number' 
    ? id 
    : parseInt(String(id).trim(), 10);
  
  if (isNaN(numericId)) {
    return null;
  }
  
  return await FlashSale.findOne({ id: numericId });
}

export const flashSaleService = {
  // Lấy tất cả flash sales (Admin - bao gồm cả đã hết hàng)
  async getAllFlashSales(query = {}) {
    const {
      page = 1,
      limit = 20,
      session_id,
      status, // 'all', 'available', 'soldOut'
      sortBy = "created_at",
      sortOrder = "desc"
    } = query;

    const filter = {};
    
    if (session_id) {
      filter.session_id = session_id;
    }

    // Filter theo status
    if (status === 'available') {
      filter.$expr = { $lt: ["$sold", "$total_stock"] };
    } else if (status === 'soldOut') {
      filter.$expr = { $gte: ["$sold", "$total_stock"] };
    }
    // Nếu status === 'all' hoặc không có, lấy tất cả

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await FlashSale.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate product info manually
    const productIds = items.map(item => item.product_id).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product._id, product);
    });

    // Populate products
    const populatedItems = await Promise.all(
      items.map(async (item) => {
        const product = productMap.get(item.product_id);
        if (product) {
          const populatedProduct = await populateProductReferences(product);
          return {
            ...item,
            product: populatedProduct
          };
        }
        return item;
      })
    );

    const total = await FlashSale.countDocuments(filter);

    return {
      items: populatedItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy tất cả flash sales đang active
  async getActiveFlashSales(query = {}) {
    const {
      page = 1,
      limit = 20,
      session_id,
      sortBy = "sort_order",
      sortOrder = "asc"
    } = query;

    const filter = {};
    
    if (session_id) {
      filter.session_id = session_id;
    }

    // Chỉ lấy items còn hàng (sold < total_stock)
    filter.$expr = { $lt: ["$sold", "$total_stock"] };

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await FlashSale.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate product info manually
    const productIds = items.map(item => item.product_id).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product._id, product);
    });

    // Populate products
    const populatedItems = await Promise.all(
      items.map(async (item) => {
        const product = productMap.get(item.product_id);
        if (product) {
          const populatedProduct = await populateProductReferences(product);
          return {
            ...item,
            product: populatedProduct
          };
        }
        return item;
      })
    );

    const total = await FlashSale.countDocuments(filter);

    return {
      items: populatedItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy flash sales theo session_id
  async getFlashSalesBySession(sessionId, query = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = "sort_order",
      sortOrder = "asc"
    } = query;

    const filter = {
      session_id: sessionId,
      $expr: { $lt: ["$sold", "$total_stock"] } // Còn hàng
    };

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await FlashSale.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Populate products
    const productIds = items.map(item => item.product_id).filter(Boolean);
    const products = await Product.find({ _id: { $in: productIds } }).lean();
    const productMap = new Map();
    products.forEach(product => {
      productMap.set(product._id, product);
    });

    const populatedItems = await Promise.all(
      items.map(async (item) => {
        const product = productMap.get(item.product_id);
        if (product) {
          const populatedProduct = await populateProductReferences(product);
          return {
            ...item,
            product: populatedProduct
          };
        }
        return item;
      })
    );

    const total = await FlashSale.countDocuments(filter);

    return {
      items: populatedItems,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Kiểm tra flash sale availability
  async checkAvailability(productId, quantity = 1) {
    const numericProductId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericProductId)) {
      return { available: false, reason: "Product ID không hợp lệ" };
    }

    const item = await FlashSale.findOne({ 
      product_id: numericProductId,
      $expr: { $lt: ["$sold", "$total_stock"] }
    }).lean();

    if (!item) {
      return { available: false, reason: "Sản phẩm không có flash sale hoặc đã hết hàng" };
    }

    const remaining = item.total_stock - item.sold;
    if (remaining < quantity) {
      return { 
        available: false, 
        reason: `Chỉ còn ${remaining} sản phẩm`,
        remaining 
      };
    }

    if (quantity > item.limit_per_user) {
      return { 
        available: false, 
        reason: `Chỉ được mua tối đa ${item.limit_per_user} sản phẩm`,
        limitPerUser: item.limit_per_user
      };
    }

    return { 
      available: true, 
      flash_price: item.flash_price,
      remaining,
      limitPerUser: item.limit_per_user,
      item
    };
  },

  // Cập nhật số lượng đã bán
  async updateSold(id, quantity, operation = "add") {
    const item = await findFlashSaleById(id);
    if (!item) {
      throw new Error("Flash sale không tồn tại");
    }

    if (operation === "add") {
      item.sold = (item.sold || 0) + quantity;
      if (item.sold > item.total_stock) {
        item.sold = item.total_stock;
      }
    } else if (operation === "subtract") {
      item.sold = Math.max(0, (item.sold || 0) - quantity);
    } else {
      item.sold = quantity;
    }

    await item.save();
    return item;
  },

  // Cập nhật số lượng đã bán theo product_id
  async updateSoldByProductId(productId, quantity, operation = "add") {
    const numericProductId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericProductId)) {
      throw new Error("Product ID không hợp lệ");
    }

    const item = await FlashSale.findOne({ product_id: numericProductId });
    if (!item) {
      throw new Error("Flash sale không tồn tại");
    }

    if (operation === "add") {
      item.sold = (item.sold || 0) + quantity;
      if (item.sold > item.total_stock) {
        item.sold = item.total_stock;
      }
    } else if (operation === "subtract") {
      item.sold = Math.max(0, (item.sold || 0) - quantity);
    } else {
      item.sold = quantity;
    }

    await item.save();
    return item;
  },

  // Lấy thống kê flash sale
  async getStats() {
    const total = await FlashSale.countDocuments();
    const available = await FlashSale.countDocuments({
      $expr: { $lt: ["$sold", "$total_stock"] }
    });
    const soldOut = await FlashSale.countDocuments({
      $expr: { $gte: ["$sold", "$total_stock"] }
    });

    const sessions = await FlashSale.distinct("session_id");

    return {
      total,
      available,
      soldOut,
      sessions: sessions.length
    };
  },

  // Tạo flash sale mới
  async create(data) {
    // Generate id nếu chưa có
    if (!data.id) {
      const lastItem = await FlashSale.findOne().sort({ id: -1 }).select('id').lean();
      data.id = lastItem ? lastItem.id + 1 : 1;
    }

    // Kiểm tra product tồn tại
    const numericProductId = typeof data.product_id === 'number' 
      ? data.product_id 
      : parseInt(String(data.product_id).trim(), 10);
    
    if (isNaN(numericProductId)) {
      throw new Error("Product ID không hợp lệ");
    }

    const product = await Product.findOne({ _id: numericProductId });
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    const item = new FlashSale(data);
    await item.save();
    return item;
  },

  // Cập nhật flash sale
  async update(id, updateData) {
    const item = await findFlashSaleById(id);
    if (!item) {
      throw new Error("Flash sale không tồn tại");
    }

    const allowedFields = [
      "session_id", "flash_price", "total_stock", "sold", 
      "limit_per_user", "sort_order"
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    Object.assign(item, filteredData);
    await item.save();
    return item;
  },

  // Xóa flash sale
  async delete(id) {
    const item = await findFlashSaleById(id);
    if (!item) {
      throw new Error("Flash sale không tồn tại");
    }

    await FlashSale.deleteOne({ id: item.id });
    return { message: "Xóa flash sale thành công" };
  }
};

