import express from 'express';
import {
  getRazorpayKey,
  createRazorpayOrder,
  verifyRazorpayPayment,
  cancelUnpaidRazorpayOrder,
  initiateUpiCollect,
  getPaymentStatus,
  confirmUpiPayment,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public / Authenticated route to get Razorpay public key ID
router.get('/razorpay/key', getRazorpayKey);

// Protected routes for buyers
router.post('/razorpay/create-order', protect, createRazorpayOrder);
router.post('/razorpay/verify', protect, verifyRazorpayPayment);
router.post('/razorpay/cancel-unpaid', protect, cancelUnpaidRazorpayOrder);

// UPI Collect & Real-time Status polling routes
router.post('/razorpay/upi-collect', protect, initiateUpiCollect);
router.get('/razorpay/status/:orderId', protect, getPaymentStatus);
router.post('/razorpay/confirm-upi', protect, confirmUpiPayment);

export default router;
