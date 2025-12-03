import mongoose from "mongoose";
import { FlashSale } from "./flashSale.model.js";
import { FlashSaleItem } from "./flashSaleItem.model.js";
import { FlashSaleUserUsage } from "./flashSaleUserUsage.model.js";
import { FlashSaleReservation } from "./flashSaleReservation.model.js";
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
    // Loại bỏ _id nếu có (để tránh lỗi "id đã tồn tại" khi tạo mới)
    const { _id, name, start_time, end_time, status = "inactive", description, created_by } = data;

    // Log để debug
    console.log('[FlashSaleService] createFlashSale called with data:', {
      has_id: !!_id,
      _id: _id,
      name,
      start_time,
      end_time,
      status,
      created_by: created_by?.toString()
    });

    // Validate thời gian
    const startTime = new Date(start_time);
    const endTime = new Date(end_time);
    
    if (endTime <= startTime) {
      throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
    }

    // Tạo object data sạch, đảm bảo không có _id
    const flashSaleData = {
      name,
      start_time: startTime,
      end_time: endTime,
      status,
      description,
      created_by
    };

    // Đảm bảo không có _id và id trong data (loại bỏ tất cả các field không mong muốn)
    delete flashSaleData._id;
    delete flashSaleData.id;
    delete flashSaleData.__v;

    console.log('[FlashSaleService] Creating FlashSale with clean data:', JSON.stringify(flashSaleData, null, 2));

    // Thử drop index id_1 nếu có lỗi duplicate key
    try {
      const flashSale = await FlashSale.create(flashSaleData);
      console.log('[FlashSaleService] FlashSale created successfully with _id:', flashSale._id);
      return flashSale;
    } catch (error) {
      // Nếu lỗi là duplicate key trên index id_1, thử drop index và tạo lại
      if (error.code === 11000 && error.keyPattern && error.keyPattern.id === 1) {
        console.log('[FlashSaleService] Detected duplicate key error on id_1 index, attempting to drop index...');
        try {
          await FlashSale.collection.dropIndex('id_1');
          console.log('[FlashSaleService] Successfully dropped index id_1, retrying create...');
          // Retry sau khi drop index
          const flashSale = await FlashSale.create(flashSaleData);
          console.log('[FlashSaleService] FlashSale created successfully after dropping index with _id:', flashSale._id);
          return flashSale;
        } catch (dropError) {
          console.error('[FlashSaleService] Error dropping index id_1:', dropError);
          // Nếu không drop được, throw original error
        }
      }
      
      console.error('[FlashSaleService] Error creating FlashSale:', error);
      console.error('[FlashSaleService] FlashSale data:', JSON.stringify(flashSaleData, null, 2));
      console.error('[FlashSaleService] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      });
      throw error;
    }
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
    console.log(`\n[FlashSale] ========== getAllFlashSales START ==========`);
    console.log(`[FlashSale] Query params:`, JSON.stringify(query, null, 2));
    
    try {
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

    console.log(`[FlashSale] Querying flash sales with filter:`, filter);

    const flashSales = await FlashSale.find(filter)
      .populate('created_by', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`[FlashSale] Found ${flashSales.length} flash sales`);

    // Tính trạng thái thực tế và thêm thông tin items
    // Tối ưu: Lấy tất cả itemsCount trong một query thay vì query từng flash sale
    const flashSaleIds = flashSales.map(fs => {
      // Đảm bảo _id là ObjectId
      if (fs._id) {
        // Khi dùng .lean(), _id có thể là string hoặc ObjectId
        if (typeof fs._id === 'string') {
          return new mongoose.Types.ObjectId(fs._id);
        } else if (fs._id instanceof mongoose.Types.ObjectId) {
          return fs._id;
        } else {
          // Fallback: try to convert
          try {
            return new mongoose.Types.ObjectId(String(fs._id));
          } catch (e) {
            console.error(`[FlashSale] Invalid _id format:`, fs._id);
            return null;
          }
        }
      }
      return null;
    }).filter(id => id != null);
    
    console.log(`[FlashSale] Processing ${flashSales.length} flash sales. FlashSaleIds count: ${flashSaleIds.length}`);
    
    const itemsCountMap = new Map();
    
    if (flashSaleIds.length > 0) {
      try {
        console.log(`[FlashSale] Starting aggregation for ${flashSaleIds.length} flash sales. FlashSaleIds:`, flashSaleIds.map(id => id.toString()).slice(0, 3));
        
        const itemsCounts = await FlashSaleItem.aggregate([
          { 
            $match: { 
              flash_sale_id: { 
                $in: flashSaleIds
              } 
            } 
          },
          { 
            $group: { 
              _id: '$flash_sale_id', 
              count: { $sum: 1 } 
            } 
          }
        ]);
        
        console.log(`[FlashSale] Aggregation result:`, itemsCounts.map(item => ({
          _id: item._id ? (item._id.toString ? item._id.toString() : String(item._id)) : 'null',
          count: item.count
        })));
        
        itemsCounts.forEach(item => {
          // Convert _id về string để so sánh (normalize ObjectId)
          // Aggregation trả về _id có thể là ObjectId hoặc đã được convert
          let idStr = null;
          if (item._id) {
            if (item._id instanceof mongoose.Types.ObjectId) {
              idStr = item._id.toString();
            } else if (typeof item._id === 'string') {
              idStr = item._id;
            } else {
              // Try to convert to ObjectId first, then to string
              try {
                const objId = new mongoose.Types.ObjectId(String(item._id));
                idStr = objId.toString();
              } catch (e) {
                idStr = String(item._id);
              }
            }
          }
          if (idStr) {
            itemsCountMap.set(idStr, item.count);
            // Cũng lưu với ObjectId format để đảm bảo match được
            try {
              const objId = new mongoose.Types.ObjectId(idStr);
              itemsCountMap.set(objId.toString(), item.count);
            } catch (e) {
              // Ignore
            }
          }
        });
        
        console.log(`[FlashSale] Aggregated items count for ${itemsCounts.length} flash sales. Map size: ${itemsCountMap.size}`);
        console.log(`[FlashSale] ItemsCountMap keys:`, Array.from(itemsCountMap.keys()));
        console.log(`[FlashSale] ItemsCountMap values:`, Array.from(itemsCountMap.entries()).slice(0, 5));
      } catch (error) {
        console.error('[FlashSale] Error aggregating items count:', error);
        // Fallback: query từng flash sale nếu aggregation fail
        for (const fs of flashSales) {
          try {
            const fsId = fs._id ? (typeof fs._id === 'string' ? new mongoose.Types.ObjectId(fs._id) : fs._id) : null;
            if (fsId) {
              const count = await FlashSaleItem.countDocuments({ flash_sale_id: fsId });
              itemsCountMap.set(fsId.toString(), count);
            }
          } catch (err) {
            console.error(`[FlashSale] Error counting items for flash sale ${fs._id}:`, err);
            itemsCountMap.set(fs._id ? fs._id.toString() : 'unknown', 0);
          }
        }
      }
    }

    // Xử lý async để có thể query fallback nếu cần
    const result = await Promise.all(flashSales.map(async (fs) => {
      const actualStatus = getFlashSaleStatus(fs);
      
      // Normalize _id để so sánh với itemsCountMap
      // Khi dùng .lean(), _id có thể là string hoặc ObjectId
      let fsIdStr = null;
      if (fs._id) {
        if (fs._id instanceof mongoose.Types.ObjectId) {
          fsIdStr = fs._id.toString();
        } else if (typeof fs._id === 'string') {
          fsIdStr = fs._id;
        } else {
          fsIdStr = String(fs._id);
        }
      } else {
        fsIdStr = String(fs._id);
      }
      
      // Lookup itemsCount từ map
      let itemsCount = 0;
      if (fsIdStr) {
        itemsCount = itemsCountMap.get(fsIdStr);
        if (itemsCount === undefined) {
          // Nếu không tìm thấy, thử với ObjectId format
          try {
            const objId = new mongoose.Types.ObjectId(fsIdStr);
            itemsCount = itemsCountMap.get(objId.toString());
          } catch (e) {
            // Ignore
          }
          if (itemsCount === undefined) {
            // Fallback: Query trực tiếp nếu không tìm thấy trong map
            try {
              const fsId = typeof fs._id === 'string' ? new mongoose.Types.ObjectId(fs._id) : fs._id;
              if (fsId) {
                const directCount = await FlashSaleItem.countDocuments({ flash_sale_id: fsId });
                itemsCount = directCount;
                // Lưu vào map để lần sau dùng
                itemsCountMap.set(fsIdStr, directCount);
                console.log(`[FlashSale] Fallback query for ${fsIdStr}: found ${directCount} items`);
              }
            } catch (e) {
              console.error(`[FlashSale] Error in fallback query for ${fsIdStr}:`, e);
              itemsCount = 0;
            }
          }
        }
      }
      
      // Debug log để kiểm tra
      if (itemsCount === 0 && flashSaleIds.length > 0) {
        console.log(`[FlashSale] Debug: Flash sale ${fsIdStr} (${fs.name}) has itemsCount=${itemsCount}.`);
        console.log(`[FlashSale] Available map keys:`, Array.from(itemsCountMap.keys()));
        console.log(`[FlashSale] Flash sale _id type:`, typeof fs._id, fs._id);
      }
      
      // Đảm bảo itemsCount luôn là number, không bao giờ undefined
      const finalItemsCount = Number(itemsCount) || 0;
      
      console.log(`[FlashSale] Final result for ${fs.name} (${fsIdStr}): itemsCount=${finalItemsCount}`);
      
      // Tạo object mới với itemsCount được đảm bảo là number
      // Lưu ý: Khi dùng .lean(), virtual fields không được include, nhưng để chắc chắn,
      // tạo object mới và set itemsCount SAU khi spread để override nếu có
      const resultItem = {
        ...fs,
        actualStatus,
        itemsCount: finalItemsCount // Đảm bảo là number, không bao giờ undefined - set SAU spread để override
      };
      
      // Double check: đảm bảo itemsCount không bao giờ undefined
      if (resultItem.itemsCount === undefined || resultItem.itemsCount === null) {
        console.error(`[FlashSale] ERROR: itemsCount is still undefined for ${fs.name}! Setting to 0.`);
        resultItem.itemsCount = 0;
      }
      
      // Triple check: đảm bảo itemsCount là number
      resultItem.itemsCount = Number(resultItem.itemsCount) || 0;
      
      console.log(`[FlashSale] ResultItem for ${fs.name}: itemsCount=${resultItem.itemsCount}, type=${typeof resultItem.itemsCount}`);
      
      return resultItem;
    }));

    const total = await FlashSale.countDocuments(filter);

    // Final check: đảm bảo tất cả items có itemsCount
    const finalResult = result.map(item => {
      // Tạo object mới để đảm bảo itemsCount được set đúng
      const finalItem = {
        ...item,
        itemsCount: Number(item.itemsCount) || 0 // Đảm bảo là number, không bao giờ undefined
      };
      
      if (finalItem.itemsCount === undefined || finalItem.itemsCount === null || isNaN(finalItem.itemsCount)) {
        console.error(`[FlashSale] ERROR: itemsCount is invalid in final result for ${item.name}! Setting to 0.`);
        finalItem.itemsCount = 0;
      }
      
      return finalItem;
    });

    console.log(`[FlashSale] Returning ${finalResult.length} flash sales. ItemsCount check:`, 
      finalResult.map(fs => ({ 
        name: fs.name, 
        itemsCount: fs.itemsCount, 
        itemsCountType: typeof fs.itemsCount,
        hasItemsCount: 'itemsCount' in fs
      }))
    );
    
    // Final verification: log một item để kiểm tra
    if (finalResult.length > 0) {
      const sampleItem = finalResult[0];
      console.log(`[FlashSale] Sample item keys:`, Object.keys(sampleItem));
      console.log(`[FlashSale] Sample item itemsCount:`, sampleItem.itemsCount, typeof sampleItem.itemsCount);
      console.log(`[FlashSale] Sample item JSON:`, JSON.stringify(sampleItem, null, 2));
    }

    const response = {
      items: finalResult,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
    
      console.log(`[FlashSale] ========== getAllFlashSales END ==========`);
      console.log(`[FlashSale] Response items count:`, response.items.length);
      console.log(`[FlashSale] First item has itemsCount:`, response.items[0]?.itemsCount);
      
      return response;
    } catch (error) {
      console.error(`[FlashSale] ERROR in getAllFlashSales:`, error);
      throw error;
    }
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
          // Đảm bảo reserved và sold luôn là số (có thể là undefined khi dùng .lean())
          const reserved = typeof item.reserved === 'number' ? item.reserved : 0;
          const sold = typeof item.sold === 'number' ? item.sold : 0;
          const flash_stock = typeof item.flash_stock === 'number' ? item.flash_stock : 0;
          const availableStock = flash_stock - sold - reserved;
          
          const product = productMap.get(item.product_id);
          if (product) {
            const populatedProduct = await populateProductReferences(product);
            // Tạo object mới với reserved và sold được đảm bảo là số (set sau spread để override)
            const result = {
              ...item,
              reserved: reserved, // Đảm bảo reserved luôn là số (override nếu undefined)
              sold: sold, // Đảm bảo sold luôn là số (override nếu undefined)
              product: populatedProduct,
              remainingStock: flash_stock - sold, // Số lượng còn lại (chưa trừ reserved)
              availableStock: availableStock, // Số lượng còn lại có thể mua (trừ reserved)
              isAvailable: availableStock > 0
            };
            return result;
          }
          // Nếu không có product, vẫn đảm bảo reserved và sold là số
          return {
            ...item,
            reserved: reserved, // Đảm bảo reserved luôn là số (override nếu undefined)
            sold: sold, // Đảm bảo sold luôn là số (override nếu undefined)
            remainingStock: flash_stock - sold,
            availableStock: availableStock,
            isAvailable: availableStock > 0
          };
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
        // Đảm bảo reserved và sold luôn là số (có thể là undefined khi dùng .lean())
        const reserved = typeof item.reserved === 'number' ? item.reserved : 0;
        const sold = typeof item.sold === 'number' ? item.sold : 0;
        const flash_stock = typeof item.flash_stock === 'number' ? item.flash_stock : 0;
        const availableStock = flash_stock - sold - reserved;
        
        const product = productMap.get(item.product_id);
        if (product) {
          const populatedProduct = await populateProductReferences(product);
            // Tạo object mới với reserved và sold được đảm bảo là số (set sau spread để override)
            return {
              ...item,
              reserved: reserved, // Đảm bảo reserved luôn là số (override nếu undefined)
              sold: sold, // Đảm bảo sold luôn là số (override nếu undefined)
              product: populatedProduct,
              remainingStock: flash_stock - sold, // Số lượng còn lại (chưa trừ reserved)
              availableStock: availableStock, // Số lượng còn lại có thể mua (trừ reserved)
              isAvailable: availableStock > 0
            };
          }
          // Nếu không có product, vẫn đảm bảo reserved và sold là số
          return {
            ...item,
            reserved: reserved, // Đảm bảo reserved luôn là số (override nếu undefined)
            sold: sold, // Đảm bảo sold luôn là số (override nếu undefined)
            remainingStock: flash_stock - sold,
            availableStock: availableStock,
            isAvailable: availableStock > 0
          };
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

    // Tính số lượng còn lại có thể mua (flash_stock - sold - reserved)
    // Đảm bảo reserved và sold luôn là số (có thể là undefined khi dùng .lean())
    const reserved = typeof item.reserved === 'number' ? item.reserved : 0;
    const sold = typeof item.sold === 'number' ? item.sold : 0;
    const flash_stock = typeof item.flash_stock === 'number' ? item.flash_stock : 0;
    const availableStock = flash_stock - sold - reserved;
    
    if (availableStock < quantity) {
      return { 
        available: false, 
        reason: `Chỉ còn ${availableStock} sản phẩm`,
        remaining: availableStock
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
      remaining: availableStock,
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
