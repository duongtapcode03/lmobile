import mongoose from "mongoose";
import { Order } from "./order.model.js";
import { Cart } from "../cart/cart.model.js";
import { Product } from "../product/product.model.js";
import { cartService } from "../cart/cart.service.js";
import { voucherService } from "../voucher/voucher.service.js";
import { voucherIntegrationService } from "../voucher/voucherIntegration.service.js";
import { VoucherUsage } from "../voucher/voucherUsage.model.js";
import { flashSaleReservationService } from "../flashSale/flashSaleReservation.service.js";

export const orderService = {
  // Tạo đơn hàng từ giỏ hàng
  async createOrderFromCart(userId, orderData) {
    const { 
      shippingAddress, 
      paymentMethod, 
      shippingMethod = "standard",
      notes = "",
      isGift = false,
      giftMessage = "",
      selectedItemIds = null, // Danh sách item IDs được chọn để thanh toán
      flashSaleReservationIds = null // Danh sách reservation IDs nếu có flash sale items
    } = orderData;

    // Lấy giỏ hàng
    const cart = await cartService.getCart(userId);
    if (cart.isEmpty) {
      throw new Error("Giỏ hàng trống");
    }

    // Nếu có selectedItemIds, filter cart items chỉ lấy các item đã chọn
    let cartItems = cart.items;
    if (selectedItemIds && Array.isArray(selectedItemIds) && selectedItemIds.length > 0) {
      // Convert selectedItemIds to strings để đảm bảo so sánh đúng
      const selectedItemIdsStr = selectedItemIds.map(id => String(id));
      
      console.log(`[Order] Filtering cart items with selectedItemIds:`, {
        selectedItemIds: selectedItemIds,
        selectedItemIdsStr: selectedItemIdsStr,
        totalCartItems: cart.items.length,
        cartItemIds: cart.items.map(item => item._id.toString())
      });
      
      cartItems = cart.items.filter(item => {
        const itemIdStr = String(item._id);
        const isSelected = selectedItemIdsStr.includes(itemIdStr);
        if (!isSelected) {
          console.log(`[Order] Item ${itemIdStr} (type: ${typeof item._id}) not in selectedItemIds`);
        }
        return isSelected;
      });
      
      console.log(`[Order] Filtered result:`, {
        originalCount: cart.items.length,
        filteredCount: cartItems.length,
        selectedItemIdsCount: selectedItemIds.length,
        filteredItemIds: cartItems.map(item => String(item._id))
      });
      
      if (cartItems.length === 0) {
        throw new Error("Không có sản phẩm nào được chọn để thanh toán");
      }
      console.log(`[Order] Creating order with ${cartItems.length} selected items out of ${cart.items.length} total items`);
    } else {
      console.log(`[Order] No selectedItemIds provided, using all ${cart.items.length} cart items`);
    }

    // Validate flash sale reservations nếu có
    const reservationMap = new Map(); // Map productId -> reservation
    console.log(`[Order] Flash sale reservation IDs received:`, flashSaleReservationIds);
    
    if (flashSaleReservationIds && Array.isArray(flashSaleReservationIds) && flashSaleReservationIds.length > 0) {
      console.log(`[Order] Validating ${flashSaleReservationIds.length} flash sale reservations...`);
      for (const reservationId of flashSaleReservationIds) {
        console.log(`[Order] Validating reservation ${reservationId}...`);
        const validation = await flashSaleReservationService.validateReservation(reservationId);
        if (!validation.valid) {
          console.error(`[Order] Reservation ${reservationId} is invalid:`, validation.reason);
          throw new Error(validation.reason || 'Flash sale reservation không hợp lệ');
        }

        // Kiểm tra reservation thuộc về user này
        if (validation.reservation.user_id.toString() !== userId.toString()) {
          console.error(`[Order] Reservation ${reservationId} does not belong to user ${userId}`);
          throw new Error('Reservation không thuộc về bạn');
        }

        console.log(`[Order] Reservation ${reservationId} validated. Product ID: ${validation.reservation.product_id}, Quantity: ${validation.reservation.quantity}`);
        reservationMap.set(validation.reservation.product_id, validation.reservation);
      }
      console.log(`[Order] All ${flashSaleReservationIds.length} reservations validated successfully`);
    } else {
      console.log(`[Order] No flash sale reservations to validate. flashSaleReservationIds:`, flashSaleReservationIds);
    }

    // Kiểm tra lại tồn kho và giá
    const productMap = new Map(); // Lưu product info để dùng sau
    for (let item of cartItems) {
      // Đảm bảo product ID là Number
      const productId = typeof item.product === 'number' 
        ? item.product 
        : (typeof item.product === 'object' ? item.product._id : parseInt(item.product, 10));
      
      if (isNaN(productId)) {
        throw new Error(`Product ID không hợp lệ: ${item.product}`);
      }

      const product = await Product.findOne({ _id: productId });
      if (!product || !product.isActive) {
        throw new Error(`Sản phẩm ${item.productName || 'không xác định'} không còn bán`);
      }

      // Kiểm tra nếu có reservation flash sale
      const reservation = reservationMap.get(productId);
      if (reservation) {
        // Kiểm tra quantity khớp với reservation
        if (item.quantity !== reservation.quantity) {
          throw new Error(`Số lượng sản phẩm ${product.name} không khớp với reservation`);
        }
        // Sử dụng giá flash sale
        item.price = reservation.flash_price;
      } else {
        // Kiểm tra stock thông thường
        if (product.stock < item.quantity) {
          throw new Error(`Sản phẩm ${product.name} không đủ hàng`);
        }
        // Cập nhật giá mới nhất
        item.price = product.priceNumber || product.price;
      }

      // Lưu product info để dùng khi tạo order items (sử dụng Number ID làm key)
      productMap.set(productId, product);
    }

    // Tính subtotal từ các items đã chọn để tính shippingFee
    const selectedSubtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Tính phí vận chuyển dựa trên subtotal của các items đã chọn
    const shippingFee = cartService.calculateShippingFee(
      selectedSubtotal, 
      shippingMethod, 
      shippingAddress.province
    );

    // Tạo items cho đơn hàng
    const orderItems = cartItems.map(item => {
      // item.product có thể là Number ID hoặc Product object (đã populate)
      const productId = typeof item.product === 'number' 
        ? item.product 
        : (typeof item.product === 'object' ? item.product._id : parseInt(item.product, 10));
      
      // Lấy product từ Map (đảm bảo sử dụng Number ID)
      const product = productMap.get(productId) || (typeof item.product === 'object' ? item.product : null);
      
      if (!product) {
        throw new Error(`Không tìm thấy thông tin sản phẩm với ID: ${productId}`);
      }
      
      return {
        product: productId,
        productName: product.name || 'Sản phẩm không xác định',
        productImage: product.thumbnail || "",
        quantity: item.quantity,
        variant: item.variant,
        price: item.price,
        importPrice: product.importPrice || 0, // Lấy importPrice từ product
        totalPrice: item.price * item.quantity
      };
    });

    // Tính tổng tiền
    const subtotal = orderItems.reduce((total, item) => total + item.totalPrice, 0);
    
    // Pre-checkout revalidation: Validate lại voucher trước khi tạo order
    let discountAmount = 0;
    let voucherUsageId = null;
    
    if (cart.couponCode) {
      try {
        // Convert cart items để validate
        const cartItemsForValidation = orderItems.map(item => ({
          product: item.product,
          quantity: item.quantity
        }));

        // Tìm pending usage hiện có từ cart TRƯỚC (nếu đã apply vào cart)
        // Nếu có pending usage, không cần validate lại user limit
        const existingPendingUsage = await VoucherUsage.findOne({
          user: userId,
          voucherCode: cart.couponCode.toUpperCase(),
          status: "pending"
        });

        // Revalidate voucher với số tiền mới
        // Nếu đã có pending usage, skip user check (vì đã validate khi apply vào cart)
        const revalidation = await voucherIntegrationService.preCheckoutRevalidate(
          cart.couponCode,
          userId,
          cartItemsForValidation,
          subtotal,
          shippingFee,
          existingPendingUsage ? true : false // skipUserCheck nếu đã có pending usage
        );

        if (!revalidation.success) {
          // Voucher không còn hợp lệ, remove khỏi cart
          cart.couponCode = undefined;
          cart.discountAmount = 0;
          await cart.save();
          
          throw new Error(revalidation.message || "Voucher không còn hợp lệ. Vui lòng thử lại.");
        }

        if (existingPendingUsage) {
          // Sử dụng pending usage hiện có, không cần lock lại
          voucherUsageId = existingPendingUsage._id.toString();
          discountAmount = revalidation.discountAmount;
          console.log(`[Order] Using existing pending voucher usage. UsageId: ${voucherUsageId}, Code: ${cart.couponCode}`);
        } else {
          // Nếu chưa có pending usage, lock voucher mới (trường hợp user apply voucher trực tiếp khi checkout)
        const lockResult = await voucherIntegrationService.lockVoucherForOrder(
          cart.couponCode,
          userId,
          `TEMP-${Date.now()}` // Temporary ID
        );

        if (!lockResult.success) {
          throw new Error(lockResult.message || "Voucher đã hết lượt sử dụng. Vui lòng thử lại.");
        }

        voucherUsageId = lockResult.usageId;
        discountAmount = revalidation.discountAmount;
          console.log(`[Order] Locked new voucher usage. UsageId: ${voucherUsageId}, Code: ${cart.couponCode}`);
        }

        // Đảm bảo usageId là string
        if (voucherUsageId && typeof voucherUsageId !== 'string') {
          voucherUsageId = voucherUsageId.toString();
        }

        console.log(`[Order] Voucher locked successfully. UsageId: ${voucherUsageId} (type: ${typeof voucherUsageId}), Code: ${cart.couponCode}`);

      } catch (error) {
        // Nếu có lỗi với voucher, vẫn cho phép tạo order nhưng không dùng voucher
        console.error(`[Order] Voucher validation/lock error:`, error.message);
        cart.couponCode = undefined;
        cart.discountAmount = 0;
        await cart.save();
        
        // Có thể throw error hoặc tiếp tục không dùng voucher
        // Ở đây tôi sẽ throw để user biết voucher không hợp lệ
        throw new Error(error.message || "Voucher không hợp lệ. Vui lòng thử lại.");
      }
    } else {
      // Tính lại discountAmount theo tỷ lệ nếu có (fallback cho trường hợp không dùng voucher integration)
      if (cart.discountAmount && cart.discountAmount > 0 && cart.totalAmount > 0) {
        const ratio = subtotal / cart.totalAmount;
        discountAmount = Math.round(cart.discountAmount * ratio);
      }
    }
    
    const totalAmount = subtotal + shippingFee - discountAmount;

    // Tạo orderNumber tự động (đảm bảo unique)
    let orderNumber;
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      const timestamp = Date.now().toString().slice(-8);
      const random = Math.random().toString(36).substr(2, 4).toUpperCase();
      orderNumber = `ORD-${timestamp}-${random}`;
      
      // Kiểm tra xem orderNumber đã tồn tại chưa
      const existingOrder = await Order.findOne({ orderNumber });
      if (!existingOrder) {
        isUnique = true;
      }
      attempts++;
    }
    
    if (!isUnique) {
      throw new Error("Không thể tạo orderNumber, vui lòng thử lại");
    }

    // Thu thập thông tin flash sale nếu có
    let flashSaleInfo = {
      hasFlashSaleItems: false,
      flashSaleId: null,
      reservationIds: []
    };
    
    console.log(`[Order] Checking flash sale info:`, {
      hasFlashSaleReservationIds: !!flashSaleReservationIds,
      flashSaleReservationIdsLength: flashSaleReservationIds?.length || 0,
      reservationMapSize: reservationMap.size
    });
    
    if (flashSaleReservationIds && flashSaleReservationIds.length > 0) {
      flashSaleInfo.hasFlashSaleItems = true;
      flashSaleInfo.reservationIds = flashSaleReservationIds;
      
      // Lấy flashSaleId từ reservation đầu tiên (tất cả reservations cùng flash sale)
      if (reservationMap.size > 0) {
        const firstReservation = Array.from(reservationMap.values())[0];
        flashSaleInfo.flashSaleId = firstReservation.flash_sale_id;
        console.log(`[Order] Found flashSaleId from reservationMap:`, flashSaleInfo.flashSaleId);
      } else {
        // Nếu reservationMap rỗng, thử lấy từ reservation đầu tiên bằng cách query database
        console.warn(`[Order] reservationMap is empty but flashSaleReservationIds exists. Trying to get flashSaleId from first reservation...`);
        try {
          const firstReservationId = flashSaleReservationIds[0];
          const firstReservation = await FlashSaleReservation.findById(firstReservationId);
          if (firstReservation) {
            flashSaleInfo.flashSaleId = firstReservation.flash_sale_id;
            console.log(`[Order] Found flashSaleId from reservation:`, flashSaleInfo.flashSaleId);
          } else {
            console.warn(`[Order] Could not find reservation ${firstReservationId} in database`);
          }
        } catch (error) {
          console.error(`[Order] Error getting flashSaleId from reservation:`, error);
        }
      }
      
      console.log(`[Order] Flash sale info created:`, {
        hasFlashSaleItems: flashSaleInfo.hasFlashSaleItems,
        flashSaleId: flashSaleInfo.flashSaleId,
        reservationCount: flashSaleInfo.reservationIds.length,
        reservationIds: flashSaleInfo.reservationIds
      });
    } else {
      console.log(`[Order] No flash sale reservations. flashSaleInfo will be default (hasFlashSaleItems: false)`);
    }

    // Tạo đơn hàng
    const order = new Order({
      orderNumber, // Tự tạo orderNumber trước khi save
      user: userId,
      items: orderItems,
      shippingAddress,
      paymentInfo: {
        method: paymentMethod,
        status: "pending"
      },
      subtotal,
      shippingFee,
      discountAmount: discountAmount,
      couponCode: cart.couponCode,
      totalAmount,
      flashSaleInfo: flashSaleInfo.hasFlashSaleItems ? flashSaleInfo : undefined,
      shippingMethod,
      notes,
      isGift,
      giftMessage,
      statusHistory: [{
        status: "pending",
        note: "Đơn hàng được tạo",
        updatedAt: new Date()
      }]
    });

    await order.save();

    // Xác nhận flash sale reservations nếu có
    const confirmedReservationIds = []; // Track các reservations đã confirm để rollback nếu cần
    if (flashSaleReservationIds && Array.isArray(flashSaleReservationIds) && flashSaleReservationIds.length > 0) {
      console.log(`[Order] Confirming ${flashSaleReservationIds.length} flash sale reservations...`);
        try {
        for (const reservationId of flashSaleReservationIds) {
          console.log(`[Order] Confirming reservation ${reservationId} for order ${order._id}`);
          const confirmedReservation = await flashSaleReservationService.confirmReservation(reservationId, order._id);
          confirmedReservationIds.push(reservationId);
          console.log(`[Order] Successfully confirmed reservation ${reservationId}. Sold updated.`);
        }
        console.log(`[Order] All ${flashSaleReservationIds.length} flash sale reservations confirmed successfully.`);
        } catch (error) {
        console.error(`[Order] Error confirming reservation:`, error);
        
        // Rollback tất cả reservations đã confirm trước đó
        for (const confirmedId of confirmedReservationIds) {
          try {
            console.log(`[Order] Rolling back confirmed reservation ${confirmedId}...`);
            // Sử dụng rollbackConfirmedReservation cho confirmed reservations
            await flashSaleReservationService.rollbackConfirmedReservation(confirmedId);
          } catch (rollbackError) {
            console.error(`[Order] Error rolling back reservation ${confirmedId}:`, rollbackError);
          }
        }
        
        // Delete order
          await Order.deleteOne({ _id: order._id });
        
          throw new Error(`Không thể xác nhận flash sale reservation: ${error.message}`);
        }
    } else {
      console.log(`[Order] No flash sale reservations to confirm. flashSaleReservationIds:`, flashSaleReservationIds);
    }

    // Cập nhật tồn kho sản phẩm (chỉ giảm stock, chưa tăng sold)
    // sold sẽ được cập nhật khi đơn hàng chuyển sang trạng thái "delivered"
    // Lưu ý: Flash sale items đã được xử lý trong confirmReservation (giảm reserved, tăng sold)
    for (let item of orderItems) {
      // Bỏ qua nếu là flash sale item (đã xử lý trong confirmReservation)
      if (reservationMap.has(item.product)) {
        continue;
      }

      await Product.findOneAndUpdate(
        { _id: item.product },
        { 
          $inc: { 
            stock: -item.quantity
          } 
        }
      );
    }

    // Commit voucher usage sau khi order được tạo thành công
    if (order.couponCode) {
      if (!voucherUsageId) {
        console.error(`[Order] Warning: Voucher code ${order.couponCode} was used but voucherUsageId is missing!`);
      } else {
        try {
          console.log(`[Order] Committing voucher usage. UsageId: ${voucherUsageId}, Code: ${order.couponCode}`);
          
          const commitResult = await voucherIntegrationService.commitVoucherUsage(voucherUsageId, {
            orderId: order._id,
            orderNumber: order.orderNumber,
            discountAmount: order.discountAmount,
            orderAmount: order.subtotal,
            finalAmount: order.totalAmount
          });

          if (!commitResult.success) {
            // Nếu commit fail, rollback voucher
            console.error(`[Order] Failed to commit voucher usage, rolling back...`);
            await voucherIntegrationService.rollbackVoucherUsageByOrder(order._id);
            throw new Error("Lỗi khi xác nhận voucher. Vui lòng thử lại.");
          }

          console.log(`[Order] Successfully committed voucher usage for code: ${order.couponCode}, UsageId: ${voucherUsageId}`);
        } catch (error) {
          // Nếu commit fail, rollback order, voucher và flash sale reservations
          console.error(`[Order] Voucher commit error:`, error.message);
          
          // Rollback voucher
          await voucherIntegrationService.rollbackVoucherUsageByOrder(order._id);
          
          // Rollback flash sale reservations nếu có
          if (confirmedReservationIds && confirmedReservationIds.length > 0) {
            console.log(`[Order] Rolling back ${confirmedReservationIds.length} flash sale reservations...`);
            for (const reservationId of confirmedReservationIds) {
              try {
                // Sử dụng rollbackConfirmedReservation cho confirmed reservations
                await flashSaleReservationService.rollbackConfirmedReservation(reservationId);
              } catch (rollbackError) {
                console.error(`[Order] Error rolling back reservation ${reservationId}:`, rollbackError);
              }
            }
          }
          
          // Rollback stock
          for (let item of orderItems) {
            // Bỏ qua flash sale items (đã được rollback trong cancelReservation)
            if (reservationMap.has(item.product)) {
              continue;
            }
            
            await Product.findOneAndUpdate(
              { _id: item.product },
              { $inc: { stock: item.quantity } }
            );
          }
          
          // Delete order
          await Order.findByIdAndDelete(order._id);
          
          throw new Error(error.message || "Lỗi khi xác nhận voucher. Vui lòng thử lại.");
        }
      }
    }

    // Xóa các items đã được chọn khỏi giỏ hàng sau khi tạo đơn hàng thành công
    // Nếu có selectedItemIds, chỉ xóa các items đó
    // Nếu không có (tạo order từ tất cả items), xóa toàn bộ cart
    if (selectedItemIds && Array.isArray(selectedItemIds) && selectedItemIds.length > 0) {
      // Xóa từng item đã chọn
      for (const itemId of selectedItemIds) {
        try {
          await cartService.removeFromCart(userId, itemId);
        } catch (error) {
          console.error(`[Order] Error removing item ${itemId} from cart:`, error.message);
          // Tiếp tục xóa các items khác dù có lỗi
        }
      }
      console.log(`[Order] Removed ${selectedItemIds.length} selected items from cart`);
    } else {
      // Xóa toàn bộ cart nếu không có selectedItemIds (tương thích với code cũ)
      await cartService.clearCart(userId);
    }

    // Populate thông tin (chỉ populate user, không populate items.product vì Product dùng Number ID)
    await order.populate([
      { path: "user", select: "name email phone" }
    ]);

    return order;
  },

  // Lấy đơn hàng theo ID
  async getOrderById(orderId, userId, userRole = null) {
    // Admin và Seller có thể xem bất kỳ đơn hàng nào
    const filter = { _id: orderId };
    if (!["admin", "seller"].includes(userRole)) {
      filter.user = userId;
    }

    const order = await Order.findOne(filter).populate([
      { path: "user", select: "name email phone" }
      // Không populate items.product vì Product dùng Number ID
    ]);

    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    // Populate importPrice từ product hiện tại cho các order items thiếu importPrice
    if (order.items && order.items.length > 0) {
      const productIds = order.items
        .filter(item => !item.importPrice || item.importPrice === 0)
        .map(item => {
          // Đảm bảo product ID là Number
          const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
          return isNaN(productId) ? null : productId;
        })
        .filter(id => id !== null);
      
      if (productIds.length > 0) {
        const products = await Product.find({ _id: { $in: productIds } })
          .select("_id importPrice");
        
        const productMap = new Map();
        products.forEach(p => {
          // Đảm bảo _id là Number khi set vào Map
          const productId = typeof p._id === 'number' ? p._id : parseInt(p._id, 10);
          productMap.set(productId, p.importPrice || 0);
        });
        
        // Cập nhật importPrice cho các items thiếu (chỉ trong memory, không save)
        order.items.forEach(item => {
          if (!item.importPrice || item.importPrice === 0) {
            const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
            if (!isNaN(productId) && productMap.has(productId)) {
              item.importPrice = productMap.get(productId);
            }
          }
        });
      }
    }

    return order;
  },

  // Lấy đơn hàng theo orderNumber
  async getOrderByNumber(orderNumber, userId) {
    const order = await Order.findOne({ 
      orderNumber, 
      user: userId 
    }).populate([
      { path: "user", select: "name email phone" }
      // Không populate items.product vì Product dùng Number ID
    ]);

    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    return order;
  },

  // Lấy tất cả đơn hàng của user
  async getUserOrders(userId, query = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    const filter = { user: userId };
    if (status) {
      filter.status = status;
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate([
        { path: "user", select: "name email phone" }
        // Không populate items.product vì Product dùng Number ID
      ])
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    return {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Cập nhật trạng thái đơn hàng
  async updateOrderStatus(orderId, newStatus, userId, userRole = null, note = "") {
    const validStatuses = [
      "pending", "confirmed", "processing", 
      "shipping", "delivered", "cancelled", "returned"
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error("Trạng thái không hợp lệ");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    // Kiểm tra quyền (admin và seller có thể cập nhật bất kỳ đơn hàng nào)
    if (!["admin", "seller"].includes(userRole)) {
      // User thường chỉ có thể cập nhật đơn hàng của mình
      if (order.user.toString() !== userId.toString()) {
        throw new Error("Không có quyền cập nhật đơn hàng này");
      }
    }

    // Kiểm tra logic chuyển trạng thái
    if (newStatus === "cancelled" && !order.canCancel) {
      throw new Error("Không thể hủy đơn hàng ở trạng thái này");
    }

    const oldStatus = order.status;
    order.status = newStatus;

    // Cập nhật thời gian giao hàng và trạng thái thanh toán
    if (newStatus === "delivered") {
      order.deliveredAt = new Date();
      
      // Tự động cập nhật trạng thái thanh toán thành "paid" khi giao hàng thành công
      // Đặc biệt quan trọng với COD (thanh toán khi nhận hàng)
      if (order.paymentInfo.status === "pending") {
        order.paymentInfo.status = "paid";
        order.paymentInfo.paidAt = new Date();
      }

      // Cập nhật số lượng đã bán (sold) của sản phẩm khi đơn hàng được giao
      // Chỉ cập nhật nếu đơn hàng chưa được giao trước đó (tránh cập nhật trùng lặp)
      if (oldStatus !== "delivered") {
        for (let item of order.items) {
          await Product.findOneAndUpdate(
            { _id: item.product },
            { 
              $inc: { 
                sold: item.quantity 
              } 
            }
          );
        }
      }
    }

    // Thêm vào lịch sử
    order.statusHistory.push({
      status: newStatus,
      note: note || `Chuyển từ ${oldStatus} sang ${newStatus}`,
      updatedAt: new Date()
    });

    await order.save();

    // Xử lý cập nhật stock và sold khi thay đổi trạng thái
    if (newStatus === "cancelled" || newStatus === "returned") {
      // Rollback voucher usage nếu có
      if (order.couponCode) {
        try {
          const rollbackResult = await voucherIntegrationService.rollbackVoucherUsageByOrder(order._id);
          if (rollbackResult.success) {
            console.log(`[Order] Rolled back voucher usage for order ${order.orderNumber}: ${rollbackResult.message}`);
          }
        } catch (error) {
          // Log lỗi nhưng không throw để không ảnh hưởng đến việc cancel order
          console.error(`[Order] Failed to rollback voucher usage for order ${order.orderNumber}:`, error.message);
        }
      }

      // Nếu đơn hàng đã được giao trước đó, cần giảm sold và hoàn lại stock
      if (oldStatus === "delivered") {
        for (let item of order.items) {
          await Product.findOneAndUpdate(
            { _id: item.product },
            { 
              $inc: { 
                sold: -item.quantity,
                stock: item.quantity // Hoàn lại tồn kho
              } 
            }
          );
        }
      } 
      // Nếu đơn hàng chưa được giao, chỉ hoàn lại stock (không giảm sold vì chưa tăng)
      else if (oldStatus !== "cancelled" && oldStatus !== "returned") {
        for (let item of order.items) {
          await Product.findOneAndUpdate(
            { _id: item.product },
            { 
              $inc: { 
                stock: item.quantity
              } 
            }
          );
        }
      }

      // Hoàn lại voucher nếu order có sử dụng voucher
      if (order.couponCode) {
        try {
          await voucherService.refundVoucher(order.couponCode);
          console.log(`[Order] Refunded voucher usage count for code: ${order.couponCode}`);
        } catch (error) {
          // Log lỗi nhưng không throw để không ảnh hưởng đến việc cập nhật order
          console.error(`[Order] Failed to refund voucher usage count for code: ${order.couponCode}`, error.message);
        }
      }
    }

    // Populate thông tin (chỉ populate user, không populate items.product vì Product dùng Number ID)
    await order.populate([
      { path: "user", select: "name email phone" }
    ]);

    return order;
  },

  // Cập nhật thông tin thanh toán
  async updatePaymentInfo(orderId, paymentData, userId) {
    const { status, transactionId } = paymentData;

    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    if (order.user.toString() !== userId) {
      throw new Error("Không có quyền cập nhật đơn hàng này");
    }

    order.paymentInfo.status = status;
    if (transactionId) {
      order.paymentInfo.transactionId = transactionId;
    }

    if (status === "paid") {
      order.paymentInfo.paidAt = new Date();
    }

    await order.save();

    return order;
  },

  // Cập nhật tracking number
  async updateTrackingNumber(orderId, trackingNumber, userId) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error("Đơn hàng không tồn tại");
    }

    // Chỉ admin hoặc seller mới có thể cập nhật tracking
    if (!["admin", "seller"].includes(userId.role)) {
      throw new Error("Không có quyền cập nhật tracking");
    }

    order.trackingNumber = trackingNumber;
    order.status = "shipping";

    order.statusHistory.push({
      status: "shipping",
      note: `Cập nhật mã vận đơn: ${trackingNumber}`,
      updatedAt: new Date()
    });

    await order.save();

    return order;
  },

  // Lấy tất cả đơn hàng (Admin)
  async getAllOrders(query = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = query;

    const filter = {};
    
    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter["paymentInfo.status"] = paymentStatus;
    }

    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.fullName": { $regex: search, $options: "i" } },
        { "shippingAddress.phone": { $regex: search, $options: "i" } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === "desc" ? -1 : 1;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(filter)
      .populate([
        { path: "user", select: "name email phone" }
        // Không populate items.product vì Product dùng Number ID
      ])
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Populate importPrice từ product hiện tại cho các order items thiếu importPrice
    // Thu thập tất cả productIds từ tất cả orders để query một lần (tối ưu performance)
    const allProductIds = new Set();
    for (let order of orders) {
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          if (!item.importPrice || item.importPrice === 0) {
            const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
            if (!isNaN(productId)) {
              allProductIds.add(productId);
            }
          }
        });
      }
    }
    
    // Query tất cả products một lần
    if (allProductIds.size > 0) {
      const productIdsArray = Array.from(allProductIds);
      const products = await Product.find({ _id: { $in: productIdsArray } })
        .select("_id importPrice");
      
      const productMap = new Map();
      products.forEach(p => {
        const productId = typeof p._id === 'number' ? p._id : parseInt(p._id, 10);
        productMap.set(productId, p.importPrice || 0);
      });
      
      // Cập nhật importPrice cho tất cả items thiếu
      for (let order of orders) {
        if (order.items && order.items.length > 0) {
          order.items.forEach(item => {
            if (!item.importPrice || item.importPrice === 0) {
              const productId = typeof item.product === 'number' ? item.product : parseInt(item.product, 10);
              if (!isNaN(productId) && productMap.has(productId)) {
                item.importPrice = productMap.get(productId);
              }
            }
          });
        }
      }
    }

    const total = await Order.countDocuments(filter);

    return {
      orders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
  },

  // Lấy thống kê đơn hàng
  async getOrderStats(userId = null) {
    // Convert userId sang ObjectId nếu có
    let filter = {};
    if (userId) {
      // userId có thể là string hoặc ObjectId
      if (typeof userId === 'string') {
        try {
          filter.user = new mongoose.Types.ObjectId(userId);
        } catch (error) {
          filter.user = userId; // Fallback
        }
      } else {
        filter.user = userId;
      }
    }

    // Build aggregation match - cần convert userId sang ObjectId trong aggregation
    const aggregationMatch = {};
    if (userId) {
      // Trong aggregation, cần dùng ObjectId
      try {
        const userIdObj = typeof userId === 'string' 
          ? new mongoose.Types.ObjectId(userId) 
          : userId;
        aggregationMatch.user = userIdObj;
      } catch (error) {
        aggregationMatch.user = userId;
      }
    } else {
      Object.assign(aggregationMatch, filter); // Nếu không có userId, dùng filter như cũ
    }

    const stats = await Order.aggregate([
      { $match: aggregationMatch },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { 
            $sum: { 
              $cond: [
                { $in: ["$status", ["delivered", "shipping", "processing", "confirmed"]] },
                "$totalAmount",
                0
              ]
            }
          },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
          },
          confirmedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] }
          },
          processingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "processing"] }, 1, 0] }
          },
          shippingOrders: {
            $sum: { $cond: [{ $eq: ["$status", "shipping"] }, 1, 0] }
          },
          deliveredOrders: {
            $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] }
          },
          returnedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      confirmedOrders: 0,
      processingOrders: 0,
      shippingOrders: 0,
      deliveredOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0
    };

    return result;
  },

  // Hủy đơn hàng
  async cancelOrder(orderId, userId, userRole = null, reason = "") {
    return this.updateOrderStatus(orderId, "cancelled", userId, userRole, reason);
  },

  // Xác nhận đơn hàng (Admin/Seller)
  async confirmOrder(orderId, user) {
    const userId = typeof user === 'string' ? user : user.id;
    const userRole = typeof user === 'object' ? user.role : null;
    return this.updateOrderStatus(orderId, "confirmed", userId, userRole, "Đơn hàng đã được xác nhận");
  },

  // Đánh dấu đã giao hàng
  async markAsDelivered(orderId, user) {
    const userId = typeof user === 'string' ? user : user.id;
    const userRole = typeof user === 'object' ? user.role : null;
    return this.updateOrderStatus(orderId, "delivered", userId, userRole, "Đơn hàng đã được giao");
  }
};