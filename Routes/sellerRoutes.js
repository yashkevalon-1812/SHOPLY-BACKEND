import express from 'express';
import {
  getSellerDashboardStats,
  getSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  getSellerOrders,
  updateSellerOrderStatus,
  resetAllSellerDiscounts,
} from '../controllers/sellerController.js';
import { protect, sellerOnly } from '../middleware/auth.js';

const router = express.Router();

// Apply auth & seller verification to all seller endpoints
router.use(protect, sellerOnly);

router.get('/stats', getSellerDashboardStats);
router.route('/products/reset-all-discounts').post(resetAllSellerDiscounts).put(resetAllSellerDiscounts);
router.route('/products/:id/discount').put(updateSellerProduct);
router.route('/products').get(getSellerProducts).post(createSellerProduct);
router.route('/products/:id').put(updateSellerProduct).delete(deleteSellerProduct);
router.get('/orders', getSellerOrders);
router.put('/orders/:id/status', updateSellerOrderStatus);

export default router;
