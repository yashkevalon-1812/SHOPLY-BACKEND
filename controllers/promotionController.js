import { Promotion } from '../Models/Promotion.js';

// @desc    Get active Mega Sale campaign for storefront
// @route   GET /api/promotions/active
// @access  Public
export const getActivePromotion = async (req, res) => {
  try {
    const now = new Date();
    const promo = await Promotion.findOne({
      isActive: true,
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gt: now } },
      ],
    }).sort({ updatedAt: -1 });

    res.json(promo || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all promotions (Admin)
// @route   GET /api/promotions/admin
// @access  Private (Admin)
export const getAllPromotionsAdmin = async (req, res) => {
  try {
    const promotions = await Promotion.find().sort({ createdAt: -1 });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create or update Mega Sale campaign (Admin)
// @route   POST /api/promotions/admin
// @access  Private (Admin)
export const savePromotionAdmin = async (req, res) => {
  try {
    const {
      _id,
      title,
      subtitle,
      bannerText,
      couponCode,
      discountPercent,
      badgeText,
      theme,
      endDate,
      isActive,
    } = req.body;

    let promo;
    if (_id && _id !== 'default_mega_sale') {
      promo = await Promotion.findById(_id);
    }

    if (promo) {
      promo.title = title || promo.title;
      promo.subtitle = subtitle || promo.subtitle;
      promo.bannerText = bannerText || promo.bannerText;
      promo.couponCode = couponCode ? couponCode.trim().toUpperCase() : promo.couponCode;
      if (discountPercent !== undefined) promo.discountPercent = Number(discountPercent);
      if (badgeText !== undefined) promo.badgeText = badgeText;
      if (theme) promo.theme = theme;
      if (endDate) promo.endDate = new Date(endDate);
      if (isActive !== undefined) promo.isActive = Boolean(isActive);

      const updated = await promo.save();
      return res.json(updated);
    } else {
      // If setting this to active, optionally deactivate previous ones
      if (isActive) {
        await Promotion.updateMany({}, { isActive: false });
      }

      const newPromo = new Promotion({
        title,
        subtitle,
        bannerText,
        couponCode: couponCode ? couponCode.trim().toUpperCase() : 'MEGASALE',
        discountPercent: Number(discountPercent) || 50,
        badgeText: badgeText || 'LIMITED TIME MEGA EVENT',
        theme: theme || 'amber',
        endDate: endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      });

      const saved = await newPromo.save();
      return res.status(201).json(saved);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle campaign active status (Admin)
// @route   PUT /api/promotions/admin/:id/toggle
// @access  Private (Admin)
export const togglePromotionAdmin = async (req, res) => {
  try {
    const promo = await Promotion.findById(req.params.id);
    if (!promo) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    promo.isActive = !promo.isActive;
    const updated = await promo.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
