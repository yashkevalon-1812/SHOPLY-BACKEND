import jwt from 'jsonwebtoken';
import { User } from '../Models/User.js';
import { sendOtpEmail } from '../utils/sendEmail.js';
import { encryptValue, maskValue } from '../utils/payoutCrypto.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'velora_secret_jwt_key_9823487293847', {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (buyer or seller)
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      shopName,
      storeDescription,
      phone,
      businessType,
      address,
      payoutDetails,
    } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const assignedRole = role === 'seller' ? 'seller' : 'buyer';
    const initialSellerStatus = assignedRole === 'seller' ? 'pending' : 'active';

    // Normalise the submitted business type so a tampered request can't push an
    // unsupported value into the enum.
    const assignedBusinessType = businessType === 'registered' ? 'registered' : 'individual';

    // Bank details are encrypted before they touch the database. Only the
    // non-sensitive descriptors are kept in the clear so an admin reviewing the
    // application can see which bank it is.
    const sanitisedPayout =
      assignedRole === 'seller' && payoutDetails
        ? {
            accountHolderName: String(payoutDetails.accountHolderName || '').trim(),
            bankName: String(payoutDetails.bankName || '').trim(),
            accountType: payoutDetails.accountType === 'current' ? 'current' : 'savings',
            accountNumberEncrypted: encryptValue(payoutDetails.accountNumber),
            ifscEncrypted: encryptValue(payoutDetails.ifsc),
          }
        : undefined;

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      sellerStatus: initialSellerStatus,
      shopName: assignedRole === 'seller' ? shopName || `${name}'s Boutique` : undefined,
      storeDescription: assignedRole === 'seller' ? storeDescription : undefined,
      phone,
      businessType: assignedRole === 'seller' ? assignedBusinessType : undefined,
      address: assignedRole === 'seller' ? address : undefined,
      payoutDetails: sanitisedPayout,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sellerStatus: user.sellerStatus,
        shopName: user.shopName,
        phone: user.phone,
        businessType: user.businessType,
        address: user.address,
        // Masked only - the client never receives the real account number.
        payout: user.payoutDetails?.accountNumberEncrypted
          ? {
              accountHolderName: user.payoutDetails.accountHolderName,
              bankName: user.payoutDetails.bankName,
              accountType: user.payoutDetails.accountType,
              accountNumberMasked: maskValue(payoutDetails?.accountNumber),
              ifscMasked: maskValue(payoutDetails?.ifsc),
            }
          : undefined,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data provided' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    let searchEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: searchEmail });
    if (!user && searchEmail.endsWith('@shoply.com')) {
      user = await User.findOne({ email: searchEmail.replace('@shoply.com', '@velora.com') });
    } else if (!user && searchEmail.endsWith('@velora.com')) {
      user = await User.findOne({ email: searchEmail.replace('@velora.com', '@shoply.com') });
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        sellerStatus: user.sellerStatus,
        shopName: user.shopName,
        address: user.address,
        phone: user.phone,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;

      if (req.body.address) {
        user.address = {
          street: req.body.address.street ?? user.address.street,
          city: req.body.address.city ?? user.address.city,
          state: req.body.address.state ?? user.address.state,
          postalCode: req.body.address.postalCode ?? user.address.postalCode,
          country: req.body.address.country ?? user.address.country,
        };
      }

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        sellerStatus: updatedUser.sellerStatus,
        shopName: updatedUser.shopName,
        address: updatedUser.address,
        phone: updatedUser.phone,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new administrator using an admin security key
// @route   POST /api/auth/register-admin
// @access  Public with Admin Secret Key
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, adminSecretKey } = req.body;

    const validKeys = [
      process.env.ADMIN_SECRET_KEY,
      'SHOPLY_ADMIN_2026',
      'VELORA_ADMIN_2026',
    ].filter(Boolean);

    if (!adminSecretKey || !validKeys.includes(adminSecretKey.trim())) {
      return res.status(401).json({
        message: 'Invalid Admin Security Passcode. Administrator authorization denied.',
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'admin',
      sellerStatus: 'active',
      phone,
    });

    if (admin) {
      res.status(201).json({
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        sellerStatus: admin.sellerStatus,
        token: generateToken(admin._id),
        message: 'Administrator account registered successfully!',
      });
    } else {
      res.status(400).json({ message: 'Invalid admin account details' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Generate & send password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email address is required' });
    }

    let searchEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: searchEmail });
    if (!user && searchEmail.endsWith('@shoply.com')) {
      user = await User.findOne({ email: searchEmail.replace('@shoply.com', '@velora.com') });
    } else if (!user && searchEmail.endsWith('@velora.com')) {
      user = await User.findOne({ email: searchEmail.replace('@velora.com', '@shoply.com') });
    }

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = expiry;
    await user.save();

    console.log(`\n========================================`);
    console.log(`🔑 [SHOPLY AUTH] PASSWORD RESET OTP INITIATED`);
    console.log(`👤 User: ${user.email} (${user.role})`);
    console.log(`⏱️ Expiry Window: 10 minutes (${expiry.toLocaleTimeString()})`);
    console.log(`========================================\n`);

    // Dispatch email to user's inbox
    let mailResult;
    try {
      mailResult = await sendOtpEmail({
        to: user.email,
        otp,
        name: user.name || user.shopName || 'Customer',
      });
    } catch (mailError) {
      console.error(`❌ [SHOPLY EMAIL FAILED] Could not deliver to ${user.email}:`, mailError.message);
      return res.status(500).json({
        message: `Unable to deliver verification email to ${user.email}. Please verify your EMAIL_USER and EMAIL_PASS settings in .env (${mailError.message}).`,
      });
    }

    const isRealSmtp = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

    res.json({
      success: true,
      message: isRealSmtp
        ? `A 6-digit verification code has been dispatched to your email (${user.email}). Please check your inbox and spam folder.`
        : `Verification code generated. Please configure EMAIL_USER and EMAIL_PASS in your backend .env to deliver directly to your Gmail inbox.`,
      email: user.email,
      isRealSmtp,
      testPreviewUrl: mailResult?.previewUrl || null,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify password reset OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP code are required' });
    }

    let searchEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: searchEmail });
    if (!user && searchEmail.endsWith('@shoply.com')) {
      user = await User.findOne({ email: searchEmail.replace('@shoply.com', '@velora.com') });
    } else if (!user && searchEmail.endsWith('@velora.com')) {
      user = await User.findOne({ email: searchEmail.replace('@velora.com', '@shoply.com') });
    }

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid verification code. Please check and re-enter.' });
    }

    if (new Date() > new Date(user.resetPasswordOtpExpires)) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
    }

    res.json({
      success: true,
      message: 'Verification code confirmed successfully!',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password using verified OTP
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    let searchEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: searchEmail });
    if (!user && searchEmail.endsWith('@shoply.com')) {
      user = await User.findOne({ email: searchEmail.replace('@shoply.com', '@velora.com') });
    } else if (!user && searchEmail.endsWith('@velora.com')) {
      user = await User.findOne({ email: searchEmail.replace('@velora.com', '@shoply.com') });
    }

    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address' });
    }

    if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    if (new Date() > new Date(user.resetPasswordOtpExpires)) {
      return res.status(400).json({ message: 'Verification code has expired. Please request a new code.' });
    }

    // Set new password (pre-save hook will hash with bcrypt)
    user.password = newPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;

    await user.save();

    console.log(`✅ [SHOPLY AUTH] Password successfully reset for ${user.email}`);

    res.json({
      success: true,
      message: 'Your password has been reset successfully! You may now sign in.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
