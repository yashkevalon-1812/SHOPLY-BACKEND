import { Coupon } from '../Models/Coupon.js';
import { Product } from '../Models/Product.js';

// @desc    Validate coupon code for customer checkout
// @route   POST /api/coupons/validate
// @access  Public
export const validateCoupon = async (req, res) => {
  try {
    const { code, orderAmount = 0 } = req.body;

    if (!code) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const cleanCode = code.trim().toUpperCase();

    // Lookup in database
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or unrecognized promo code' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ message: 'This coupon code is currently inactive' });
    }

    if (new Date() > new Date(coupon.expiryDate)) {
      return res.status(400).json({ message: 'This coupon has expired' });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit has been reached' });
    }

    if (orderAmount > 0 && coupon.minOrderAmount > 0 && orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount of ₹${coupon.minOrderAmount.toLocaleString('en-IN')} required for this coupon`,
      });
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      maxDiscountAmount: coupon.maxDiscountAmount,
      description: coupon.description,
      message:
        coupon.discountType === 'percentage'
          ? `Coupon ${coupon.code} applied! ${coupon.discountValue}% discount added.`
          : `Coupon ${coupon.code} applied! ₹${coupon.discountValue} flat savings added.`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get active coupons for storefront customers (Public)
// @route   GET /api/coupons/active
// @access  Public
export const getActiveCoupons = async (req, res) => {
  try {
    const dbCoupons = await Coupon.find({
      isActive: true,
      expiryDate: { $gt: new Date() },
    })
      .select('code description discountType discountValue minOrderAmount maxDiscountAmount expiryDate usageLimit usedCount applicableProducts')
      .populate('applicableProducts', 'title name price images')
      .sort({ discountValue: -1 });

    res.json(dbCoupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all coupons (Admin)
// @route   GET /api/coupons/admin
// @access  Private (Admin)
export const getAllCouponsAdmin = async (req, res) => {
  try {
    const coupons = await Coupon.find()
      .populate('applicableProducts', 'name title price images')
      .sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new coupon (Admin)
// @route   POST /api/coupons/admin
// @access  Private (Admin)
export const createCouponAdmin = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      expiryDate,
      usageLimit,
      applicableProducts,
    } = req.body;

    const existing = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: 'A coupon with this code already exists' });
    }

    const coupon = new Coupon({
      code: code.trim().toUpperCase(),
      description: description || 'Promotional coupon',
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: Number(usageLimit) || 500,
      applicableProducts: Array.isArray(applicableProducts) ? applicableProducts : [],
      isActive: true,
      createdBy: req.user?._id,
    });

    const saved = await coupon.save();
    const populated = await Coupon.findById(saved._id).populate('applicableProducts', 'name title price images');
    res.status(201).json(populated || saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle coupon active status (Admin)
// @route   PUT /api/coupons/admin/:id/toggle
// @access  Private (Admin)
export const toggleCouponAdmin = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    coupon.isActive = !coupon.isActive;
    const updated = await coupon.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete coupon (Admin)
// @route   DELETE /api/coupons/admin/:id
// @access  Private (Admin)
export const deleteCouponAdmin = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    await coupon.deleteOne();
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// =========================================================================
// SELLER COUPON MANAGEMENT ENDPOINTS
// =========================================================================

// @desc    Get coupons owned by the logged-in seller
// @route   GET /api/coupons/seller
// @access  Private (Seller)
export const getSellerCoupons = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? {}
      : { $or: [{ seller: req.user._id }, { createdBy: req.user._id }] };

    const coupons = await Coupon.find(filter)
      .populate('applicableProducts', 'title name price images category')
      .sort({ createdAt: -1 });

    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new coupon for seller
// @route   POST /api/coupons/seller
// @access  Private (Seller)
export const createSellerCoupon = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      expiryDate,
      usageLimit,
      applicableProducts,
    } = req.body;

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const cleanCode = code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ message: 'A coupon with this code already exists' });
    }

    // If seller specified applicable products, ensure they belong to this seller
    let validProducts = [];
    if (Array.isArray(applicableProducts) && applicableProducts.length > 0) {
      const ownedProducts = await Product.find({
        _id: { $in: applicableProducts },
        ...(req.user.role === 'admin' ? {} : { seller: req.user._id }),
      }).select('_id');
      validProducts = ownedProducts.map((p) => p._id);
    }

    const coupon = new Coupon({
      code: cleanCode,
      description: description || `Exclusive voucher from ${req.user.shopName || 'Seller'}`,
      discountType: discountType || 'percentage',
      discountValue: Number(discountValue),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscountAmount: Number(maxDiscountAmount) || 0,
      expiryDate: expiryDate ? new Date(expiryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      usageLimit: Number(usageLimit) || 300,
      applicableProducts: validProducts,
      isActive: true,
      createdBy: req.user._id,
      seller: req.user._id,
    });

    const saved = await coupon.save();
    const populated = await Coupon.findById(saved._id).populate('applicableProducts', 'title name price images category');
    res.status(201).json(populated || saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle seller coupon active status
// @route   PUT /api/coupons/seller/:id/toggle
// @access  Private (Seller)
export const toggleSellerCoupon = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, $or: [{ seller: req.user._id }, { createdBy: req.user._id }] };

    const coupon = await Coupon.findOne(filter);

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found or access unauthorized' });
    }

    coupon.isActive = !coupon.isActive;
    const updated = await coupon.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete seller coupon
// @route   DELETE /api/coupons/seller/:id
// @access  Private (Seller)
export const deleteSellerCoupon = async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, $or: [{ seller: req.user._id }, { createdBy: req.user._id }] };

    const coupon = await Coupon.findOne(filter);

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon not found or access unauthorized' });
    }

    await coupon.deleteOne();
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
