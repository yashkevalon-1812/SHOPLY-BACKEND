import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Promotion title is required'],
      default: 'SHOPLY MEGA SALE 2026',
      trim: true,
    },
    subtitle: {
      type: String,
      default: 'Up to 70% OFF on Top Tech, Luxury Horology & Apparel',
      trim: true,
    },
    bannerText: {
      type: String,
      default: '⚡ FLASH SALE: Extra 20% Instant Discount at Checkout with code MEGASALE',
      trim: true,
    },
    couponCode: {
      type: String,
      default: 'MEGASALE',
      uppercase: true,
      trim: true,
    },
    discountPercent: {
      type: Number,
      default: 50,
      min: 1,
      max: 90,
    },
    badgeText: {
      type: String,
      default: 'LIMITED TIME MEGA EVENT',
      trim: true,
    },
    theme: {
      type: String,
      default: 'amber', // amber, royal, neon, crimson
    },
    endDate: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now default
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Promotion = mongoose.model('Promotion', promotionSchema);
