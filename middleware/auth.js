import jwt from 'jsonwebtoken';
import { User } from '../Models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'velora_secret_jwt_key_9823487293847'
      );
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User no longer exists' });
      }

      next();
    } catch (error) {
      console.error('Auth protect error:', error.message);
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Administrator privileges required' });
  }
};

export const sellerOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  // Admins can also access seller routes if needed, or strictly active sellers
  if (req.user.role === 'admin') {
    return next();
  }

  if (req.user.role !== 'seller') {
    return res.status(403).json({ message: 'Access denied: Seller account required' });
  }

  if (req.user.sellerStatus === 'pending') {
    return res.status(403).json({
      message: 'Your seller account is awaiting administrator approval',
      sellerStatus: 'pending',
    });
  }

  if (req.user.sellerStatus === 'rejected') {
    return res.status(403).json({
      message: 'Your seller account application has been rejected by administration',
      sellerStatus: 'rejected',
    });
  }

  if (req.user.sellerStatus === 'active') {
    return next();
  }

  res.status(403).json({ message: 'Access denied: Inactive seller account' });
};
