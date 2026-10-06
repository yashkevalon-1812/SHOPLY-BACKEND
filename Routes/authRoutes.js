import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerUser,
  registerAdmin,
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  verifyResetOtp,
  resetPasswordWithOtp,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Rate limiter for authentication operations (prevents credential stuffing)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.',
  },
});

// Strict rate limiter for password reset and OTP verification (prevents brute-forcing 6-digit codes)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many verification attempts from this IP address. Please wait 15 minutes before trying again.',
  },
});

router.post('/register', authLimiter, registerUser);
router.post('/register-admin', authLimiter, registerAdmin);
router.post('/login', authLimiter, loginUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);

// Password Reset via 6-digit OTP
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-otp', otpLimiter, verifyResetOtp);
router.post('/reset-password', otpLimiter, resetPasswordWithOtp);

export default router;
