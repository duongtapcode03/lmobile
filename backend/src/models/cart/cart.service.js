import { Cart } from "./cart.model.js";
import { Product } from "../product/product.model.js";

export const cartService = {
  // Lấy giỏ hàng của user
  async getCart(userId) {
    let cart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.product",
        select: "name price thumbnail stock isActive"
      });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    }

    // Lọc bỏ sản phẩm không còn active hoặc hết hàng
    cart.items = cart.items.filter(item => {
      const product = item.product;
      return product && product.isActive && product.stock >= item.quantity;
    });

    await cart.save();
    return cart;
  },

  // Thêm sản phẩm vào giỏ hàng
  async addToCart(userId, productData) {
    const { productId, quantity = 1, variant = {} } = productData;

    // Kiểm tra sản phẩm tồn tại và còn hàng
    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    if (!product.isActive) {
      throw new Error("Sản phẩm không còn bán");
    }

    if (product.stock < quantity) {
      throw new Error("Số lượng sản phẩm không đủ");
    }

    // Lấy hoặc tạo giỏ hàng
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    // Kiểm tra sản phẩm đã có trong giỏ chưa
    const existingItemIndex = cart.items.findIndex(item => {
      return item.product.toString() === productId &&
             JSON.stringify(item.variant) === JSON.stringify(variant);
    });

    if (existingItemIndex > -1) {
      // Cập nhật số lượng
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      
      if (newQuantity > product.stock) {
        throw new Error("Số lượng sản phẩm không đủ");
      }

      if (newQuantity > 10) {
        throw new Error("Số lượng không được quá 10");
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].price = product.price;
    } else {
      // Thêm sản phẩm mới
      cart.items.push({
        product: productId,
        quantity,
        variant,
        price: product.price
      });
    }

    await cart.save();
    await cart.populate({
      path: "items.product",
      select: "name price thumbnail stock isActive"
    });

    return cart;
  },

  // Cập nhật số lượng sản phẩm trong giỏ
  async updateCartItem(userId, itemId, quantity) {
    if (quantity < 1) {
      throw new Error("Số lượng phải lớn hơn 0");
    }

    if (quantity > 10) {
      throw new Error("Số lượng không được quá 10");
    }

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    const item = cart.items.id(itemId);
    if (!item) {
      throw new Error("Sản phẩm không tồn tại trong giỏ hàng");
    }

    // Kiểm tra tồn kho
    const product = await Product.findById(item.product);
    if (!product || product.stock < quantity) {
      throw new Error("Số lượng sản phẩm không đủ");
    }

    item.quantity = quantity;
    item.price = product.price;
    await cart.save();

    await cart.populate({
      path: "items.product",
      select: "name price thumbnail stock isActive"
    });

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

    await cart.populate({
      path: "items.product",
      select: "name price thumbnail stock isActive"
    });

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

    await cart.populate({
      path: "items.product",
      select: "name price thumbnail stock isActive"
    });

    return cart;
  },

  // Áp dụng mã giảm giá
  async applyCoupon(userId, couponCode, discountAmount) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    if (cart.totalAmount < discountAmount) {
      throw new Error("Số tiền giảm giá không được lớn hơn tổng tiền");
    }

    cart.couponCode = couponCode;
    cart.discountAmount = discountAmount;
    await cart.save();

    await cart.populate({
      path: "items.product",
      select: "name price thumbnail stock isActive"
    });

    return cart;
  },

  // Xóa mã giảm giá
  async removeCoupon(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    cart.couponCode = undefined;
    cart.discountAmount = 0;
    await cart.save();

    await cart.populate({
      path: "items.product",
      select: "name price thumbnail stock isActive"
    });

    return cart;
  },

  // Kiểm tra và cập nhật giá sản phẩm trong giỏ
  async syncCartPrices(userId) {
    const cart = await Cart.findOne({ user: userId })
      .populate({
        path: "items.product",
        select: "name price thumbnail stock isActive"
      });

    if (!cart) {
      throw new Error("Giỏ hàng không tồn tại");
    }

    let hasChanges = false;

    for (let item of cart.items) {
      const product = item.product;
      
      if (!product || !product.isActive) {
        cart.items.pull(item._id);
        hasChanges = true;
        continue;
      }

      if (product.stock < item.quantity) {
        item.quantity = product.stock;
        hasChanges = true;
      }

      if (item.price !== product.price) {
        item.price = product.price;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await cart.save();
    }

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

  // Tính phí vận chuyển dựa trên địa chỉ và phương thức
  calculateShippingFee(totalAmount, shippingMethod = "standard", province = "") {
    let baseFee = 0;

    // Phí cơ bản theo phương thức
    switch (shippingMethod) {
      case "express":
        baseFee = 50000;
        break;
      case "same_day":
        baseFee = 80000;
        break;
      case "standard":
      default:
        baseFee = 30000;
        break;
    }

    // Miễn phí vận chuyển cho đơn hàng trên 500k
    if (totalAmount >= 500000) {
      return 0;
    }

    // Phí vận chuyển cho các tỉnh xa
    const remoteProvinces = ["cao bang", "ha giang", "dien bien", "lai chau", "son la"];
    if (remoteProvinces.includes(province.toLowerCase())) {
      baseFee += 20000;
    }

    return baseFee;
  }
};
