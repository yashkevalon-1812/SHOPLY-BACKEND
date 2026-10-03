import express from 'express';
import {
  getProducts,
  getFeaturedProducts,
  getFlashDeals,
  getCategories,
  getProductById,
  getRelatedProducts,
  createProductReview,
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/flash-deals', getFlashDeals);
router.get('/categories', getCategories);
router.get('/related/:id', getRelatedProducts);
router.get('/:id', getProductById);
router.post('/:id/reviews', protect, createProductReview);

export default router;
