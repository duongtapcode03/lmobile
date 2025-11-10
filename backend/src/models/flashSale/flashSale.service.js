import { FlashSale } from "./flashSale.model.js";
import { Product } from "../product/product.model.js";
import { AppError } from "../../core/errors/AppError.js";

export const flashSaleService = {
  // Tạo flash sale mới
  async createFlashSale(data) {
    try {
      // Validate products
      if (data.products && data.products.length > 0) {
        for (const productData of data.products) {
          const product = await Product.findById(productData.productId);
          if (!product) {
            throw new Error(`Sản phẩm ${productData.productId} không tồn tại`);
          }
          
          // Update product flash sale fields
          product.isFlashSale = true;
          product.flashPrice = productData.flashPrice;
          product.flashOriginalPrice = productData.originalPrice;
          product.flashQuantity = productData.quantity;
          product.flashSold = 0;
          product.flashStartDate = data.startDate;
          product.flashEndDate = data.endDate;
          product.flashDiscount = Math.round(
            ((productData.originalPrice - productData.flashPrice) / productData.originalPrice) * 100
          );
          product.flashLimitPerUser = productData.limitPerUser || 1;
          product.flashSaleName = data.name;
          
          await product.save();
        }
      }

      const flashSale = new FlashSale(data);
      await flashSale.save();
      
      return flashSale;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Slug flash sale đã tồn tại");
      }
      throw error;
    }
  },

  // Lấy tất cả flash sale
  async getAllFlashSales(query = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      isActive
    } = query;

    const filter = {};
    if (status) filter.status = status;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const flashSales = await FlashSale.find(filter)
      .populate("products.productId", "name price imageUrl slug")
      .sort({ startDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await FlashSale.countDocuments(filter);

    return {
      flashSales,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy flash sale đang active
  async getActiveFlashSales(limit = 10) {
    const now = new Date();
    return FlashSale.find({
      status: "active",
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    })
      .populate("products.productId", "name price imageUrl slug brandRef")
      .sort({ startDate: 1 })
      .limit(parseInt(limit));
  },

  // Lấy flash sale sắp tới
  async getUpcomingFlashSales(limit = 10) {
    const now = new Date();
    return FlashSale.find({
      status: "upcoming",
      isActive: true,
      startDate: { $gt: now }
    })
      .populate("products.productId", "name price imageUrl slug")
      .sort({ startDate: 1 })
      .limit(parseInt(limit));
  },

  // Lấy flash sale theo ID
  async getFlashSaleById(id) {
    const flashSale = await FlashSale.findById(id)
      .populate("products.productId");
    
    if (!flashSale) {
      throw new Error("Flash sale không tồn tại");
    }
    
    return flashSale;
  },

  // Lấy flash sale theo slug
  async getFlashSaleBySlug(slug) {
    const flashSale = await FlashSale.findOne({ slug })
      .populate("products.productId");
    
    if (!flashSale) {
      throw new Error("Flash sale không tồn tại");
    }
    
    return flashSale;
  },

  // Cập nhật flash sale
  async updateFlashSale(id, updateData) {
    const flashSale = await FlashSale.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!flashSale) {
      throw new Error("Flash sale không tồn tại");
    }

    // Update products if needed
    if (updateData.products) {
      for (const productData of updateData.products) {
        await Product.findByIdAndUpdate(productData.productId, {
          flashPrice: productData.flashPrice,
          flashQuantity: productData.quantity,
          flashStartDate: flashSale.startDate,
          flashEndDate: flashSale.endDate
        });
      }
    }

    return flashSale;
  },

  // Xóa flash sale
  async deleteFlashSale(id) {
    const flashSale = await FlashSale.findById(id);
    if (!flashSale) {
      throw new Error("Flash sale không tồn tại");
    }

    // Remove flash sale from products
    if (flashSale.products && flashSale.products.length > 0) {
      const productIds = flashSale.products.map(p => p.productId);
      await Product.updateMany(
        { _id: { $in: productIds } },
        {
          $unset: {
            isFlashSale: "",
            flashPrice: "",
            flashOriginalPrice: "",
            flashQuantity: "",
            flashSold: "",
            flashStartDate: "",
            flashEndDate: "",
            flashDiscount: "",
            flashLimitPerUser: "",
            flashSaleName: ""
          }
        }
      );
    }

    await FlashSale.findByIdAndDelete(id);
    return { message: "Xóa flash sale thành công" };
  },

  // Cập nhật số lượng bán cho product trong flash sale
  async updateFlashSaleProductSold(flashSaleId, productId, quantity) {
    const flashSale = await FlashSale.findById(flashSaleId);
    if (!flashSale) {
      throw new Error("Flash sale không tồn tại");
    }

    const productEntry = flashSale.products.find(
      p => p.productId.toString() === productId.toString()
    );

    if (!productEntry) {
      throw new Error("Sản phẩm không có trong flash sale này");
    }

    productEntry.sold += quantity;
    
    // Update totals
    flashSale.totalSold += quantity;
    flashSale.totalRevenue += productEntry.flashPrice * quantity;

    // Update product
    await Product.findByIdAndUpdate(productId, {
      flashSold: productEntry.sold,
      $inc: { sold: quantity, stock: -quantity }
    });

    await flashSale.save();
    return flashSale;
  },

  // Thống kê flash sale
  async getFlashSaleStats() {
    const total = await FlashSale.countDocuments();
    const active = await FlashSale.countDocuments({ status: "active" });
    const upcoming = await FlashSale.countDocuments({ status: "upcoming" });
    const ended = await FlashSale.countDocuments({ status: "ended" });

    const totalRevenue = await FlashSale.aggregate([
      { $group: { _id: null, total: { $sum: "$totalRevenue" } } }
    ]);

    return {
      total,
      active,
      upcoming,
      ended,
      totalRevenue: totalRevenue[0]?.total || 0
    };
  }
};









