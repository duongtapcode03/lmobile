import express from 'express';
import { paymentController } from './payment.controller.js';
import { protect } from '../../core/middleware/auth.middleware.js';

const router = express.Router();

// Public routes (MoMo callback không cần auth)
router.post('/momo/ipn', paymentController.momoIPN);
router.get('/momo/return', paymentController.momoReturn);

// Protected routes (cần đăng nhập để tạo payment)
router.use(protect);
router.post('/momo/create', paymentController.createMomoPayment);

export default router;

