import express from 'express';
import {
  getActivePromotion,
  getAllPromotionsAdmin,
  savePromotionAdmin,
  togglePromotionAdmin,
} from '../controllers/promotionController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public route for storefront active sale banner
router.get('/active', getActivePromotion);

// Admin campaign management endpoints
router.get('/admin', protect, adminOnly, getAllPromotionsAdmin);
router.post('/admin', protect, adminOnly, savePromotionAdmin);
router.put('/admin/:id/toggle', protect, adminOnly, togglePromotionAdmin);

export default router;
