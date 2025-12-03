import { flashSaleActivationService } from '../models/flashSale/flashSaleActivation.service.js';
import { flashSaleReservationService } from '../models/flashSale/flashSaleReservation.service.js';

/**
 * Scheduled tasks cho Flash Sale
 * Chạy mỗi phút để:
 * 1. Kích hoạt flash sale đã đến thời gian bắt đầu
 * 2. Đóng flash sale đã hết thời gian
 * 3. Cleanup reservations hết hạn
 */
export const flashSaleScheduler = {
  /**
   * Chạy tất cả scheduled tasks
   */
  async run() {
    try {
      console.log('[FlashSaleScheduler] Running scheduled tasks...');
      
      // 1. Kích hoạt flash sale đã đến thời gian
      const activateResult = await flashSaleActivationService.activateScheduledFlashSales();
      if (activateResult.activated > 0) {
        console.log(`[FlashSaleScheduler] Activated ${activateResult.activated} flash sales`);
      }

      // 2. Đóng flash sale đã hết thời gian
      const closeResult = await flashSaleActivationService.closeExpiredFlashSales();
      if (closeResult.closed > 0) {
        console.log(`[FlashSaleScheduler] Closed ${closeResult.closed} flash sales`);
      }

      // 3. Cleanup reservations hết hạn
      const cleanupResult = await flashSaleReservationService.cleanupExpiredReservations();
      if (cleanupResult.cleaned > 0) {
        console.log(`[FlashSaleScheduler] Cleaned up ${cleanupResult.cleaned} expired reservations`);
      }

      return {
        activated: activateResult.activated,
        closed: closeResult.closed,
        cleaned: cleanupResult.cleaned,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('[FlashSaleScheduler] Error running scheduled tasks:', error);
      throw error;
    }
  },

  /**
   * Khởi động scheduler (chạy mỗi phút)
   */
  start() {
    // Chạy ngay lập tức
    this.run().catch(error => {
      console.error('[FlashSaleScheduler] Initial run error:', error);
    });

    // Chạy mỗi phút
    setInterval(() => {
      this.run().catch(error => {
        console.error('[FlashSaleScheduler] Scheduled run error:', error);
      });
    }, 60 * 1000); // 60 giây

    console.log('[FlashSaleScheduler] Started - running every minute');
  }
};


