import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const sellerOfferSchema = new mongoose.Schema(
  {
    sellerName: { type: String, required: true },
    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    price: { type: Number, required: true },
    discountPrice: { type: Number, default: 0 },
    deliveryText: { type: String, default: 'FREE Delivery by Tomorrow' },
    deliveryDays: { type: Number, default: 2 },
    shippingFee: { type: Number, default: 0 },
    rating: { type: Number, default: 4.8 },
    ratingCount: { type: Number, default: 150 },
    badge: { type: String, default: 'Shoply Fulfilled' },
    badgeColor: { type: String, default: 'blue' },
    stock: { type: Number, default: 10 },
    returnPolicy: { type: String, default: '7-Day Return / Replacement' },
    warranty: { type: String, default: '1 Year Brand Warranty' },
    condition: { type: String, default: 'Brand New (Sealed)' },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    discountPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    brand: {
      type: String,
      default: 'Shoply Selection',
      trim: true,
    },
    stock: {
      type: Number,
      required: [true, 'Stock count is required'],
      default: 10,
      min: 0,
    },
    images: {
      type: [String],
      required: [true, 'At least one product image is required'],
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 0,
      max: 5,
    },
    numReviews: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isFlashDeal: {
      type: Boolean,
      default: false,
    },
    isMegaFlashSale: {
      type: Boolean,
      default: false,
    },
    flashSaleExpiresAt: {
      type: Date,
    },
    flashSaleDiscountPercent: {
      type: Number,
      default: 0,
    },
    offerTag: {
      type: String,
      default: '',
      trim: true,
    },
    // Amazon-style listing fields
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    barcode: {
      type: String,
      trim: true,
      default: '',
    },
    condition: {
      type: String,
      default: 'Brand New (Sealed)',
      trim: true,
    },
    bulletPoints: {
      type: [String],
      default: [],
    },
    specifications: {
      type: Map,
      of: String,
      default: {},
    },
    warranty: {
      type: String,
      default: '1 Year Brand Warranty',
      trim: true,
    },
    fulfillmentChannel: {
      type: String,
      default: 'Shoply Fulfilled',
      trim: true,
    },
    originCountry: {
      type: String,
      default: 'India',
      trim: true,
    },
    // Marketplace Seller Approval Workflow
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    sellerOffers: [sellerOfferSchema],
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
