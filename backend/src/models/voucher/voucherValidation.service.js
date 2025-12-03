import mongoose from "mongoose";
import { Voucher } from "./voucher.model.js";
import { VoucherUsage } from "./voucherUsage.model.js";
import { User } from "../user/user.model.js";
import { Order } from "../order/order.model.js";

/**
 * Voucher Validation Error Codes
 * Standard error codes for voucher validation
 */
export const VOUCHER_ERROR_CODES = {
  // Voucher không tồn tại hoặc không hợp lệ
  NOT_FOUND: "VOUCHER_NOT_FOUND",
  INVALID_CODE: "VOUCHER_INVALID_CODE",
  
  // Trạng thái voucher
  INACTIVE: "VOUCHER_INACTIVE",
  EXPIRED: "VOUCHER_EXPIRED",
  NOT_STARTED: "VOUCHER_NOT_STARTED",
  OUT_OF_STOCK: "VOUCHER_OUT_OF_STOCK", // Hết lượt sử dụng
  
  // Điều kiện đơn hàng
  MIN_ORDER_NOT_MET: "VOUCHER_MIN_ORDER_NOT_MET",
  MAX_ORDER_EXCEEDED: "VOUCHER_MAX_ORDER_EXCEEDED",
  
  // Điều kiện user
  USER_NOT_ELIGIBLE: "VOUCHER_USER_NOT_ELIGIBLE",
  NEW_USER_ONLY: "VOUCHER_NEW_USER_ONLY",
  FIRST_TIME_ONLY: "VOUCHER_FIRST_TIME_ONLY",
  USER_LIMIT_EXCEEDED: "VOUCHER_USER_LIMIT_EXCEEDED",
  
  // Điều kiện sản phẩm
  PRODUCT_NOT_APPLICABLE: "VOUCHER_PRODUCT_NOT_APPLICABLE",
  PRODUCT_EXCLUDED: "VOUCHER_PRODUCT_EXCLUDED",
  CATEGORY_NOT_APPLICABLE: "VOUCHER_CATEGORY_NOT_APPLICABLE",
  CATEGORY_EXCLUDED: "VOUCHER_CATEGORY_EXCLUDED",
  
  // Điều kiện số lượng
  MIN_QUANTITY_NOT_MET: "VOUCHER_MIN_QUANTITY_NOT_MET",
  MAX_QUANTITY_EXCEEDED: "VOUCHER_MAX_QUANTITY_EXCEEDED",
  
  // Stacking rules
  STACKING_NOT_ALLOWED: "VOUCHER_STACKING_NOT_ALLOWED",
  CONFLICT_WITH_EXISTING: "VOUCHER_CONFLICT_WITH_EXISTING",
  
  // System errors
  SYSTEM_ERROR: "VOUCHER_SYSTEM_ERROR",
  CONCURRENCY_ERROR: "VOUCHER_CONCURRENCY_ERROR"
};

/**
 * Voucher Validation Service
 * Comprehensive validation với error codes chuẩn
 */
