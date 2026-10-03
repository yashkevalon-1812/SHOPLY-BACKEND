import express from 'express';
import {
  validateCoupon,
  getActiveCoupons,
  getAllCouponsAdmin,
  createCouponAdmin,
  toggleCouponAdmin,
  deleteCouponAdmin,
  getSellerCoupons,
  createSellerCoupon,
  toggleSellerCoupon,
  deleteSellerCoupon,
} from '../controllers/couponController.js';
import { protect, adminOnly, sellerOnly } from '../middleware/auth.js';

const router = express.Router();

// Public coupon endpoints for storefront customers
router.get('/active', getActiveCoupons);
router.get('/', getActiveCoupons);
router.post('/validate', validateCoupon);

// Admin coupon management endpoints
router.get('/admin', protect, adminOnly, getAllCouponsAdmin);
router.post('/admin', protect, adminOnly, createCouponAdmin);
router.put('/admin/:id/toggle', protect, adminOnly, toggleCouponAdmin);
router.delete('/admin/:id', protect, adminOnly, deleteCouponAdmin);

// Seller coupon management endpoints
router.get('/seller', protect, sellerOnly, getSellerCoupons);
router.post('/seller', protect, sellerOnly, createSellerCoupon);
router.put('/seller/:id/toggle', protect, sellerOnly, toggleSellerCoupon);
router.delete('/seller/:id', protect, sellerOnly, deleteSellerCoupon);

export default router;