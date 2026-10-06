import { Order } from '../Models/Order.js';
import { Product } from '../Models/Product.js';
import { Coupon } from '../Models/Coupon.js';
import { Notification } from '../Models/Notification.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Buyer)
export const createOrder = async (req, res) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      couponCode,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    // Attach seller ID to each item if not present, and update inventory stock
    const populatedItems = [];
    const deductedItems = [];
    let calculatedItemsPrice = 0;

    for (const item of orderItems) {
      const dbProduct = await Product.findById(item.product);
      if (!dbProduct) {
        // Rollback previously deducted items
        for (const d of deductedItems) {
          await Product.findByIdAndUpdate(d.productId, { $inc: { stock: d.qty } });
        }
        return res.status(404).json({ message: `Product ${item.title || item.product} not found` });
      }

      if (dbProduct.approvalStatus && dbProduct.approvalStatus !== 'approved') {
        // Rollback previously deducted items
        for (const d of deductedItems) {
          await Product.findByIdAndUpdate(d.productId, { $inc: { stock: d.qty } });
        }
        return res.status(400).json({
          message: `Product "${dbProduct.title}" is currently not approved for sale.`,
        });
      }

      // Atomically verify and decrement inventory to eliminate race conditions and overselling
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: dbProduct._id,
          stock: { $gte: item.qty },
        },
        {
          $inc: { stock: -item.qty },
        },
        { new: true }
      );

      if (!updatedProduct) {
        // Rollback previously deducted items
        for (const d of deductedItems) {
          await Product.findByIdAndUpdate(d.productId, { $inc: { stock: d.qty } });
        }
        return res.status(400).json({
          message: `Insufficient stock for "${dbProduct.title}". Only ${dbProduct.stock} unit(s) left.`,
        });
      }

      deductedItems.push({ productId: dbProduct._id, qty: item.qty });

      // Dynamic unit price directly from DB record (prevent client price tampering)
      const unitPrice = dbProduct.discountPrice > 0 ? dbProduct.discountPrice : dbProduct.price;
      calculatedItemsPrice += unitPrice * item.qty;

      populatedItems.push({
        product: dbProduct._id,
        title: dbProduct.title,
        image: item.image || (dbProduct.images && dbProduct.images[0]) || '',
        price: unitPrice,
        qty: item.qty,
        seller: dbProduct.seller,
      });
    }

    // Dynamic Coupon Calculation from DB (Strict verification against active coupons)
    let calculatedDiscount = 0;
    let validatedCouponCode = '';

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const trimmedCode = couponCode.trim().toUpperCase();
      const dbCoupon = await Coupon.findOne({
        code: trimmedCode,
        isActive: true,
      });

      if (dbCoupon) {
        const isNotExpired = !dbCoupon.expiryDate || new Date(dbCoupon.expiryDate) > new Date();
        const meetsMinAmount = !dbCoupon.minOrderAmount || calculatedItemsPrice >= dbCoupon.minOrderAmount;
        const underUsageLimit = !dbCoupon.usageLimit || dbCoupon.usedCount < dbCoupon.usageLimit;

        if (isNotExpired && meetsMinAmount && underUsageLimit) {
          validatedCouponCode = dbCoupon.code;
          if (dbCoupon.discountType === 'percentage') {
            const rawDiscount = Math.round(((calculatedItemsPrice * dbCoupon.discountValue) / 100) * 100) / 100;
            calculatedDiscount = dbCoupon.maxDiscountAmount > 0
              ? Math.min(rawDiscount, dbCoupon.maxDiscountAmount)
              : rawDiscount;
          } else {
            // flat discount
            calculatedDiscount = dbCoupon.discountValue;
          }
          calculatedDiscount = Math.min(calculatedItemsPrice, calculatedDiscount);

          // Increment coupon usage
          dbCoupon.usedCount = (dbCoupon.usedCount || 0) + 1;
          await dbCoupon.save();
        }
      }
    }

    // Dynamic Shipping & Tax (GST 18% standard)
    const calculatedShippingPrice = calculatedItemsPrice > 1999 || calculatedItemsPrice === 0 ? 0 : 199;
    const taxableAmount = Math.max(0, calculatedItemsPrice - calculatedDiscount);
    const calculatedTaxPrice = Math.round(taxableAmount * 0.18 * 100) / 100;
    const calculatedTotalPrice = Math.round((taxableAmount + calculatedShippingPrice + calculatedTaxPrice) * 100) / 100;

    const isSimulatedPrepaid =
      paymentMethod === 'Credit/Debit Card' || paymentMethod === 'UPI';

    const order = new Order({
      user: req.user._id,
      orderItems: populatedItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: Math.round(calculatedItemsPrice * 100) / 100,
      shippingPrice: calculatedShippingPrice,
      taxPrice: calculatedTaxPrice,
      discountAmount: calculatedDiscount,
      totalPrice: calculatedTotalPrice,
      couponCode: validatedCouponCode,
      isPaid: isSimulatedPrepaid,
      paidAt: isSimulatedPrepaid ? new Date() : null,
      paymentResult: isSimulatedPrepaid
        ? {
            id: `PAY-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            status: 'COMPLETED',
            update_time: new Date().toISOString(),
            email_address: req.user.email,
          }
        : undefined,
      status: 'Processing',
    });

    const createdOrder = await order.save();

    // Dispatch in-app notifications for each seller whose items were purchased
    try {
      const sellerItemsMap = new Map();
      for (const item of populatedItems) {
        if (item.seller) {
          const sellerIdStr = item.seller.toString();
          if (!sellerItemsMap.has(sellerIdStr)) {
            sellerItemsMap.set(sellerIdStr, []);
          }
          sellerItemsMap.get(sellerIdStr).push(item);
        }
      }

      const shortOrderId = createdOrder._id.toString().slice(-6).toUpperCase();

      for (const [sellerId, items] of sellerItemsMap.entries()) {
        const totalItemsQty = items.reduce((acc, curr) => acc + curr.qty, 0);
        const sellerSubtotal = items.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
        const itemSummary = items.map((i) => `${i.title} (x${i.qty})`).join(', ');

        await Notification.create({
          title: `🛍️ New Order Received (#${shortOrderId})`,
          message: `${req.user.name || 'A customer'} purchased ${totalItemsQty} item(s): ${itemSummary} totaling ₹${sellerSubtotal.toLocaleString('en-IN')}.`,
          type: 'order',
          priority: 'high',
          targetAudience: 'user',
          recipient: sellerId,
          link: '/seller/orders',
          sentBy: req.user._id,
          isActive: true,
          readBy: [],
        });

        console.log(`🔔 [SELLER NOTIFICATION] Dispatched to seller ID ${sellerId} for order #${shortOrderId}`);
      }

      // Also create order confirmation notification for the buyer
      await Notification.create({
        title: `📦 Order Placed Successfully (#${shortOrderId})`,
        message: `Your purchase of ${orderItems.length} item(s) totaling ₹${calculatedTotalPrice.toLocaleString('en-IN')} has been received and is being prepared.`,
        type: 'order',
        priority: 'normal',
        targetAudience: 'user',
        recipient: req.user._id,
        link: `/order-success/${createdOrder._id}`,
        sentBy: req.user._id,
        isActive: true,
        readBy: [],
      });
    } catch (notifErr) {
      console.error('Error creating order notifications:', notifErr.message);
      // Non-blocking so order creation succeeds even if notification fails
    }

    res.status(201).json(createdOrder);
  } catch (error) {
    // Rollback any stock deducted if order saving failed
    if (typeof deductedItems !== 'undefined' && Array.isArray(deductedItems)) {
      for (const d of deductedItems) {
        await Product.findByIdAndUpdate(d.productId, { $inc: { stock: d.qty } }).catch(() => {});
      }
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/my
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.seller', 'name shopName');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Ensure only the buyer, seller involved, or admin can view
    const isOwner = order.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isOrderSeller = order.orderItems.some(
      (item) => item.seller && item.seller._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !isAdmin && !isOrderSeller) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel order by buyer or admin and atomically restore inventory
// @route   PUT /api/orders/:id/cancel
// @access  Private (Buyer or Admin)
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isOwner = order.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    if (order.status === 'Cancelled') {
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    if (order.status === 'Delivered') {
      return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
    }

    if (order.status === 'Shipped' && !isAdmin) {
      return res.status(400).json({
        message: 'Order has already been shipped and cannot be cancelled directly. Please contact support.',
      });
    }

    order.status = 'Cancelled';
    const updatedOrder = await order.save();

    // Atomically restock all items in the cancelled order
    for (const item of order.orderItems) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.qty },
        });
      }
    }

    // Send notification to unique sellers and buyer
    try {
      const shortOrderId = order._id.toString().slice(-6).toUpperCase();
      const sellerIds = [...new Set(order.orderItems.map((i) => i.seller?.toString()).filter(Boolean))];

      for (const sellerId of sellerIds) {
        await Notification.create({
          title: `Order Cancelled (#${shortOrderId})`,
          message: `Order #${shortOrderId} has been cancelled. Inventory was automatically restocked.`,
          type: 'alert',
          priority: 'high',
          targetAudience: 'user',
          recipient: sellerId,
          link: '/seller/orders',
          sentBy: req.user._id,
        });
      }
    } catch (notifErr) {
      console.warn('Notification notice on order cancellation:', notifErr.message);
    }

    res.json({
      message: 'Order cancelled successfully and inventory restored',
      order: updatedOrder,
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).json({ message: error.message });
  }
};
