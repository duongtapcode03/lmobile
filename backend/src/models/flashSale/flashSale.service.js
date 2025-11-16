import { FlashSale } from "./flashSale.model.js";
import { FlashSaleItem } from "./flashSaleItem.model.js";
import { FlashSaleUserUsage } from "./flashSaleUserUsage.model.js";
import { Product } from "../product/product.model.js";
import { populateProductReferences } from "../product/product.populate.helpers.js";

/**
 * Helper function để tính trạng thái flash sale
 */
function getFlashSaleStatus(flashSale) {
  const now = new Date();
  if (now < flashSale.start_time) {
    return "scheduled";
  } else if (now >= flashSale.start_time && now <= flashSale.end_time) {
    return flashSale.status === "active" ? "active" : "inactive";
  } else {
    return "ended";
  }
}

export const flashSaleService = {
  /**
   * (1) TẠO FLASH SALE - Tạo khung thời gian Flash Sale
   */
  async createFlashSale(data) {
    const { name, start_time, end_time, status = "active", description, created_by } = data;

    // Validate thời gian
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);
    
    if (endTime <= startTime) {
      throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
    }

    const flashSale = new FlashSale({
      name,
      start_time: startTime,
      end_time: endTime,
      status,
      description,
      created_by
    });

    await flashSale.save();
    return flashSale;
  },

  /**
   * (2) THÊM SẢN PHẨM VÀO FLASH SALE
   */
  async addProductToFlashSale(flashSaleId, productData) {
    const { product_id, flash_price, flash_stock, limit_per_user = 1, sort_order = 1 } = productData;

    // Kiểm tra flash sale tồn tại
    const flashSale = await FlashSale.findById(flashSaleId);
    if (!flashSale) {
      throw new Error("Flash Sale không tồn tại");
    }

    // Kiểm tra product tồn tại
    const numericProductId = typeof product_id === 'number' 
      ? product_id 
      : parseInt(String(product_id).trim(), 10);
    
    if (isNaN(numericProductId)) {
      throw new Error("Product ID không hợp lệ");
    }

    const product = await Product.findOne({ _id: numericProductId });
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    // Kiểm tra sản phẩm đã có trong flash sale chưa
    const existingItem = await FlashSaleItem.findOne({
      flash_sale_id: flashSaleId,
      product_id: numericProductId
    });

    if (existingItem) {
      throw new Error("Sản phẩm đã có trong Flash Sale này");
    }

    // Tạo flash sale item
    const item = new FlashSaleItem({
      flash_sale_id: flashSaleId,
      product_id: numericProductId,
      flash_price,
      flash_stock,
      limit_per_user,
      sort_order,
      sold: 0
    });

    await item.save();
    return item;
  },

  /**
   * Lấy danh sách Flash Sale (Admin)
   */
  async getAllFlashSales(query = {}) {
    const {
      page = 1,
      limit = 20,
      status, // 'all', 'scheduled', 'active', 'ended', 'inactive'
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    const filter = {};
    
    // Filter theo trạng thái thực tế
    const now = new Date();
    if (status === 'scheduled') {
      filter.start_time = { $gt: now };
    } else if (status === 'active') {
      filter.start_time = { $lte: now };
      filter.end_time = { $gte: now };
      filter.status = 'active';
    } else if (status === 'ended') {
      filter.end_time = { $lt: now };
    } else if (status === 'inactive') {
      filter.status = 'inactive';
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const flashSales = await FlashSale.find(filter)
      .populate('created_by', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Tính trạng thái thực tế và thêm thông tin items
    const result = await Promise.all(
      flashSales.map(async (fs) => {
        const actualStatus = getFlashSaleStatus(fs);
        const itemsCount = await FlashSaleItem.countDocuments({ flash_sale_id: fs._id });
        
        return {
          ...fs,
          actualStatus,
          itemsCount
        };
      })
    );

    const total = await FlashSale.countDocuments(filter);

    return {
      items: result,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  /**
   * Lấy Flash Sale đang active (Public)
   */
  async getActiveFlashSales(query = {}) {
    const {
      page = 1,
      limit = 20
    } = query;

    const now = new Date();
    const filter = {
      start_time: { $lte: now },
      end_time: { $gte: now },
      status: 'active'
    };

    const flashSales = await FlashSale.find(filter)
      .sort({ start_time: 1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();

    const total = await FlashSale.countDocuments(filter);

    return {
      items: flashSales,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  /**
   * Lấy chi tiết Flash Sale với danh sách sản phẩm
   */
  async getFlashSaleById(flashSaleId, includeItems = true) {
    const flashSale = await FlashSale.findById(flashSaleId)
      .populate('created_by', 'name email')
      .lean();

    if (!flashSale) {
      throw new Error("Flash Sale không tồn tại");
    }

    const actualStatus = getFlashSaleStatus(flashSale);

    const result = {
      ...flashSale,
      actualStatus
    };

    if (includeItems) {
      const items = await FlashSaleItem.find({ flash_sale_id: flashSaleId })
        .sort({ sort_order: 1 })
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
              product: populatedProduct,
              remainingStock: item.flash_stock - item.sold,
              isAvailable: item.sold < item.flash_stock
            };
          }
          return item;
        })
      );

      result.items = populatedItems;
      result.itemsCount = populatedItems.length;
    }

    return result;
  },

  /**
   * Lấy danh sách sản phẩm trong Flash Sale
   */
  async getFlashSaleItems(flashSaleId, query = {}) {
    const {
      page = 1,
      limit = 20,
      availableOnly = false,
      sortBy = "sort_order",
      sortOrder = "asc"
    } = query;

    const filter = { flash_sale_id: flashSaleId };

    if (availableOnly) {
      filter.$expr = { $lt: ["$sold", "$flash_stock"] };
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const items = await FlashSaleItem.find(filter)
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
            product: populatedProduct,
            remainingStock: item.flash_stock - item.sold,
            isAvailable: item.sold < item.flash_stock
          };
        }
        return item;
      })
    );

    const total = await FlashSaleItem.countDocuments(filter);

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

  /**
   * (3) KIỂM SOÁT TRẠNG THÁI FLASH SALE
   */
  async updateFlashSaleStatus(flashSaleId, status) {
    const flashSale = await FlashSale.findById(flashSaleId);
    if (!flashSale) {
      throw new Error("Flash Sale không tồn tại");
    }

    if (!['active', 'inactive'].includes(status)) {
      throw new Error("Trạng thái không hợp lệ. Chỉ có thể là 'active' hoặc 'inactive'");
    }

    flashSale.status = status;
    await flashSale.save();

    return flashSale;
  },

  /**
   * Cập nhật Flash Sale
   */
  async updateFlashSale(flashSaleId, updateData) {
    const flashSale = await FlashSale.findById(flashSaleId);
    if (!flashSale) {
      throw new Error("Flash Sale không tồn tại");
    }

    const allowedFields = ['name', 'start_time', 'end_time', 'status', 'description'];
    const filteredData = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // Validate thời gian nếu có cập nhật
    if (filteredData.start_time || filteredData.end_time) {
      const startTime = filteredData.start_time ? new Date(filteredData.start_time) : flashSale.start_time;
      const endTime = filteredData.end_time ? new Date(filteredData.end_time) : flashSale.end_time;
      
      if (endTime <= startTime) {
        throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
      }
    }

    Object.assign(flashSale, filteredData);
    await flashSale.save();

    return flashSale;
  },

  /**
   * Cập nhật Flash Sale Item
   */
  async updateFlashSaleItem(itemId, updateData) {
    const item = await FlashSaleItem.findById(itemId);
    if (!item) {
      throw new Error("Flash Sale Item không tồn tại");
    }

    const allowedFields = ['flash_price', 'flash_stock', 'limit_per_user', 'sort_order'];
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

  /**
   * Xóa Flash Sale
   */
  async deleteFlashSale(flashSaleId) {
    const flashSale = await FlashSale.findById(flashSaleId);
    if (!flashSale) {
      throw new Error("Flash Sale không tồn tại");
    }

    // Xóa tất cả items và user usage
    await FlashSaleItem.deleteMany({ flash_sale_id: flashSaleId });
    await FlashSaleUserUsage.deleteMany({ flash_sale_id: flashSaleId });
    await FlashSale.deleteOne({ _id: flashSaleId });

    return { message: "Xóa Flash Sale thành công" };
  },

  /**
   * Xóa sản phẩm khỏi Flash Sale
   */
  async removeProductFromFlashSale(flashSaleId, productId) {
    const numericProductId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericProductId)) {
      throw new Error("Product ID không hợp lệ");
    }

    const item = await FlashSaleItem.findOne({
      flash_sale_id: flashSaleId,
      product_id: numericProductId
    });

    if (!item) {
      throw new Error("Sản phẩm không có trong Flash Sale này");
    }

    // Xóa user usage
    await FlashSaleUserUsage.deleteMany({
      flash_sale_id: flashSaleId,
      product_id: numericProductId
    });

    // Xóa item
    await FlashSaleItem.deleteOne({ _id: item._id });

    return { message: "Xóa sản phẩm khỏi Flash Sale thành công" };
  },

  /**
   * Kiểm tra availability của sản phẩm trong flash sale
   */
  async checkAvailability(flashSaleId, productId, userId = null, quantity = 1) {
    // Kiểm tra flash sale có đang active không
    const flashSale = await FlashSale.findById(flashSaleId);
    if (!flashSale) {
      return { available: false, reason: "Flash Sale không tồn tại" };
    }

    const actualStatus = getFlashSaleStatus(flashSale);
    if (actualStatus !== 'active') {
      return { available: false, reason: `Flash Sale đang ở trạng thái: ${actualStatus}` };
    }

    // Kiểm tra item
    const numericProductId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericProductId)) {
      return { available: false, reason: "Product ID không hợp lệ" };
    }

    const item = await FlashSaleItem.findOne({
      flash_sale_id: flashSaleId,
      product_id: numericProductId
    }).lean();

    if (!item) {
      return { available: false, reason: "Sản phẩm không có trong Flash Sale này" };
    }

    const remaining = item.flash_stock - item.sold;
    if (remaining < quantity) {
      return { 
        available: false, 
        reason: `Chỉ còn ${remaining} sản phẩm`,
        remaining 
      };
    }

    // Kiểm tra limit per user nếu có userId
    if (userId) {
      const userUsage = await FlashSaleUserUsage.findOne({
        user_id: userId,
        flash_sale_id: flashSaleId,
        product_id: numericProductId
      });

      const userQuantity = userUsage ? userUsage.quantity : 0;
      if (userQuantity + quantity > item.limit_per_user) {
        return { 
          available: false, 
          reason: `Bạn đã mua ${userQuantity} sản phẩm. Chỉ được mua tối đa ${item.limit_per_user} sản phẩm`,
          userQuantity,
          limitPerUser: item.limit_per_user
        };
      }
    } else if (quantity > item.limit_per_user) {
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

  /**
   * Cập nhật số lượng đã bán (khi có đơn hàng)
   */
  async updateSold(flashSaleId, productId, quantity, userId = null, orderId = null) {
    const numericProductId = typeof productId === 'number' 
      ? productId 
      : parseInt(String(productId).trim(), 10);
    
    if (isNaN(numericProductId)) {
      throw new Error("Product ID không hợp lệ");
    }

    const item = await FlashSaleItem.findOne({
      flash_sale_id: flashSaleId,
      product_id: numericProductId
    });

    if (!item) {
      throw new Error("Flash Sale Item không tồn tại");
    }

    // Cập nhật sold
    item.sold = (item.sold || 0) + quantity;
    if (item.sold > item.flash_stock) {
      item.sold = item.flash_stock;
    }
    await item.save();

    // Cập nhật user usage nếu có userId
    if (userId) {
      const userUsage = await FlashSaleUserUsage.findOne({
        user_id: userId,
        flash_sale_id: flashSaleId,
        product_id: numericProductId
      });

      if (userUsage) {
        userUsage.quantity = (userUsage.quantity || 0) + quantity;
        if (orderId) {
          userUsage.order_id = orderId;
        }
        await userUsage.save();
      } else {
        await FlashSaleUserUsage.create({
          user_id: userId,
          flash_sale_id: flashSaleId,
          product_id: numericProductId,
          quantity,
          order_id: orderId
        });
      }
    }

    return item;
  },

  /**
   * (4) THEO DÕI HIỆU SUẤT FLASH SALE
   */
  async getFlashSaleStats(flashSaleId) {
    const flashSale = await FlashSale.findById(flashSaleId);
    if (!flashSale) {
      throw new Error("Flash Sale không tồn tại");
    }

    const items = await FlashSaleItem.find({ flash_sale_id: flashSaleId }).lean();
    
    const totalItems = items.length;
    const totalStock = items.reduce((sum, item) => sum + item.flash_stock, 0);
    const totalSold = items.reduce((sum, item) => sum + item.sold, 0);
    const totalRevenue = items.reduce((sum, item) => sum + (item.flash_price * item.sold), 0);
    const totalUsers = await FlashSaleUserUsage.distinct('user_id', { flash_sale_id: flashSaleId });

    // Top sản phẩm bán chạy
    const topProducts = items
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 10)
      .map(item => ({
        product_id: item.product_id,
        sold: item.sold,
        revenue: item.flash_price * item.sold
      }));

    return {
      flashSale: {
        _id: flashSale._id,
        name: flashSale.name,
        start_time: flashSale.start_time,
        end_time: flashSale.end_time,
        status: flashSale.status,
        actualStatus: getFlashSaleStatus(flashSale)
      },
      stats: {
        totalItems,
        totalStock,
        totalSold,
        remainingStock: totalStock - totalSold,
        totalRevenue,
        totalUsers: totalUsers.length,
        sellRate: totalStock > 0 ? ((totalSold / totalStock) * 100).toFixed(2) : 0
      },
      topProducts
    };
  },

  /**
   * Lấy thống kê tổng quan tất cả Flash Sale
   */
  async getAllStats() {
    const totalFlashSales = await FlashSale.countDocuments();
    const activeFlashSales = await FlashSale.countDocuments({
      start_time: { $lte: new Date() },
      end_time: { $gte: new Date() },
      status: 'active'
    });
    const scheduledFlashSales = await FlashSale.countDocuments({
      start_time: { $gt: new Date() }
    });
    const endedFlashSales = await FlashSale.countDocuments({
      end_time: { $lt: new Date() }
    });

    const allItems = await FlashSaleItem.find().lean();
    const totalRevenue = allItems.reduce((sum, item) => sum + (item.flash_price * item.sold), 0);
    const totalSold = allItems.reduce((sum, item) => sum + item.sold, 0);

    return {
      totalFlashSales,
      activeFlashSales,
      scheduledFlashSales,
      endedFlashSales,
      totalRevenue,
      totalSold
    };
  }
};
