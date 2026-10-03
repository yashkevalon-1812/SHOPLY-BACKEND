import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['buyer', 'seller', 'admin'],
      default: 'buyer',
    },
    // Seller specific details
    sellerStatus: {
      type: String,
      enum: ['pending', 'active', 'rejected'],
      default: function () {
        return this.role === 'seller' ? 'pending' : 'active';
      },
    },
    shopName: {
      type: String,
      trim: true,
    },
    storeDescription: {
      type: String,
      trim: true,
    },
    // Mirrors Amazon's business-type branch. 'individual' sellers skip the
    // registered-business fields; 'registered' ones supply a business address.
    businessType: {
      type: String,
      enum: ['individual', 'registered'],
      default: 'individual',
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      postalCode: { type: String, default: '' },
      country: { type: String, default: '' },
    },
    // Where this seller's earnings are sent. The account number and IFSC are
    // stored encrypted (see utils/payoutCrypto.js) and are `select: false`, so
    // they are never returned by an ordinary query.
    payoutDetails: {
      accountHolderName: { type: String, trim: true, default: '' },
      bankName: { type: String, trim: true, default: '' },
      accountType: {
        type: String,
        enum: ['savings', 'current'],
        default: 'savings',
      },
      accountNumberEncrypted: { type: String, select: false, default: undefined },
      ifscEncrypted: { type: String, select: false, default: undefined },
      updatedAt: { type: Date, default: Date.now },
    },
    // Password reset OTP verification fields
    resetPasswordOtp: {
      type: String,
      default: undefined,
    },
    resetPasswordOtpExpires: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const User = mongoose.model('User', userSchema);
