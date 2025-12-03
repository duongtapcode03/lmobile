import { Voucher } from "./voucher.model.js";

/**
 * Voucher Calculation Service
 * Tính toán discount amount, final price với các loại voucher khác nhau
 */
export const voucherCalculationService = {
  /**
   * Tính toán discount cho một voucher
   * @param {Object} voucher - Voucher object
   * @param {number} orderAmount - Order amount (subtotal)
   * @param {number} shippingFee - Shipping fee
   * @returns {Object} Calculation result
   */
  calculateDiscount(voucher, orderAmount, shippingFee = 0) {
    let discountAmount = 0;
    let discountPercent = 0;
    let freeShipping = false;
    let message = "";

    switch (voucher.type) {
      case "percentage":
        // Giảm theo phần trăm
        discountPercent = voucher.value;
        discountAmount = (orderAmount * voucher.value) / 100;
        
        // Áp dụng max discount cap nếu có
        if (voucher.maxDiscountAmount && discountAmount > voucher.maxDiscountAmount) {
          discountAmount = voucher.maxDiscountAmount;
        }
        
        message = `Giảm ${voucher.value}% (tối đa ${voucher.maxDiscountAmount?.toLocaleString("vi-VN") || "không giới hạn"} VNĐ)`;
        break;

      case "fixed_amount":
        // Giảm số tiền cố định
        discountAmount = voucher.value;
        discountPercent = (discountAmount / orderAmount) * 100;
        
        // Đảm bảo không giảm quá order amount
        if (discountAmount > orderAmount) {
          discountAmount = orderAmount;
        }
        
        message = `Giảm ${voucher.value.toLocaleString("vi-VN")} VNĐ`;
        break;

      case "free_shipping":
        // Miễn phí vận chuyển
        freeShipping = true;
        discountAmount = shippingFee; // Discount = shipping fee
        discountPercent = shippingFee > 0 ? (shippingFee / (orderAmount + shippingFee)) * 100 : 0;
        
        message = "Miễn phí vận chuyển";
        break;

      default:
        throw new Error(`Loại voucher không hợp lệ: ${voucher.type}`);
    }

    // Đảm bảo discountAmount không vượt quá orderAmount
    discountAmount = Math.min(discountAmount, orderAmount);
    
    // Tính final price
    const finalPrice = orderAmount - discountAmount;
    
    // Tính total với shipping (nếu không phải free shipping)
    const totalAmount = freeShipping 
      ? finalPrice 
      : finalPrice + shippingFee;

    return {
      discountAmount: Math.round(discountAmount),
      discountPercent: Math.round(discountPercent * 100) / 100,
      freeShipping,
      finalPrice: Math.round(finalPrice),
      totalAmount: Math.round(totalAmount),
      message,
      voucher: {
        code: voucher.code,
        name: voucher.name,
        type: voucher.type,
        value: voucher.value
      }
    };
  },

  /**
   * Tính toán discount cho nhiều voucher (stacking)
   * @param {Array} vouchers - Array of vouchers
   * @param {number} orderAmount - Order amount
   * @param {number} shippingFee - Shipping fee
   * @param {Object} stackingRules - Stacking rules
   * @returns {Object} Combined calculation result
   */
  calculateMultipleDiscounts(vouchers, orderAmount, shippingFee = 0, stackingRules = {}) {
    const {
      order = "priority", // priority, sequential
      maxDiscountPercent = null,
      maxDiscountAmount = null
    } = stackingRules;

    // Sắp xếp vouchers theo priority hoặc thứ tự
    const sortedVouchers = order === "priority"
      ? [...vouchers].sort((a, b) => (b.priority || 0) - (a.priority || 0))
      : vouchers;

    let totalDiscountAmount = 0;
    let totalDiscountPercent = 0;
    let freeShipping = false;
    const appliedVouchers = [];
    let remainingAmount = orderAmount;

    // Áp dụng từng voucher
    for (const voucher of sortedVouchers) {
      const calculation = this.calculateDiscount(voucher, remainingAmount, shippingFee);
      
      // Nếu là free shipping, chỉ áp dụng một lần
      if (calculation.freeShipping && !freeShipping) {
        freeShipping = true;
        totalDiscountAmount += calculation.discountAmount;
        remainingAmount = calculation.finalPrice;
      } else if (!calculation.freeShipping) {
        // Áp dụng discount cho phần còn lại
        totalDiscountAmount += calculation.discountAmount;
        remainingAmount = calculation.finalPrice;
      }

      appliedVouchers.push({
        voucher: calculation.voucher,
        discountAmount: calculation.discountAmount,
        message: calculation.message
      });
    }

    // Áp dụng giới hạn tổng discount nếu có
    if (maxDiscountPercent) {
      const maxByPercent = (orderAmount * maxDiscountPercent) / 100;
      if (totalDiscountAmount > maxByPercent) {
        totalDiscountAmount = maxByPercent;
      }
    }

    if (maxDiscountAmount) {
      if (totalDiscountAmount > maxDiscountAmount) {
        totalDiscountAmount = maxDiscountAmount;
      }
    }

    // Đảm bảo không giảm quá order amount
    totalDiscountAmount = Math.min(totalDiscountAmount, orderAmount);
    totalDiscountPercent = (totalDiscountAmount / orderAmount) * 100;

    const finalPrice = orderAmount - totalDiscountAmount;
    const totalAmount = freeShipping ? finalPrice : finalPrice + shippingFee;

    return {
      discountAmount: Math.round(totalDiscountAmount),
      discountPercent: Math.round(totalDiscountPercent * 100) / 100,
      freeShipping,
      finalPrice: Math.round(finalPrice),
      totalAmount: Math.round(totalAmount),
      appliedVouchers,
      message: appliedVouchers.map(v => v.message).join(", ")
    };
  },

  /**
   * Tính toán lại discount khi cart thay đổi
   * @param {Object} voucher - Voucher object
   * @param {number} newOrderAmount - New order amount
   * @param {number} newShippingFee - New shipping fee
   * @returns {Object} Recalculated result
   */
  recalculateDiscount(voucher, newOrderAmount, newShippingFee = 0) {
    // Kiểm tra min order amount
    if (newOrderAmount < voucher.minOrderAmount) {
      return {
        valid: false,
        errorCode: "MIN_ORDER_NOT_MET",
        message: `Đơn hàng tối thiểu ${voucher.minOrderAmount.toLocaleString("vi-VN")} VNĐ`,
        discountAmount: 0,
        finalPrice: newOrderAmount,
        totalAmount: newOrderAmount + newShippingFee
      };
    }

    // Tính lại discount
    const calculation = this.calculateDiscount(voucher, newOrderAmount, newShippingFee);
    
    return {
      valid: true,
      ...calculation
    };
  }
};


