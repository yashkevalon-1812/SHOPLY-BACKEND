import express from 'express';
import {
  createBroadcastNotification,
  getAllBroadcastsAdmin,
  deleteBroadcastAdmin,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteUserNotification,
  clearAllUserNotifications,
} from '../controllers/notificationController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// User notification endpoints
router.get('/', protect, getUserNotifications);
router.put('/mark-all-read', protect, markAllNotificationsAsRead);
router.delete('/clear-all', protect, clearAllUserNotifications);
router.put('/:id/read', protect, markNotificationAsRead);
router.delete('/:id', protect, deleteUserNotification);

// Admin broadcast management endpoints
router.get('/admin', protect, adminOnly, getAllBroadcastsAdmin);
router.post('/admin', protect, adminOnly, createBroadcastNotification);
router.delete('/admin/:id', protect, adminOnly, deleteBroadcastAdmin);

export default router;
