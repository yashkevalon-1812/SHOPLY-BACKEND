import mongoose from 'mongoose';
import { User } from '../Models/User.js';
import { Product } from '../Models/Product.js';
import { Order } from '../Models/Order.js';
import { Message } from '../Models/Message.js';
import { Notification } from '../Models/Notification.js';

// @desc    Get overall admin platform analytics
// @route   GET /api/admin/stats
// @access  Private (Admin Only)
export const getAdminDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const pendingSellers = await User.countDocuments({
      role: 'seller',
      sellerStatus: 'pending',
    });
    const pendingProductsCount = await Product.countDocuments({
      approvalStatus: 'pending',
    });

    const orders = await Order.find();
    const totalRevenue = orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0);

    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(6);

    const pendingSellerList = await User.find({
      role: 'seller',
      sellerStatus: 'pending',
    })
      .select('-password')
      .limit(5);

    const unreadMessagesCount = await Message.countDocuments({ status: 'unread' });

    res.json({
      totalUsers,
      totalProducts,
      totalOrders,
      totalSellers,
      pendingSellers,
      pendingProductsCount,
      unreadMessagesCount,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      recentOrders,
      pendingSellerList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all sellers with optional status filter
// @route   GET /api/admin/sellers
// @access  Private (Admin Only)
export const getAllSellers = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { role: 'seller' };

    if (status && status !== 'all') {
      query.sellerStatus = status;
    }

    const sellers = await User.find(query).select('-password').sort({ createdAt: -1 });
    res.json(sellers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve / Reject / Activate a seller account
// @route   PUT /api/admin/sellers/:id/status
// @access  Private (Admin Only)
export const updateSellerStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'active', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be pending, active, or rejected' });
    }

    const seller = await User.findById(req.params.id);

    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    seller.sellerStatus = status;
    const updatedSeller = await seller.save();

    res.json({
      message: `Seller account has been set to ${status}`,
      seller: {
        _id: updatedSeller._id,
        name: updatedSeller.name,
        email: updatedSeller.email,
        shopName: updatedSeller.shopName,
        sellerStatus: updatedSeller.sellerStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all registered users
// @route   GET /api/admin/users
// @access  Private (Admin Only)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private (Admin Only)
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['buyer', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.role = role;
    if (role === 'seller' && !user.sellerStatus) {
      user.sellerStatus = 'active'; // Admin explicitly assigning seller makes them active
    }

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      sellerStatus: updatedUser.sellerStatus,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin Only)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting oneself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own admin account' });
    }

    await user.deleteOne();
    res.json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new administrator account
// @route   POST /api/admin/users
// @access  Private (Admin Only)
export const createAdminUser = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const newAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'admin',
      sellerStatus: 'active',
      phone,
    });

    res.status(201).json({
      _id: newAdmin._id,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      sellerStatus: newAdmin.sellerStatus,
      message: 'New administrator created successfully',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all admin official products (excludes third-party seller listings)
// @route   GET /api/admin/products
// @access  Private (Admin Only)
export const getAllProductsAdmin = async (req, res) => {
  try {
    // Identify all third-party seller accounts
    const regularSellers = await User.find({ role: 'seller' }).select('_id');
    const sellerIds = regularSellers.map((s) => s._id);

    // Fetch only products belonging to admin / official store (excluding third-party sellers)
    const products = await Product.find({ seller: { $nin: sellerIds } })
      .populate('seller', 'name email shopName role')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new official store product (Admin)
// @route   POST /api/admin/products
// @access  Private (Admin Only)
export const createProductAdmin = async (req, res) => {
  try {
    const {
      title,
      description,
      price,
      discountPrice,
      category,
      brand,
      stock,
      images,
      isFeatured,
      isFlashDeal,
      sku,
      barcode,
      condition,
      bulletPoints,
      specifications,
      warranty,
      fulfillmentChannel,
      originCountry,
    } = req.body;

    const product = new Product({
      title,
      description,
      price: Number(price),
      discountPrice: discountPrice ? Number(discountPrice) : 0,
      category,
      brand: brand || 'Shoply Selection',
      stock: Number(stock) || 0,
      images: Array.isArray(images) && images.length > 0 ? images : [images],
      seller: req.user._id,
      approvalStatus: 'approved',
      isFeatured: Boolean(isFeatured),
      isFlashDeal: Boolean(isFlashDeal),
      sku: sku || '',
      barcode: barcode || '',
      condition: condition || 'Brand New (Sealed)',
      bulletPoints: Array.isArray(bulletPoints) ? bulletPoints.filter(Boolean) : [],
      specifications: specifications || {},
      warranty: warranty || '1 Year Brand Warranty',
      fulfillmentChannel: fulfillmentChannel || 'Shoply Fulfilled',
      originCountry: originCountry || 'India',
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update official product (Admin)
// @route   PUT /api/admin/products/:id
// @access  Private (Admin Only)
export const updateProductAdmin = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const {
      title,
      description,
      price,
      discountPrice,
      category,
      brand,
      stock,
      images,
      isFeatured,
      isFlashDeal,
      sku,
      barcode,
      condition,
      bulletPoints,
      specifications,
      warranty,
      fulfillmentChannel,
      originCountry,
    } = req.body;

    if (title) product.title = title;
    if (description) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (discountPrice !== undefined) product.discountPrice = Number(discountPrice);
    if (category) product.category = category;
    if (brand !== undefined) product.brand = brand;
    if (stock !== undefined) product.stock = Number(stock);
    if (images) product.images = Array.isArray(images) ? images : [images];
    if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
    if (isFlashDeal !== undefined) product.isFlashDeal = Boolean(isFlashDeal);
    if (sku !== undefined) product.sku = sku;
    if (barcode !== undefined) product.barcode = barcode;
    if (condition !== undefined) product.condition = condition;
    if (bulletPoints !== undefined) product.bulletPoints = Array.isArray(bulletPoints) ? bulletPoints.filter(Boolean) : [];
    if (specifications !== undefined) product.specifications = specifications;
    if (warranty !== undefined) product.warranty = warranty;
    if (fulfillmentChannel !== undefined) product.fulfillmentChannel = fulfillmentChannel;
    if (originCountry !== undefined) product.originCountry = originCountry;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete any product
// @route   DELETE /api/admin/products/:id
// @access  Private (Admin Only)
export const deleteProductAdmin = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted by administrator' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update product promotional campaign pricing/discount (Admin)
// @route   PUT /api/admin/products/:id/discount
// @access  Private (Admin Only)
export const updateProductDiscountAdmin = async (req, res) => {
  try {
    const { discountPrice, isFlashDeal, isFeatured, offerTag } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (discountPrice !== undefined) {
      product.discountPrice = Number(discountPrice) || 0;
    }
    if (isFlashDeal !== undefined) {
      product.isFlashDeal = Boolean(isFlashDeal);
    }
    if (isFeatured !== undefined) {
      product.isFeatured = Boolean(isFeatured);
    }
    if (offerTag !== undefined) {
      product.offerTag = offerTag.trim();
    }

    const updated = await product.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset/Remove discounts on ALL products (Admin)
// @route   PUT /api/admin/products/reset-all-discounts
// @access  Private (Admin Only)
export const resetAllProductDiscountsAdmin = async (req, res) => {
  try {
    await Product.updateMany(
      {},
      {
        $set: {
          discountPrice: 0,
          offerTag: '',
          isFlashDeal: false,
        },
      }
    );

    res.json({
      message: 'All product discounts have been removed and standard catalog pricing has been restored.',
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all scheduled flash sales (Admin)
// @route   GET /api/admin/flash-sales
// @access  Private (Admin Only)
export const getScheduledFlashSalesAdmin = async (req, res) => {
  try {
    const flashSales = await Product.find({ isFlashDeal: true })
      .populate('seller', 'name shopName email')
      .sort({ updatedAt: -1 });
    res.json(flashSales);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Schedule new flash sale for a product (Admin)
// @route   POST /api/admin/flash-sales
// @access  Private (Admin Only)
export const scheduleFlashSaleAdmin = async (req, res) => {
  try {
    const { productId, discountPercent, durationHours = 3, isMegaFlashSale = false } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    const pct = Number(discountPercent);
    if (!pct || pct <= 0 || pct >= 100) {
      return res.status(400).json({ message: 'Discount percent must be between 1 and 99' });
    }

    let product = null;

    // Check if valid ObjectId
    const cleanId = String(productId).trim();
    if (mongoose.Types.ObjectId.isValid(cleanId)) {
      product = await Product.findById(cleanId);
    }

    // If not found, check by catalog index (e.g. "12", "1", "2")
    if (!product && !isNaN(Number(cleanId))) {
      const idx = Number(cleanId) - 1;
      const allProds = await Product.find().sort({ createdAt: -1 });
      if (idx >= 0 && idx < allProds.length) {
        product = allProds[idx];
      }
    }

    // If still not found, check by title search
    if (!product) {
      product = await Product.findOne({
        title: { $regex: new RegExp(cleanId, 'i') },
      });
    }

    if (!product) {
      return res.status(404).json({
        message: `Product with ID or reference "${cleanId}" not found in catalog`,
      });
    }

    const hours = Number(durationHours) || 3;
    const discountedPrice = Math.round(product.price * (1 - pct / 100));

    product.isFlashDeal = true;
    product.isMegaFlashSale = Boolean(isMegaFlashSale);
    product.flashSaleDiscountPercent = pct;
    product.discountPrice = discountedPrice;
    product.offerTag = isMegaFlashSale ? 'MEGA FLASH SALE' : `${pct}% FLASH SALE`;
    product.flashSaleExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    const saved = await product.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel / delete a scheduled flash sale (Admin)
// @route   DELETE /api/admin/flash-sales/:id
// @access  Private (Admin Only)
export const cancelScheduledFlashSaleAdmin = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.isFlashDeal = false;
    product.isMegaFlashSale = false;
    product.discountPrice = 0;
    product.offerTag = '';
    product.flashSaleDiscountPercent = 0;
    product.flashSaleExpiresAt = null;

    const saved = await product.save();
    res.json({ message: 'Flash sale removed and regular price restored', product: saved });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders across marketplace
// @route   GET /api/admin/orders
// @access  Private (Admin Only)
export const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('orderItems.seller', 'name shopName')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/admin/orders/:id/status
// @access  Private (Admin Only)
export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { status, isPaid } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const prevStatus = order.status;
    if (status) {
      order.status = status;
      if (status === 'Delivered') {
        order.deliveredAt = new Date();
        order.isPaid = true;
      }

      // Restock inventory when order is cancelled
      if (status === 'Cancelled' && prevStatus !== 'Cancelled') {
        for (const item of order.orderItems) {
          if (item.product) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stock: item.qty },
            });
          }
        }
      } else if (prevStatus === 'Cancelled' && status !== 'Cancelled') {
        // Re-decrement stock if uncancelled
        for (const item of order.orderItems) {
          if (item.product) {
            await Product.findByIdAndUpdate(item.product, {
              $inc: { stock: -item.qty },
            });
          }
        }
      }
    }

    if (isPaid !== undefined) {
      order.isPaid = Boolean(isPaid);
      if (order.isPaid && !order.paidAt) {
        order.paidAt = new Date();
      }
    }

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all seller products grouped by seller with approval status
// @route   GET /api/admin/seller-products
// @access  Private (Admin Only)
export const getSellerProductsGroupedAdmin = async (req, res) => {
  try {
    const { sellerId, status, approvalStatus } = req.query;

    const sellerFilter = { role: 'seller' };
    if (sellerId) {
      sellerFilter._id = sellerId;
    }
    if (status && status !== 'all') {
      sellerFilter.sellerStatus = status;
    }

    const sellers = await User.find(sellerFilter).select('-password').sort({ createdAt: -1 });
    const sellerIds = sellers.map((s) => s._id);

    const products = await Product.find({ seller: { $in: sellerIds } }).sort({ createdAt: -1 });

    const sellersWithProducts = sellers.map((seller) => {
      let sellerProducts = products.filter(
        (p) => p.seller && p.seller.toString() === seller._id.toString()
      );

      const pendingCount = sellerProducts.filter((p) => p.approvalStatus === 'pending').length;
      const approvedCount = sellerProducts.filter((p) => p.approvalStatus === 'approved').length;
      const rejectedCount = sellerProducts.filter((p) => p.approvalStatus === 'rejected').length;

      // Filter products if approvalStatus filter is provided
      if (approvalStatus && approvalStatus !== 'all') {
        sellerProducts = sellerProducts.filter((p) => p.approvalStatus === approvalStatus);
      }

      const totalInventoryValue = sellerProducts.reduce(
        (acc, p) => acc + (p.price * (p.stock || 0)),
        0
      );
      const totalStock = sellerProducts.reduce((acc, p) => acc + (p.stock || 0), 0);

      return {
        seller: {
          _id: seller._id,
          name: seller.name,
          email: seller.email,
          phone: seller.phone,
          shopName: seller.shopName || seller.name,
          storeDescription: seller.storeDescription || '',
          sellerStatus: seller.sellerStatus || 'pending',
          createdAt: seller.createdAt,
        },
        productsCount: sellerProducts.length,
        totalInventoryValue,
        totalStock,
        pendingCount,
        approvedCount,
        rejectedCount,
        products: sellerProducts,
      };
    });

    res.json(sellersWithProducts);
  } catch (error) {
    console.error('Error fetching seller products for admin:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve or reject a product (Admin)
// @route   PUT /api/admin/products/:id/approval
// @access  Private (Admin Only)
export const updateProductApprovalAdmin = async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved, rejected, or pending' });
    }

    const product = await Product.findById(req.params.id).populate('seller', 'name email shopName');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.approvalStatus = status;
    product.rejectionReason = status === 'rejected' ? (reason || 'Product does not meet marketplace standards') : '';
    product.reviewedBy = req.user._id;
    product.reviewedAt = new Date();

    const saved = await product.save();

    // Create notification for the seller
    try {
      const sellerId = product.seller?._id || product.seller;
      if (sellerId) {
        if (status === 'approved') {
          await Notification.create({
            title: 'Product Approved! 🎉',
            message: `Your listing "${product.title}" has been approved by the Admin and is now live on the Shoply marketplace!`,
            type: 'system',
            priority: 'normal',
            targetAudience: 'user',
            recipient: sellerId,
            link: `/product/${product._id}`,
            sentBy: req.user._id,
          });
        } else if (status === 'rejected') {
          await Notification.create({
            title: 'Product Review Update ⚠️',
            message: `Your listing "${product.title}" was not approved by the Admin. Reason: ${product.rejectionReason}`,
            type: 'alert',
            priority: 'high',
            targetAudience: 'user',
            recipient: sellerId,
            link: '/seller/products',
            sentBy: req.user._id,
          });
        }
      }
    } catch (notifErr) {
      console.warn('Notification error on approval:', notifErr.message);
    }

    res.json({
      message: `Product "${product.title}" has been marked as ${status}`,
      product: saved,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve all pending products for a seller
// @route   PUT /api/admin/seller-products/approve-all/:sellerId
// @access  Private (Admin Only)
export const approveAllSellerProductsAdmin = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const result = await Product.updateMany(
      { seller: sellerId, approvalStatus: { $ne: 'approved' } },
      {
        $set: {
          approvalStatus: 'approved',
          rejectionReason: '',
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        },
      }
    );

    // Notify seller
    try {
      await Notification.create({
        title: 'Catalog Approved! 🎉',
        message: `All pending product listings for your shop have been approved by the Administrator and are now live!`,
        type: 'system',
        priority: 'normal',
        targetAudience: 'user',
        recipient: sellerId,
        link: '/seller/products',
        sentBy: req.user._id,
      });
    } catch (e) {
      // Non-fatal
    }

    res.json({
      message: `Approved ${result.modifiedCount} products for this merchant`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

