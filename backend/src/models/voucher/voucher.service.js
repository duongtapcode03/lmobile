import { Voucher } from "./voucher.model.js";
import { Product } from "../product/product.model.js";
import { Category } from "../category/category.model.js";
import { User } from "../user/user.model.js";

export const voucherService = {
  // Tạo voucher mới
  async createVoucher(data) {
    try {
      const voucher = new Voucher(data);
      await voucher.save();
      return voucher;
    } catch (error) {
      if (error.code === 11000) {
        throw new Error("Mã voucher đã tồn tại");
      }
      throw error;
    }
  },

  // Lấy tất cả voucher với phân trang và lọc
  async getAllVouchers(query = {}) {
    const {
      page = 1,
      limit = 10,
      search = "",
      type,
      isActive,
      status = "all", // all, valid, expired, not_started
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    // Xây dựng filter
    const filter = {};
    
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    // Filter theo trạng thái
    const now = new Date();
    switch (status) {
      case "valid":
        filter.isActive = true;
        filter.validFrom = { $lte: now };
        filter.validTo = { $gte: now };
        break;
      case "expired":
        filter.validTo = { $lt: now };
        break;
      case "not_started":
        filter.validFrom = { $gt: now };
        break;
    }

    // Xây dựng sort
    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Tính toán phân trang
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const vouchers = await Voucher.find(filter)
      .populate("createdBy", "name email")
      .populate("applicableProducts", "name price")
      .populate("applicableCategories", "name")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Voucher.countDocuments(filter);

    return {
      vouchers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy voucher theo ID
  async getVoucherById(id) {
    const voucher = await Voucher.findById(id)
      .populate("createdBy", "name email")
      .populate("applicableProducts", "name price thumbnail")
      .populate("applicableCategories", "name slug")
      .populate("applicableUsers", "name email")
      .populate("excludeProducts", "name")
      .populate("excludeCategories", "name");

    if (!voucher) {
      throw new Error("Voucher không tồn tại");
    }

    return voucher;
  },

  // Lấy voucher theo code
  async getVoucherByCode(code) {
    const voucher = await Voucher.findOne({ code: code.toUpperCase() })
      .populate("createdBy", "name email")
      .populate("applicableProducts", "name price thumbnail")
      .populate("applicableCategories", "name slug");

    if (!voucher) {
      throw new Error("Voucher không tồn tại");
    }

    return voucher;
  },

  // Kiểm tra voucher có thể sử dụng không
  async validateVoucher(code, userId, cartItems = [], orderAmount = 0) {
    const voucher = await this.getVoucherByCode(code);

    if (!voucher.isValid) {
      throw new Error("Voucher không còn hiệu lực");
    }

    if (!voucher.canUse) {
      throw new Error("Voucher đã hết lượt sử dụng");
    }

    // Kiểm tra điều kiện đơn hàng tối thiểu
    if (orderAmount < voucher.minOrderAmount) {
      throw new Error(`Đơn hàng phải từ ${voucher.minOrderAmount.toLocaleString()} VNĐ`);
    }

    // Kiểm tra điều kiện user
    if (voucher.conditions.newUserOnly) {
      const user = await User.findById(userId);
      if (user.createdAt > voucher.validFrom) {
        throw new Error("Voucher chỉ dành cho người dùng mới");
      }
    }

    if (voucher.conditions.firstTimeOnly) {
      const { Order } = await import("../order/order.model.js");
      const hasUsedBefore = await Order.findOne({
        user: userId,
        couponCode: voucher.code
      });
      if (hasUsedBefore) {
        throw new Error("Bạn đã sử dụng voucher này trước đó");
      }
    }

    // Kiểm tra sản phẩm áp dụng
    if (voucher.applicableProducts.length > 0) {
      const cartProductIds = cartItems.map(item => item.product.toString());
      const hasApplicableProduct = voucher.applicableProducts.some(productId => 
        cartProductIds.includes(productId.toString())
      );
      if (!hasApplicableProduct) {
        throw new Error("Voucher không áp dụng cho sản phẩm trong giỏ hàng");
      }
    }

    // Kiểm tra sản phẩm loại trừ
    if (voucher.excludeProducts.length > 0) {
      const cartProductIds = cartItems.map(item => item.product.toString());
      const hasExcludedProduct = voucher.excludeProducts.some(productId => 
        cartProductIds.includes(productId.toString())
      );
      if (hasExcludedProduct) {
        throw new Error("Voucher không áp dụng cho một số sản phẩm trong giỏ hàng");
      }
    }

    // Tính toán số tiền giảm giá
    let discountAmount = 0;
    switch (voucher.type) {
      case "percentage":
        discountAmount = (orderAmount * voucher.value) / 100;
        if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
          discountAmount = voucher.maxDiscountAmount;
        }
        break;
      case "fixed_amount":
        discountAmount = voucher.value;
        break;
      case "free_shipping":
        discountAmount = 0; // Sẽ được xử lý riêng
        break;
    }

    return {
      voucher,
      discountAmount: Math.min(discountAmount, orderAmount)
    };
  },

  // Sử dụng voucher
  async useVoucher(code, userId) {
    const voucher = await this.getVoucherByCode(code);

    if (!voucher.canUse) {
      throw new Error("Voucher không thể sử dụng");
    }

    voucher.usedCount += 1;
    await voucher.save();

    return voucher;
  },

  // Cập nhật voucher
  async updateVoucher(id, updateData) {
    const allowedFields = [
      "name", "description", "type", "value", "minOrderAmount", 
      "maxDiscountAmount", "usageLimit", "validFrom", "validTo", 
      "isActive", "applicableProducts", "applicableCategories", 
      "applicableUsers", "excludeProducts", "excludeCategories", 
      "conditions", "tags", "image", "priority"
    ];
    
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    const voucher = await Voucher.findByIdAndUpdate(
      id,
      filteredData,
      { new: true, runValidators: true }
    ).populate("createdBy", "name email");

    if (!voucher) {
      throw new Error("Voucher không tồn tại");
    }

    return voucher;
  },

  // Xóa voucher
  async deleteVoucher(id) {
    const voucher = await Voucher.findByIdAndDelete(id);
    if (!voucher) {
      throw new Error("Voucher không tồn tại");
    }

    return { message: "Xóa voucher thành công" };
  },

  // Toggle trạng thái active
  async toggleActive(id) {
    const voucher = await Voucher.findById(id);
    if (!voucher) {
      throw new Error("Voucher không tồn tại");
    }

    voucher.isActive = !voucher.isActive;
    await voucher.save();

    return voucher;
  },

  // Lấy voucher có thể sử dụng
  async getAvailableVouchers(userId, cartItems = [], orderAmount = 0) {
    const now = new Date();
    const vouchers = await Voucher.find({
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now },
      $expr: { $lt: ["$usedCount", "$usageLimit"] }
    })
    .populate("applicableProducts", "name price thumbnail")
    .populate("applicableCategories", "name slug")
    .sort({ priority: -1, createdAt: -1 });

    const availableVouchers = [];

    for (let voucher of vouchers) {
      try {
        const validation = await this.validateVoucher(voucher.code, userId, cartItems, orderAmount);
        availableVouchers.push({
          ...voucher.toObject(),
          discountAmount: validation.discountAmount
        });
      } catch (error) {
        // Bỏ qua voucher không thể sử dụng
        continue;
      }
    }

    return availableVouchers;
  },

  // Lấy thống kê voucher
  async getVoucherStats() {
    const now = new Date();
    
    const stats = await Voucher.aggregate([
      {
        $group: {
          _id: null,
          totalVouchers: { $sum: 1 },
          activeVouchers: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] }
          },
          validVouchers: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$isActive", true] },
                    { $lte: ["$validFrom", now] },
                    { $gte: ["$validTo", now] }
                  ]
                },
                1,
                0
              ]
            }
          },
          expiredVouchers: {
            $sum: { $cond: [{ $lt: ["$validTo", now] }, 1, 0] }
          },
          totalUsage: { $sum: "$usedCount" }
        }
      }
    ]);

    return stats[0] || {
      totalVouchers: 0,
      activeVouchers: 0,
      validVouchers: 0,
      expiredVouchers: 0,
      totalUsage: 0
    };
  }
};
