import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order } from '../Models/Order.js';
import { Product } from '../Models/Product.js';
import { Notification } from '../Models/Notification.js';

// Check if configured Razorpay credentials are real API keys (not placeholders)
const isRealRazorpayConfigured = () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const isPlaceholder =
    !keyId ||
    !keySecret ||
    keyId.includes('placeholder') ||
    keyId.includes('5173ShoplyPay') ||
    keyId.includes('YourRazorpay') ||
    keySecret.includes('placeholder') ||
    keySecret.includes('ShoplySecret2026') ||
    keySecret.includes('YourRazorpay');

  return !isPlaceholder && (keyId.startsWith('rzp_test_') || keyId.startsWith('rzp_live_'));
};

// Initialize Razorpay client if real keys are available
const getRazorpayInstance = () => {
  if (!isRealRazorpayConfigured()) {
    return null;
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// @desc    Get Razorpay public Key ID & configuration status
// @route   GET /api/payment/razorpay/key
// @access  Public / Private
export const getRazorpayKey = async (req, res) => {
  try {
    const isReal = isRealRazorpayConfigured();
    const keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mock';

    res.json({
      success: true,
      keyId,
      isRealKeys: isReal,
      currency: 'INR',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Razorpay Order instance for checkout
// @route   POST /api/payment/razorpay/create-order
// @access  Private (Buyer)
export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Ensure order belongs to current user
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized for this order' });
    }

    if (order.isPaid) {
      return res.status(400).json({ success: false, message: 'Order is already marked as paid' });
    }

    // Razorpay amount in smallest currency subunit (paise for INR, 1 INR = 100 paise)
    const amountInPaise = Math.round(order.totalPrice * 100);

    const razorpay = getRazorpayInstance();
    const isReal = Boolean(razorpay);

    let razorpayOrderId = '';

    if (isReal) {
      // Create real Razorpay order via official SDK
      const options = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${order._id.toString().slice(-8)}_${Date.now().toString().slice(-4)}`,
        notes: {
          orderId: order._id.toString(),
          userId: req.user._id.toString(),
          customerName: order.shippingAddress?.fullName || req.user.name || '',
        },
      };

      const rzpOrder = await razorpay.orders.create(options);
      razorpayOrderId = rzpOrder.id;
    } else {
      // Sandbox simulation mode when live credentials are not yet entered
      razorpayOrderId = `order_sim_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
      console.log(`[RAZORPAY SIMULATION] Generated sandbox order ID: ${razorpayOrderId} for Order #${order._id}`);
    }

    // Persist razorpayOrderId on DB Order
    order.razorpayOrderId = razorpayOrderId;
    order.paymentMethod = 'Razorpay';
    await order.save();

    res.json({
      success: true,
      isRealMode: isReal,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock',
      orderId: order._id,
      razorpayOrderId,
      amount: amountInPaise,
      currency: 'INR',
      totalPrice: order.totalPrice,
      customer: {
        name: order.shippingAddress?.fullName || req.user.name || '',
        email: req.user.email || '',
        phone: order.shippingAddress?.phone || req.user.phone || '',
      },
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to initialize Razorpay transaction',
    });
  }
};

// @desc    Verify Razorpay payment signature & mark order paid
// @route   POST /api/payment/razorpay/verify
// @access  Private (Buyer)
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!orderId || !razorpay_payment_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and Razorpay Payment ID are required',
      });
    }

    const order = await Order.findById(orderId).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized for this order' });
    }

    const isReal = isRealRazorpayConfigured();

    if (isReal) {
      if (!razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Missing Razorpay signature verification parameters',
        });
      }

      // Verify HMAC-SHA256 signature
      const expectedBody = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(expectedBody)
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          message: 'Payment verification failed: Invalid cryptographic signature',
        });
      }
    } else {
      console.log(`[RAZORPAY SIMULATION] Cryptographic bypass for sandbox testing on Order #${orderId}`);
    }

    // Payment signature is valid -> Mark order as paid
    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentMethod = 'Razorpay';
    order.razorpayOrderId = razorpay_order_id || order.razorpayOrderId || '';
    order.paymentResult = {
      id: razorpay_payment_id,
      status: 'COMPLETED',
      update_time: new Date().toISOString(),
      email_address: order.user?.email || req.user.email,
      razorpay_order_id: razorpay_order_id || '',
      razorpay_payment_id: razorpay_payment_id,
      razorpay_signature: razorpay_signature || 'verified_signature',
    };

    const updatedOrder = await order.save();

    // Send notifications to buyer and sellers
    try {
      const shortOrderId = order._id.toString().slice(-6).toUpperCase();

      // Buyer notification
      await Notification.create({
        title: `💳 Payment Received - Order #${shortOrderId}`,
        message: `Your payment of ₹${order.totalPrice.toLocaleString('en-IN')} via Razorpay (Txn: ${razorpay_payment_id}) has been successfully confirmed.`,
        type: 'order',
        priority: 'high',
        targetAudience: 'user',
        recipient: req.user._id,
        link: `/order-success/${order._id}`,
        sentBy: req.user._id,
        isActive: true,
        readBy: [],
      });

      // Notify sellers involved in this order
      const sellerIds = [
        ...new Set(
          order.orderItems
            .map((item) => item.seller?.toString())
            .filter(Boolean)
        ),
      ];

      for (const sId of sellerIds) {
        await Notification.create({
          title: `💰 Payment Settled for Order #${shortOrderId}`,
          message: `Customer payment has been settled via Razorpay for Order #${shortOrderId}. Please prepare items for dispatch.`,
          type: 'order',
          priority: 'normal',
          targetAudience: 'user',
          recipient: sId,
          link: '/seller/orders',
          sentBy: req.user._id,
          isActive: true,
          readBy: [],
        });
      }
    } catch (notifErr) {
      console.warn('Failed to send payment notification:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Razorpay payment verified successfully',
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed',
    });
  }
};

// @desc    Cancel unpaid Razorpay order and restore product stock
// @route   POST /api/payment/razorpay/cancel-unpaid
// @access  Private (Buyer)
export const cancelUnpaidRazorpayOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized for this order' });
    }

    // Only allow cancelling if order is not paid
    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel an order that has already been paid',
      });
    }

    order.status = 'Cancelled';
    await order.save();

    // Restock all items
    for (const item of order.orderItems) {
      if (item.product) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.qty },
        });
      }
    }

    res.json({
      success: true,
      message: 'Unpaid order cancelled and stock restored successfully',
      order,
    });
  } catch (error) {
    console.error('Error cancelling unpaid Razorpay order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
