import { FlashSale } from './flashSale.model.js';
import { FlashSaleItem } from './flashSaleItem.model.js';

/**
 * Service tự động kích hoạt và đóng flash sale
 */
export const flashSaleActivationService = {
  /**
   * Tự động kích hoạt flash sale khi đến thời gian bắt đầu
   * Khởi tạo bộ đếm số lượng còn lại (reserved = 0 cho tất cả items)
   */
  async activateScheduledFlashSales() {
    const now = new Date();
    
    // Tìm các flash sale đã đến thời gian bắt đầu nhưng chưa active
    const scheduledFlashSales = await FlashSale.find({
      start_time: { $lte: now },
      end_time: { $gte: now },
      status: 'inactive' // Chỉ kích hoạt những cái đang inactive
    });

    const activated = [];

    for (const flashSale of scheduledFlashSales) {
      try {
        // Kích hoạt flash sale
        flashSale.status = 'active';
        await flashSale.save();

        // Khởi tạo bộ đếm: đảm bảo reserved = 0 cho tất cả items
        await FlashSaleItem.updateMany(
          { flash_sale_id: flashSale._id },
          { $set: { reserved: 0 } }
        );

        activated.push(flashSale._id);
        console.log(`[FlashSale] Activated flash sale: ${flashSale._id} - ${flashSale.name}`);
      } catch (error) {
        console.error(`[FlashSale] Error activating flash sale ${flashSale._id}:`, error);
      }
    }

    return { activated: activated.length, flashSaleIds: activated };
  },

  /**
   * Tự động đóng flash sale khi hết thời gian
   * Ngừng cho phép tạo giao dịch mới nhưng giữ nguyên các reservation đang chờ
   */
  async closeExpiredFlashSales() {
    const now = new Date();
    
    // Tìm các flash sale đã hết thời gian nhưng vẫn active
    const expiredFlashSales = await FlashSale.find({
      end_time: { $lt: now },
      status: 'active'
    });

    const closed = [];

    for (const flashSale of expiredFlashSales) {
      try {
        // Đóng flash sale (set inactive)
        flashSale.status = 'inactive';
        await flashSale.save();

        closed.push(flashSale._id);
        console.log(`[FlashSale] Closed flash sale: ${flashSale._id} - ${flashSale.name}`);
      } catch (error) {
        console.error(`[FlashSale] Error closing flash sale ${flashSale._id}:`, error);
      }
    }

    return { closed: closed.length, flashSaleIds: closed };
  },

  /**
   * Chạy cả activate và close (cron job)
   */
  async runScheduledTasks() {
    const activateResult = await this.activateScheduledFlashSales();
    const closeResult = await this.closeExpiredFlashSales();
    
    return {
      activated: activateResult.activated,
      closed: closeResult.closed,
      timestamp: new Date()
    };
  }
};


