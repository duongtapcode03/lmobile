import { Cart } from "./cart.model.js";
import { Product } from "../product/product.model.js";
import { findProductById } from "../product/product.service.js";
import { voucherIntegrationService } from "../voucher/voucherIntegration.service.js";

// Helper function to populate cart items manually (since Number ID might not work with mongoose populate)
async function populateCartItems(cart) {
  if (!cart || !cart.items || cart.items.length === 0) {
    return cart;
  }

  const productIds = cart.items.map(item => item.product).filter(Boolean);
  if (productIds.length === 0) {
    return cart;
  }

  const products = await Product.find({ _id: { $in: productIds } })
    .select("name price priceNumber thumbnail imageUrl stock isActive sku slug");

  const productMap = new Map();
  products.forEach(product => {
    productMap.set(product._id, product);
  });

  cart.items.forEach(item => {
    // item.product có thể là Number ID hoặc đã được populate thành Product object
    const productId = typeof item.product === 'number' ? item.product : item.product?._id;
    if (productId && productMap.has(productId)) {
      item.product = productMap.get(productId);
    } else if (productId && !productMap.has(productId)) {
      // Product không tìm thấy trong DB - giữ nguyên Number ID để không bị xóa nhầm
      // Chỉ set về Number ID nếu đã bị populate thành object
      if (typeof item.product !== 'number') {
        item.product = productId;
      }
    }
  });

  return cart;
}

