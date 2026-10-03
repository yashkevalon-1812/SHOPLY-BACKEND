import express from 'express';
import {
  submitContactMessage,
  getContactMessages,
  updateMessageStatus,
} from '../controllers/contactController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/', submitContactMessage);
router.get('/', protect, adminOnly, getContactMessages);
router.put('/:id', protect, adminOnly, updateMessageStatus);

export default router;
