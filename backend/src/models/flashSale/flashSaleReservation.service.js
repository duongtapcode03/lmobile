import { FlashSaleReservation } from './flashSaleReservation.model.js';
import { FlashSaleItem } from './flashSaleItem.model.js';
import { FlashSale } from './flashSale.model.js';
import { FlashSaleUserUsage } from './flashSaleUserUsage.model.js';

/**
 * Service quản lý giữ chỗ flash sale
 */
export const flashSaleReservationService = {
  /**
   * Tạo reservation (giữ chỗ) với atomic operation
   * @param {Object} data - { user_id, flash_sale_id, product_id, quantity, flash_price, expiresInMinutes }
   */
  async createReservation(data) {
    const { user_id, flash_sale_id, product_id, quantity, flash_price, expiresInMinutes = 15 } = data;

    // Validate flash sale đang active
    const flashSale = await FlashSale.findById(flash_sale_id);
    if (!flashSale) {
      throw new Error('Flash Sale không tồn tại');
    }

    const now = new Date();
    if (now < flashSale.start_time || now > flashSale.end_time) {
      throw new Error('Flash Sale chưa bắt đầu hoặc đã kết thúc');
    }

    if (flashSale.status !== 'active') {
      throw new Error('Flash Sale chưa được kích hoạt');
    }

    // Atomic operation: Tăng reserved và kiểm tra available stock
    const numericProductId = typeof product_id === 'number' 
      ? product_id 
      : parseInt(String(product_id).trim(), 10);
    
    if (isNaN(numericProductId)) {
      throw new Error('Product ID không hợp lệ');
    }

    const item = await FlashSaleItem.findOne({
      flash_sale_id,
      product_id: numericProductId
    });

    if (!item) {
      throw new Error('Sản phẩm không có trong Flash Sale này');
    }

    // Kiểm tra số lượng có thể mua (flash_stock - sold - reserved)
    const availableStock = item.flash_stock - item.sold - (item.reserved || 0);
    if (availableStock < quantity) {
      throw new Error(`Chỉ còn ${availableStock} sản phẩm. Không đủ số lượng yêu cầu.`);
    }

    console.log(`[FlashSaleReservation] Before reservation: sold=${item.sold}, reserved=${item.reserved || 0}, available=${availableStock}, flash_stock=${item.flash_stock}`);
    
    // Atomic update: Tăng reserved
    const updateResult = await FlashSaleItem.updateOne(
      {
        _id: item._id,
        // Đảm bảo vẫn còn đủ số lượng sau khi tăng reserved
        $expr: {
          $gte: [
            { $subtract: ['$flash_stock', { $add: ['$sold', { $ifNull: ['$reserved', 0] }] }] },
            quantity
          ]
        }
      },
      {
        $inc: { reserved: quantity }
      }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error('Số lượng flash sale không đủ. Vui lòng thử lại.');
    }
    
    // Reload để kiểm tra
    const updatedItem = await FlashSaleItem.findById(item._id);
    const newAvailableStock = updatedItem.flash_stock - updatedItem.sold - (updatedItem.reserved || 0);
    console.log(`[FlashSaleReservation] After reservation: sold=${updatedItem.sold}, reserved=${updatedItem.reserved || 0}, available=${newAvailableStock}, flash_stock=${updatedItem.flash_stock}`);

    // Tạo reservation
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000);
    const reservation = await FlashSaleReservation.create({
      user_id,
      flash_sale_id,
      product_id: numericProductId,
      quantity,
      flash_price,
      expires_at: expiresAt,
      status: 'pending'
    });

    return reservation;
  },

  /**
   * Xác nhận reservation (khi thanh toán thành công)
   * @param {String} reservationId - ID của reservation
   * @param {String} orderId - ID của order
   */
  async confirmReservation(reservationId, orderId) {
    console.log(`[FlashSaleReservation] Confirming reservation ${reservationId} for order ${orderId}`);
    
    const reservation = await FlashSaleReservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation không tồn tại');
    }

    if (reservation.status !== 'pending') {
      throw new Error(`Reservation đã ở trạng thái: ${reservation.status}`);
    }

    if (reservation.isExpired()) {
      throw new Error('Reservation đã hết hạn');
    }

    // Cập nhật item: giảm reserved, tăng sold
    const item = await FlashSaleItem.findOne({
      flash_sale_id: reservation.flash_sale_id,
      product_id: reservation.product_id
    });

    if (!item) {
      throw new Error('Flash Sale Item không tồn tại');
    }

    console.log(`[FlashSaleReservation] Item found. Current sold: ${item.sold}, reserved: ${item.reserved}, quantity: ${reservation.quantity}`);

    // Atomic update: Giảm reserved, tăng sold
    const updateResult = await FlashSaleItem.updateOne(
      {
        _id: item._id,
        reserved: { $gte: reservation.quantity }
      },
      {
        $inc: { reserved: -reservation.quantity, sold: reservation.quantity }
      }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error('Không thể xác nhận reservation. Số lượng không khớp.');
    }

    // Reload item để lấy giá trị mới sau khi update
    const updatedItem = await FlashSaleItem.findById(item._id);
    const beforeAvailable = item.flash_stock - item.sold - (item.reserved || 0);
    const afterAvailable = updatedItem.flash_stock - updatedItem.sold - (updatedItem.reserved || 0);
    
    console.log(`[FlashSaleReservation] ========== Item Updated Successfully ==========`);
    console.log(`[FlashSaleReservation] Product ID: ${reservation.product_id}`);
    console.log(`[FlashSaleReservation] Quantity: ${reservation.quantity}`);
    console.log(`[FlashSaleReservation] BEFORE: sold=${item.sold}, reserved=${item.reserved || 0}, flash_stock=${item.flash_stock}, available=${beforeAvailable}`);
    console.log(`[FlashSaleReservation] AFTER:  sold=${updatedItem.sold}, reserved=${updatedItem.reserved || 0}, flash_stock=${updatedItem.flash_stock}, available=${afterAvailable}`);
    console.log(`[FlashSaleReservation] Change: sold +${reservation.quantity}, reserved -${reservation.quantity}`);
    console.log(`[FlashSaleReservation] ================================================`);

    // Cập nhật FlashSaleUserUsage để track user đã mua bao nhiêu
    const userUsage = await FlashSaleUserUsage.findOne({
      user_id: reservation.user_id,
      flash_sale_id: reservation.flash_sale_id,
      product_id: reservation.product_id
    });

    if (userUsage) {
      userUsage.quantity = (userUsage.quantity || 0) + reservation.quantity;
      userUsage.order_id = orderId;
      await userUsage.save();
    } else {
      await FlashSaleUserUsage.create({
        user_id: reservation.user_id,
        flash_sale_id: reservation.flash_sale_id,
        product_id: reservation.product_id,
        quantity: reservation.quantity,
        order_id: orderId
      });
    }

    // Cập nhật reservation
    reservation.status = 'confirmed';
    reservation.order_id = orderId;
    await reservation.save();

    return reservation;
  },

  /**
   * Hủy reservation (khi hết hạn hoặc user hủy)
   * @param {String} reservationId - ID của reservation
   */
  async cancelReservation(reservationId) {
    const reservation = await FlashSaleReservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation không tồn tại');
    }

    if (reservation.status === 'cancelled' || reservation.status === 'expired') {
      return reservation; // Đã hủy rồi
    }

    // Nếu đã confirmed, cần rollback (giảm sold, tăng reserved)
    if (reservation.status === 'confirmed') {
      return await this.rollbackConfirmedReservation(reservationId);
    }

    // Trả lại số lượng vào reserved (cho pending reservations)
    const item = await FlashSaleItem.findOne({
      flash_sale_id: reservation.flash_sale_id,
      product_id: reservation.product_id
    });

    if (item && item.reserved >= reservation.quantity) {
      await FlashSaleItem.updateOne(
        { _id: item._id },
        { $inc: { reserved: -reservation.quantity } }
      );
    }

    // Cập nhật status
    reservation.status = reservation.isExpired() ? 'expired' : 'cancelled';
    await reservation.save();

    return reservation;
  },

  /**
   * Rollback confirmed reservation (khi order fail sau khi confirm)
   * @param {String} reservationId - ID của reservation
   */
  async rollbackConfirmedReservation(reservationId) {
    const reservation = await FlashSaleReservation.findById(reservationId);
    if (!reservation) {
      throw new Error('Reservation không tồn tại');
    }

    if (reservation.status !== 'confirmed') {
      throw new Error(`Reservation không ở trạng thái confirmed. Status: ${reservation.status}`);
    }

    // Rollback: giảm sold, tăng reserved
    const item = await FlashSaleItem.findOne({
      flash_sale_id: reservation.flash_sale_id,
      product_id: reservation.product_id
    });

    if (!item) {
      throw new Error('Flash Sale Item không tồn tại');
    }

    // Atomic update: giảm sold, tăng reserved
    const updateResult = await FlashSaleItem.updateOne(
      {
        _id: item._id,
        sold: { $gte: reservation.quantity } // Đảm bảo có đủ sold để giảm
      },
      {
        $inc: { sold: -reservation.quantity, reserved: reservation.quantity }
      }
    );

    if (updateResult.matchedCount === 0) {
      throw new Error('Không thể rollback reservation. Số lượng không khớp.');
    }

    // Cập nhật reservation status về cancelled
    reservation.status = 'cancelled';
    reservation.order_id = undefined; // Xóa order_id
    await reservation.save();

    console.log(`[FlashSaleReservation] Rolled back confirmed reservation ${reservationId}. Sold decreased, reserved increased.`);

    return reservation;
  },

  /**
   * Cleanup reservations hết hạn (cron job)
   */
  async cleanupExpiredReservations() {
    const now = new Date();
    const expiredReservations = await FlashSaleReservation.find({
      status: 'pending',
      expires_at: { $lt: now }
    });

    for (const reservation of expiredReservations) {
      try {
        await this.cancelReservation(reservation._id);
      } catch (error) {
        console.error(`[FlashSale] Error cleaning up reservation ${reservation._id}:`, error);
      }
    }

    return { cleaned: expiredReservations.length };
  },

  /**
   * Lấy reservation của user
   */
  async getUserReservations(userId, flashSaleId = null) {
    const filter = { user_id: userId, status: 'pending' };
    if (flashSaleId) {
      filter.flash_sale_id = flashSaleId;
    }

    return await FlashSaleReservation.find(filter)
      .populate('flash_sale_id', 'name start_time end_time')
      .populate('product_id', 'name thumbnail price')
      .sort({ createdAt: -1 });
  },

  /**
   * Kiểm tra reservation có hợp lệ không (re-check trước khi thanh toán)
   */
  async validateReservation(reservationId) {
    const reservation = await FlashSaleReservation.findById(reservationId);
    if (!reservation) {
      return { valid: false, reason: 'Reservation không tồn tại' };
    }

    if (reservation.status !== 'pending') {
      return { valid: false, reason: `Reservation đã ở trạng thái: ${reservation.status}` };
    }

    if (reservation.isExpired()) {
      return { valid: false, reason: 'Reservation đã hết hạn' };
    }

    // Kiểm tra flash sale vẫn active
    const flashSale = await FlashSale.findById(reservation.flash_sale_id);
    if (!flashSale) {
      return { valid: false, reason: 'Flash Sale không tồn tại' };
    }

    const now = new Date();
    if (now < flashSale.start_time || now > flashSale.end_time) {
      return { valid: false, reason: 'Flash Sale chưa bắt đầu hoặc đã kết thúc' };
    }

    if (flashSale.status !== 'active') {
      return { valid: false, reason: 'Flash Sale chưa được kích hoạt' };
    }

    // Kiểm tra số lượng vẫn đủ
    const item = await FlashSaleItem.findOne({
      flash_sale_id: reservation.flash_sale_id,
      product_id: reservation.product_id
    });

    if (!item) {
      return { valid: false, reason: 'Sản phẩm không còn trong Flash Sale' };
    }

    const availableStock = item.flash_stock - item.sold - (item.reserved || 0);
    if (availableStock < reservation.quantity) {
      return { valid: false, reason: `Chỉ còn ${availableStock} sản phẩm. Không đủ số lượng.` };
    }

    return { 
      valid: true, 
      reservation,
      flash_price: item.flash_price,
      availableStock 
    };
  }
};