export const cartService = {
  // Lấy giỏ hàng của user
  async getCart(userId) {
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    }

    // Populate products manually
    await populateCartItems(cart);

    // Lọc bỏ sản phẩm không còn active hoặc hết hàng
    cart.items = cart.items.filter(item => {
      const product = item.product;
      return product && product.isActive && product.stock >= item.quantity;
    });

    // Reset shippingFee về 0 nếu cart trống (không có sản phẩm thì không cần tính phí vận chuyển)
    if (cart.items.length === 0 && cart.shippingFee > 0) {
      cart.shippingFee = 0;
      await cart.save();
    } else {
      await cart.save();
    }
    
    // Populate again after filtering
    await populateCartItems(cart);
    return cart;
  },

  // Thêm sản phẩm vào giỏ hàng (API mới - chỉ cần productId và quantity)
  async addToCart(userId, productData) {
    const { productId, quantity = 1, variantId } = productData;

    // Convert productId to number if needed
    let numericProductId = null;
    if (typeof productId === 'number') {
      numericProductId = productId;
    } else {
      const parsed = parseInt(String(productId).trim(), 10);
      if (!isNaN(parsed)) {
        numericProductId = parsed;
      }
    }

    if (numericProductId === null) {
      throw new Error("Product ID không hợp lệ");
    }

    // Kiểm tra sản phẩm tồn tại và còn hàng - sử dụng findProductById helper
    const product = await findProductById(numericProductId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    if (!product.isActive) {
      throw new Error("Sản phẩm không còn bán");
    }

    if (product.stock < quantity) {
      throw new Error("Số lượng sản phẩm không đủ");
    }

    // Xử lý variant nếu có variantId
    let variant = {};
    let finalPrice = product.priceNumber; // Dùng priceNumber thay vì price (string)

    if (variantId) {
      // Nếu có variantId, lấy thông tin variant và giá từ variant
      const { ProductVariant } = await import("../product/productVariant.model.js");
      const variantData = await ProductVariant.findOne({ 
        _id: variantId, 
        productId: numericProductId 
      });
      
      if (variantData) {
        finalPrice = variantData.priceNumber;
        // Map variant data
        if (variantData.type === 'storage') {
          variant.storage = variantData.label;
        } else if (variantData.type === 'color') {
          variant.color = variantData.label;
        }
      }
    }

    // Lấy hoặc tạo giỏ hàng
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Kiểm tra sản phẩm đã có trong giỏ chưa (cùng product và variant)
    const existingItemIndex = cart.items.findIndex(item => {
      return item.product === numericProductId &&
             JSON.stringify(item.variant) === JSON.stringify(variant);
    });

    if (existingItemIndex > -1) {
      // Cập nhật số lượng
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.stock) {
        throw new Error("Số lượng sản phẩm không đủ");
      }

      // Không giới hạn 10 nữa, chỉ kiểm tra stock
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].price = finalPrice; // Dùng priceNumber
    } else {
      // Thêm sản phẩm mới
      cart.items.push({
        product: numericProductId,
        quantity,
        variant,
        price: finalPrice // Dùng priceNumber
      });
    }

    // Reset phí vận chuyển về 0 khi thêm sản phẩm (vì chưa chọn phương thức vận chuyển)
    cart.shippingFee = 0;

    await cart.save();
    
    // Populate products manually since Number ID might not work with mongoose populate
    await populateCartItems(cart);

    return cart;
  },

  // Cập nhật số lượng sản phẩm trong giỏ
  async updateCartItem(userId, itemId, quantity) {
    if (quantity < 1) {
      throw new Error("Số lượng phải lớn hơn 0");
    }

    // Không giới hạn 10 nữa, chỉ kiểm tra stock

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    const item = cart.items.id(itemId);
    if (!item) {
      throw new Error("Sản phẩm không tồn tại trong giỏ hàng");
    }

    // Kiểm tra tồn kho - sử dụng findProductById helper
    const product = await findProductById(item.product);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    // Nếu số lượng vượt quá tồn kho, tự động điều chỉnh về số lượng tồn kho
    let finalQuantity = quantity;
    if (product.stock < quantity) {
      finalQuantity = product.stock;
      // Nếu stock = 0, không thể cập nhật
      if (finalQuantity === 0) {
        throw new Error("Sản phẩm đã hết hàng");
      }
    }

    item.quantity = finalQuantity;
    item.price = product.priceNumber; // Dùng priceNumber thay vì price (string)
    await cart.save();

    await populateCartItems(cart);

    return cart;
  },

  // Xóa sản phẩm khỏi giỏ hàng
  async removeFromCart(userId, itemId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    const item = cart.items.id(itemId);
    if (!item) {
      throw new Error("Sản phẩm không tồn tại trong giỏ hàng");
    }

    cart.items.pull(itemId);
    await cart.save();

    await populateCartItems(cart);

    return cart;
  },

  // Xóa tất cả sản phẩm khỏi giỏ hàng
  async clearCart(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    cart.items = [];
    await cart.save();

    return cart;
  },

  // Cập nhật phí vận chuyển
  async updateShippingFee(userId, shippingFee) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    cart.shippingFee = shippingFee;
    await cart.save();

    await populateCartItems(cart);

    return cart;
  },

  // Áp dụng mã giảm giá
  /**
   * Apply voucher vào cart (sử dụng voucher integration service)
   * @param {string} userId - User ID
   * @param {string} couponCode - Voucher code
   * @returns {Object} Cart với voucher đã apply
   */
  async applyCoupon(userId, couponCode) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    if (cart.items.length === 0) {
      throw new Error("Giỏ hàng trống");
    }

    // Tính shipping fee (tạm thời, sẽ tính lại khi checkout)
    const shippingFee = this.calculateShippingFee(
      cart.totalAmount,
      "standard",
      "" // Province sẽ được tính khi checkout
    );

    // Convert cart items để validate
    const cartItems = cart.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      categoryId: null // Có thể thêm categoryId vào cart item nếu cần
    }));

    // Apply voucher sử dụng integration service (truyền cartId để tạo temporary order reference)
    const voucherResult = await voucherIntegrationService.applyVoucherToCart(
      couponCode,
      userId,
      cartItems,
      cart.totalAmount,
      shippingFee,
      cart._id.toString() // Truyền cartId để tạo temporary order reference
    );

    if (!voucherResult.success) {
      throw new Error(voucherResult.message || "Không thể áp dụng voucher");
    }

    // Update cart với voucher info
    cart.couponCode = couponCode;
    cart.discountAmount = voucherResult.discountAmount;
    
    // Nếu free shipping, set shippingFee = 0
    if (voucherResult.freeShipping) {
      cart.shippingFee = 0;
    }

    await cart.save();
    await populateCartItems(cart);

    return {
      cart,
      voucher: voucherResult.voucher,
      discountAmount: voucherResult.discountAmount,
      message: voucherResult.message || `Áp dụng voucher ${couponCode} thành công`
    };
  },

  /**
   * Remove voucher từ cart (sử dụng voucher integration service)
   * @param {string} userId - User ID
   * @returns {Object} Cart sau khi remove voucher
   */
  async removeCoupon(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    // Lưu lại shipping fee hiện tại để check xem có phải free shipping voucher không
    const currentShippingFee = cart.shippingFee;

    // Nếu có voucher, rollback pending usage
    if (cart.couponCode) {
      await voucherIntegrationService.removeVoucherFromCart(userId, cart.couponCode);
    }

    cart.couponCode = undefined;
    cart.discountAmount = 0;
    
    // Nếu shippingFee = 0 và có voucher, có thể là free shipping voucher
    // Restore shipping fee theo phương thức mặc định (standard: 30000)
    // Frontend sẽ cập nhật lại theo shipping method thực tế
    if (currentShippingFee === 0 && cart.items.length > 0) {
      cart.shippingFee = this.calculateShippingFee(cart.totalAmount, "standard", "");
    }
    
    await cart.save();

    await populateCartItems(cart);

    return cart;
  },

  // Kiểm tra và cập nhật giá sản phẩm trong giỏ
  async syncCartPrices(userId) {
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    // Populate products trước để có thể kiểm tra product.isActive, product.stock, etc.
    await populateCartItems(cart);

    let hasChanges = false;

    // Lặp qua items và kiểm tra từng item
    for (let i = cart.items.length - 1; i >= 0; i--) {
      const item = cart.items[i];
      // item.product có thể là Number ID hoặc Product object (sau populate)
      let product = item.product;
      
      // Lưu productId gốc (Number) để đảm bảo save đúng
      const productId = typeof product === 'number' ? product : product._id;
      
      // Nếu product là Number ID, query từ DB
      if (typeof product === 'number') {
        product = await findProductById(product);
      }
      
      // Nếu không tìm thấy product hoặc product không active, xóa item này
      if (!product || !product.isActive) {
        cart.items.splice(i, 1);
        hasChanges = true;
        continue;
      }

      // Điều chỉnh số lượng nếu vượt quá tồn kho
      if (product.stock < item.quantity) {
        item.quantity = product.stock;
        hasChanges = true;
      }

      // Cập nhật giá nếu khác
      // So sánh với priceNumber (Number) thay vì price (String)
      if (item.price !== product.priceNumber) {
        item.price = product.priceNumber;
        hasChanges = true;
      }

      // Đảm bảo item.product là Number ID trước khi save
      item.product = productId;
    }

    // Save nếu có thay đổi
    if (hasChanges) {
      await cart.save();
    }

    // Populate lại để trả về đầy đủ thông tin
    await populateCartItems(cart);

    return cart;
  },

  // Lấy thống kê giỏ hàng
  async getCartStats(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return {
        totalItems: 0,
        totalAmount: 0,
        isEmpty: true
      };
    }

    return {
      totalItems: cart.totalItems,
      totalAmount: cart.totalAmount,
      shippingFee: cart.shippingFee,
      discountAmount: cart.discountAmount,
      finalAmount: cart.finalAmount,
      isEmpty: cart.isEmpty
    };
  },

  // Tính phí vận chuyển dựa trên phương thức
  calculateShippingFee(totalAmount, shippingMethod = "standard", province = "") {
    // Phí cơ bản theo phương thức (cố định)
    switch (shippingMethod) {
      case "express":
        return 50000;
      case "same_day":
        return 80000;
      case "standard":
      default:
        return 30000;
    }
  }
};
