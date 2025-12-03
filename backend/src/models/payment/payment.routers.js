import express from 'express';
import { paymentController } from './payment.controller.js';
import { protect } from '../../core/middleware/auth.middleware.js';

const router = express.Router();

// Public routes (Payment callbacks không cần auth)
router.post('/momo/ipn', paymentController.momoIPN);
router.get('/momo/return', paymentController.momoReturn);
router.get('/vnpay/ipn', paymentController.vnpayIPN);
router.get('/vnpay/return', paymentController.vnpayReturn);

// Protected routes (cần đăng nhập để tạo payment)
router.use(protect);
router.post('/momo/create', paymentController.createMomoPayment);
router.post('/vnpay/create', paymentController.createVNPayPayment);
router.post('/vnpay/create-order', paymentController.createOrderAfterPayment);

export default router;






