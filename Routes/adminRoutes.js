import express from 'express';
import {
  getAdminDashboardStats,
  getAllSellers,
  updateSellerStatus,
  getAllUsers,
  createAdminUser,
  updateUserRole,
  deleteUser,
  getAllProductsAdmin,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  updateProductDiscountAdmin,
  resetAllProductDiscountsAdmin,
  getScheduledFlashSalesAdmin,
  scheduleFlashSaleAdmin,
  cancelScheduledFlashSaleAdmin,
  getAllOrdersAdmin,
  updateOrderStatusAdmin,
  getSellerProductsGroupedAdmin,
  updateProductApprovalAdmin,
  approveAllSellerProductsAdmin,
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Apply auth & admin check to all admin endpoints
router.use(protect, adminOnly);

router.get('/stats', getAdminDashboardStats);

// Seller approval management
router.get('/sellers', getAllSellers);
router.put('/sellers/:id/status', updateSellerStatus);

// User management
router.route('/users').get(getAllUsers).post(createAdminUser);
router.route('/users/:id/role').put(updateUserRole);
router.delete('/users/:id', deleteUser);

// Products moderation & promotional discount campaign
router.get('/products', getAllProductsAdmin);
router.post('/products', createProductAdmin);
router.put('/products/:id', updateProductAdmin);
router.put('/products/:id/approval', updateProductApprovalAdmin);
router.get('/seller-products', getSellerProductsGroupedAdmin);
router.put('/seller-products/approve-all/:sellerId', approveAllSellerProductsAdmin);
router.put('/products/reset-all-discounts', resetAllProductDiscountsAdmin);
router.put('/products/:id/discount', updateProductDiscountAdmin);
router.delete('/products/:id', deleteProductAdmin);

// Scheduled Flash Sales endpoints
router.get('/flash-sales', getScheduledFlashSalesAdmin);
router.post('/flash-sales', scheduleFlashSaleAdmin);
router.delete('/flash-sales/:id', cancelScheduledFlashSaleAdmin);

// Orders management
router.get('/orders', getAllOrdersAdmin);
router.put('/orders/:id/status', updateOrderStatusAdmin);

export default router;