export const voucherValidationService = {
  /**
   * Validate voucher với đầy đủ điều kiện
   * @param {string} code - Voucher code
   * @param {string} userId - User ID
   * @param {Array} cartItems - Cart items
   * @param {number} orderAmount - Order amount (subtotal)
   * @param {Object} options - Additional options
   * @returns {Object} Validation result
   */
  async validateVoucher(code, userId, cartItems = [], orderAmount = 0, options = {}) {
    const {
      allowStacking = false,
      existingVouchers = [],
      skipUserCheck = false,
      skipUserLimitCheck = false // Chỉ skip user limit check (nếu đã có pending usage)
    } = options;

    const errors = [];
    let voucher = null;

    try {
      // 1. Kiểm tra voucher tồn tại
      voucher = await Voucher.findOne({ code: code.toUpperCase() });
      if (!voucher) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.NOT_FOUND,
          message: "Mã voucher không tồn tại",
          voucher: null
        };
      }

      // 2. Kiểm tra trạng thái cơ bản
      const statusCheck = this._checkVoucherStatus(voucher);
      if (!statusCheck.valid) {
        return {
          valid: false,
          errorCode: statusCheck.errorCode,
          message: statusCheck.message,
          voucher: null
        };
      }

      // 3. Kiểm tra số lượng còn lại
      const stockCheck = this._checkVoucherStock(voucher);
      if (!stockCheck.valid) {
        return {
          valid: false,
          errorCode: stockCheck.errorCode,
          message: stockCheck.message,
          voucher: null
        };
      }

      // 4. Kiểm tra điều kiện đơn hàng
      const orderCheck = this._checkOrderConditions(voucher, orderAmount);
      if (!orderCheck.valid) {
        return {
          valid: false,
          errorCode: orderCheck.errorCode,
          message: orderCheck.message,
          voucher: null
        };
      }

      // 5. Kiểm tra điều kiện user (nếu không skip)
      if (!skipUserCheck) {
        const userCheck = await this._checkUserConditions(voucher, userId, skipUserLimitCheck);
        if (!userCheck.valid) {
          return {
            valid: false,
            errorCode: userCheck.errorCode,
            message: userCheck.message,
            voucher: null
          };
        }
      }

      // 6. Kiểm tra điều kiện sản phẩm
      const productCheck = this._checkProductConditions(voucher, cartItems);
      if (!productCheck.valid) {
        return {
          valid: false,
          errorCode: productCheck.errorCode,
          message: productCheck.message,
          voucher: null
        };
      }

      // 7. Kiểm tra điều kiện số lượng
      const quantityCheck = this._checkQuantityConditions(voucher, cartItems);
      if (!quantityCheck.valid) {
        return {
          valid: false,
          errorCode: quantityCheck.errorCode,
          message: quantityCheck.message,
          voucher: null
        };
      }

      // 8. Kiểm tra stacking rules
      if (!allowStacking && existingVouchers.length > 0) {
        const stackingCheck = this._checkStackingRules(voucher, existingVouchers);
        if (!stackingCheck.valid) {
          return {
            valid: false,
            errorCode: stackingCheck.errorCode,
            message: stackingCheck.message,
            voucher: null
          };
        }
      }

      // Tất cả validation đều pass
      return {
        valid: true,
        errorCode: null,
        message: "Voucher hợp lệ",
        voucher: voucher
      };

    } catch (error) {
      console.error("[Voucher Validation] Error:", error);
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.SYSTEM_ERROR,
        message: "Lỗi hệ thống khi kiểm tra voucher",
        voucher: null,
        error: error.message
      };
    }
  },

  /**
   * Kiểm tra trạng thái voucher
   */
  _checkVoucherStatus(voucher) {
    if (!voucher.isActive) {
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.INACTIVE,
        message: "Voucher đã bị vô hiệu hóa"
      };
    }

    const now = new Date();
    if (now < voucher.validFrom) {
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.NOT_STARTED,
        message: `Voucher chưa có hiệu lực. Bắt đầu từ ${voucher.validFrom.toLocaleDateString("vi-VN")}`
      };
    }

    if (now > voucher.validTo) {
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.EXPIRED,
        message: `Voucher đã hết hạn. Hết hạn ngày ${voucher.validTo.toLocaleDateString("vi-VN")}`
      };
    }

    return { valid: true };
  },

  /**
   * Kiểm tra số lượng voucher còn lại
   */
  _checkVoucherStock(voucher) {
    if (voucher.usedCount >= voucher.usageLimit) {
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.OUT_OF_STOCK,
        message: "Voucher đã hết lượt sử dụng"
      };
    }

    return { valid: true };
  },

  /**
   * Kiểm tra điều kiện đơn hàng
   */
  _checkOrderConditions(voucher, orderAmount) {
    if (orderAmount < voucher.minOrderAmount) {
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.MIN_ORDER_NOT_MET,
        message: `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString("vi-VN")} VNĐ để sử dụng voucher này`
      };
    }

    // Có thể thêm maxOrderAmount nếu cần
    // if (voucher.maxOrderAmount && orderAmount > voucher.maxOrderAmount) {
    //   return {
    //     valid: false,
    //     errorCode: VOUCHER_ERROR_CODES.MAX_ORDER_EXCEEDED,
    //     message: `Đơn hàng không được vượt quá ${voucher.maxOrderAmount.toLocaleString("vi-VN")} VNĐ`
    //   };
    // }

    return { valid: true };
  },

  /**
   * Kiểm tra điều kiện user
   * @param {Object} voucher - Voucher object
   * @param {string} userId - User ID
   * @param {boolean} skipUserLimitCheck - Skip user limit check nếu đã có pending usage
   */
  async _checkUserConditions(voucher, userId, skipUserLimitCheck = false) {
    // Kiểm tra user có trong danh sách được phép không
    if (voucher.applicableUsers && voucher.applicableUsers.length > 0) {
      const isApplicable = voucher.applicableUsers.some(
        id => id.toString() === userId.toString()
      );
      if (!isApplicable) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.USER_NOT_ELIGIBLE,
          message: "Bạn không đủ điều kiện sử dụng voucher này"
        };
      }
    }

    // Kiểm tra new user only
    if (voucher.conditions?.newUserOnly) {
      const user = await User.findById(userId);
      if (!user) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.USER_NOT_ELIGIBLE,
          message: "Không tìm thấy thông tin người dùng"
        };
      }

      // User phải được tạo sau khi voucher bắt đầu
      if (user.createdAt > voucher.validFrom) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.NEW_USER_ONLY,
          message: "Voucher chỉ dành cho người dùng mới"
        };
      }
    }

    // Kiểm tra first time only
    // Chỉ check "used", không check "pending" vì pending có thể là từ cart hiện tại
    // Nếu skipUserLimitCheck = true (đã có pending từ cart), không cần check firstTimeOnly
    if (voucher.conditions?.firstTimeOnly && !skipUserLimitCheck) {
      const hasUsedBefore = await VoucherUsage.findOne({
        user: userId,
        voucher: voucher._id,
        status: "used" // Chỉ check "used", không check "pending"
      });

      if (hasUsedBefore) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.FIRST_TIME_ONLY,
          message: "Voucher này chỉ được sử dụng một lần duy nhất"
        };
      }
    }

    // Kiểm tra giới hạn sử dụng per user
    // Nếu skipUserLimitCheck = true (đã có pending usage từ cart), không cần check lại
    if (!skipUserLimitCheck) {
    // Đếm cả "used" và "pending" để tránh user dùng nhiều lần cùng lúc
    const userUsageCount = await VoucherUsage.countDocuments({
      user: userId,
      voucher: voucher._id,
      status: { $in: ["used", "pending"] } // Đếm cả used và pending
    });

    // Mặc định mỗi user chỉ được dùng 1 lần (có thể config trong voucher)
    const maxUsagePerUser = voucher.conditions?.maxUsagePerUser || 1;
    if (userUsageCount >= maxUsagePerUser) {
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.USER_LIMIT_EXCEEDED,
        message: `Bạn đã sử dụng hết lượt voucher này (tối đa ${maxUsagePerUser} lần)`
      };
      }
    }

    return { valid: true };
  },

  /**
   * Kiểm tra điều kiện sản phẩm
   */
  _checkProductConditions(voucher, cartItems) {
    if (!cartItems || cartItems.length === 0) {
      return { valid: true }; // Không có sản phẩm thì không cần check
    }

    const cartProductIds = cartItems.map(item => 
      item.product?.toString() || item.product
    );
    const cartCategoryIds = cartItems
      .map(item => item.categoryId)
      .filter(Boolean);

    // Kiểm tra applicable products
    if (voucher.applicableProducts && voucher.applicableProducts.length > 0) {
      const hasApplicableProduct = voucher.applicableProducts.some(productId => 
        cartProductIds.includes(productId.toString())
      );
      if (!hasApplicableProduct) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.PRODUCT_NOT_APPLICABLE,
          message: "Voucher không áp dụng cho sản phẩm trong giỏ hàng"
        };
      }
    }

    // Kiểm tra exclude products
    if (voucher.excludeProducts && voucher.excludeProducts.length > 0) {
      const hasExcludedProduct = voucher.excludeProducts.some(productId => 
        cartProductIds.includes(productId.toString())
      );
      if (hasExcludedProduct) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.PRODUCT_EXCLUDED,
          message: "Voucher không áp dụng cho một số sản phẩm trong giỏ hàng"
        };
      }
    }

    // Kiểm tra applicable categories
    if (voucher.applicableCategories && voucher.applicableCategories.length > 0) {
      const hasApplicableCategory = voucher.applicableCategories.some(categoryId => 
        cartCategoryIds.includes(categoryId.toString())
      );
      if (!hasApplicableCategory) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.CATEGORY_NOT_APPLICABLE,
          message: "Voucher không áp dụng cho danh mục sản phẩm trong giỏ hàng"
        };
      }
    }

    // Kiểm tra exclude categories
    if (voucher.excludeCategories && voucher.excludeCategories.length > 0) {
      const hasExcludedCategory = voucher.excludeCategories.some(categoryId => 
        cartCategoryIds.includes(categoryId.toString())
      );
      if (hasExcludedCategory) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.CATEGORY_EXCLUDED,
          message: "Voucher không áp dụng cho một số danh mục sản phẩm trong giỏ hàng"
        };
      }
    }

    return { valid: true };
  },

  /**
   * Kiểm tra điều kiện số lượng
   */
  _checkQuantityConditions(voucher, cartItems) {
    if (!cartItems || cartItems.length === 0) {
      return { valid: true };
    }

    const totalQuantity = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

    if (voucher.conditions?.minQuantity && totalQuantity < voucher.conditions.minQuantity) {
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.MIN_QUANTITY_NOT_MET,
        message: `Cần mua tối thiểu ${voucher.conditions.minQuantity} sản phẩm để sử dụng voucher này`
      };
    }

    if (voucher.conditions?.maxQuantity && totalQuantity > voucher.conditions.maxQuantity) {
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.MAX_QUANTITY_EXCEEDED,
        message: `Chỉ được mua tối đa ${voucher.conditions.maxQuantity} sản phẩm để sử dụng voucher này`
      };
    }

    return { valid: true };
  },

  /**
   * Kiểm tra stacking rules
   */
  _checkStackingRules(voucher, existingVouchers) {
    // Mặc định không cho phép stack nhiều voucher
    // Có thể config trong voucher.conditions.allowStacking
    if (!voucher.conditions?.allowStacking) {
      return {
        valid: false,
        errorCode: VOUCHER_ERROR_CODES.STACKING_NOT_ALLOWED,
        message: "Không thể sử dụng nhiều voucher cùng lúc"
      };
    }

    // Kiểm tra conflict với voucher hiện có
    // Ví dụ: không thể dùng 2 voucher free shipping cùng lúc
    if (voucher.type === "free_shipping") {
      const hasFreeShipping = existingVouchers.some(v => v.type === "free_shipping");
      if (hasFreeShipping) {
        return {
          valid: false,
          errorCode: VOUCHER_ERROR_CODES.CONFLICT_WITH_EXISTING,
          message: "Đã có voucher miễn phí vận chuyển trong đơn hàng"
        };
      }
    }

    return { valid: true };
  }
};

