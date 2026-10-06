import { Product } from '../Models/Product.js';
import { Order } from '../Models/Order.js';
import { Notification } from '../Models/Notification.js';

// @desc    Get seller dashboard statistics
// @route   GET /api/seller/stats
// @access  Private (Approved Seller)
export const getSellerDashboardStats = async (req, res) => {
  try {
    const sellerId = req.user._id;

    // Total products & approval breakdown
    const totalProducts = await Product.countDocuments({ seller: sellerId });
    const approvedProducts = await Product.countDocuments({ seller: sellerId, approvalStatus: 'approved' });
    const pendingProducts = await Product.countDocuments({ seller: sellerId, approvalStatus: 'pending' });
    const rejectedProducts = await Product.countDocuments({ seller: sellerId, approvalStatus: 'rejected' });

    // Orders involving this seller
    const orders = await Order.find({ 'orderItems.seller': sellerId });

    let totalRevenue = 0;
    let unitsSold = 0;

    orders.forEach((order) => {
      order.orderItems.forEach((item) => {
        if (item.seller && item.seller.toString() === sellerId.toString()) {
          totalRevenue += item.price * item.qty;
          unitsSold += item.qty;
        }
      });
    });

    const pendingOrdersCount = orders.filter(
      (order) => order.status === 'Processing'
    ).length;

    res.json({
      totalProducts,
      approvedProducts,
      pendingProducts,
      rejectedProducts,
      totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      unitsSold,
      pendingOrdersCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all products belonging to the logged in seller
// @route   GET /api/seller/products
// @access  Private (Approved Seller)
export const getSellerProducts = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { seller: req.user._id };
    if (status && status !== 'all') {
      query.approvalStatus = status;
    }
    const products = await Product.find(query).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product (Sellers must wait for Admin approval before listing goes live)
// @route   POST /api/seller/products
// @access  Private (Approved Seller)
export const createSellerProduct = async (req, res) => {
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
      brand: brand || req.user.shopName || 'Shoply Store',
      stock: Number(stock) || 0,
      images: Array.isArray(images) && images.length > 0 ? images : [images],
      seller: req.user._id,
      // Must be approved by Admin before appearing on public store
      approvalStatus: 'pending',
      rejectionReason: '',
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

    // Send notification to Admin team
    try {
      await Notification.create({
        title: 'New Product Pending Approval 📦',
        message: `Merchant ${req.user.shopName || req.user.name} submitted "${createdProduct.title}" for catalog approval.`,
        type: 'alert',
        priority: 'high',
        targetAudience: 'all',
        link: '/admin/seller-products',
        sentBy: req.user._id,
      });
    } catch (notifErr) {
      console.warn('Notification creation notice:', notifErr.message);
    }

    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a seller product
// @route   PUT /api/seller/products/:id
// @access  Private (Approved Seller)
export const updateSellerProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (
      product.seller.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to modify this product' });
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
      resubmit,
    } = req.body;

    if (title) product.title = title;
    if (description) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (discountPrice !== undefined) product.discountPrice = Number(discountPrice);
    if (category) product.category = category;
    if (brand) product.brand = brand;
    if (stock !== undefined) product.stock = Number(stock);
    if (images) product.images = Array.isArray(images) ? images : [images];
    if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
    if (isFlashDeal !== undefined) product.isFlashDeal = Boolean(isFlashDeal);
    if (req.body.offerTag !== undefined) product.offerTag = req.body.offerTag.trim();
    if (sku !== undefined) product.sku = sku;
    if (barcode !== undefined) product.barcode = barcode;
    if (condition !== undefined) product.condition = condition;
    if (bulletPoints !== undefined) product.bulletPoints = Array.isArray(bulletPoints) ? bulletPoints.filter(Boolean) : [];
    if (specifications !== undefined) product.specifications = specifications;
    if (warranty !== undefined) product.warranty = warranty;
    if (fulfillmentChannel !== undefined) product.fulfillmentChannel = fulfillmentChannel;
    if (originCountry !== undefined) product.originCountry = originCountry;

    // If product was rejected or explicit resubmit requested, put it back into pending review
    if (product.approvalStatus === 'rejected' || resubmit) {
      product.approvalStatus = 'pending';
      product.rejectionReason = '';
    }

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a seller product
// @route   DELETE /api/seller/products/:id
// @access  Private (Approved Seller)
export const deleteSellerProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (
      product.seller.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await product.deleteOne();
    res.json({ message: 'Product removed successfully' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get orders relevant to the seller
// @route   GET /api/seller/orders
// @access  Private (Approved Seller)
export const getSellerOrders = async (req, res) => {
  try {
    const orders = await Order.find({ 'orderItems.seller': req.user._id })
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/seller/orders/:id/status
// @access  Private (Approved Seller)
export const updateSellerOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Verify authorization: logged in user must have items in this order or be an admin
    const isOrderSeller = order.orderItems.some(
      (item) => item.seller && item.seller.toString() === req.user._id.toString()
    );

    if (!isOrderSeller && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update status of this order' });
    }

    const previousStatus = order.status;
    order.status = status;
    if (status === 'Delivered') {
      order.deliveredAt = new Date();
      order.isPaid = true;
    }

    const updatedOrder = await order.save();

    // Restock inventory when order is cancelled
    if (status === 'Cancelled' && previousStatus !== 'Cancelled') {
      for (const item of order.orderItems) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: item.qty },
          });
        }
      }
    } else if (previousStatus === 'Cancelled' && status !== 'Cancelled') {
      // Re-decrement stock if uncancelled
      for (const item of order.orderItems) {
        if (item.product) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.qty },
          });
        }
      }
    }

    res.json(updatedOrder);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset/clear discounts for all products belonging to the logged-in seller
// @route   POST /api/seller/products/reset-all-discounts
// @access  Private (Approved Seller)
export const resetAllSellerDiscounts = async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { seller: req.user._id };
    const result = await Product.updateMany(
      filter,
      {
        $set: {
          discountPrice: 0,
          offerTag: '',
          isFlashDeal: false,
          isMegaFlashSale: false,
        },
      }
    );

    res.json({
      message: 'All item discounts reset successfully for your store listings.',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
