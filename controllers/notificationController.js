import { Notification } from '../Models/Notification.js';
import { User } from '../Models/User.js';

// @desc    Create and dispatch broadcast notification (Admin Only)
// @route   POST /api/notifications/admin
// @access  Private (Admin Only)
export const createBroadcastNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type = 'announcement',
      priority = 'normal',
      targetAudience = 'all',
      recipient = null,
      link = '',
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Notification title is required' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Notification message is required' });
    }

    const notification = new Notification({
      title: title.trim(),
      message: message.trim(),
      type,
      priority,
      targetAudience,
      recipient: recipient || null,
      link: link ? link.trim() : '',
      sentBy: req.user._id,
      isActive: true,
      readBy: [],
    });

    const saved = await notification.save();
    const populated = await Notification.findById(saved._id).populate(
      'sentBy',
      'name email'
    );

    res.status(201).json(populated || saved);
  } catch (error) {
    console.error('Error creating broadcast notification:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all broadcast notifications for admin dashboard
// @route   GET /api/notifications/admin
// @access  Private (Admin Only)
export const getAllBroadcastsAdmin = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('sentBy', 'name email')
      .populate('recipient', 'name email shopName role')
      .sort({ createdAt: -1 });

    const totalBroadcasts = notifications.length;
    const totalReads = notifications.reduce(
      (acc, n) => acc + (n.readBy ? n.readBy.length : 0),
      0
    );

    const audienceStats = {
      all: notifications.filter((n) => n.targetAudience === 'all').length,
      buyers: notifications.filter((n) => n.targetAudience === 'buyers').length,
      sellers: notifications.filter((n) => n.targetAudience === 'sellers').length,
      user: notifications.filter((n) => n.targetAudience === 'user').length,
    };

    res.json({
      notifications,
      stats: {
        totalBroadcasts,
        totalReads,
        audienceStats,
      },
    });
  } catch (error) {
    console.error('Error fetching admin broadcasts:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a broadcast notification (Admin Only)
// @route   DELETE /api/notifications/admin/:id
// @access  Private (Admin Only)
export const deleteBroadcastAdmin = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    await notification.deleteOne();
    res.json({ message: 'Broadcast notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting broadcast notification:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notifications for logged-in user (Buyer/Seller/Admin)
// @route   GET /api/notifications
// @access  Private (Authenticated)
export const getUserNotifications = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;

    // Filter by target audience or direct recipient
    const audienceConditions = [{ targetAudience: 'all' }];

    if (userRole === 'seller') {
      audienceConditions.push({ targetAudience: 'sellers' });
    } else if (userRole === 'buyer') {
      audienceConditions.push({ targetAudience: 'buyers' });
    } else if (userRole === 'admin') {
      audienceConditions.push({ targetAudience: 'buyers' }, { targetAudience: 'sellers' });
    }

    audienceConditions.push({ recipient: userId });

    const notifications = await Notification.find({
      isActive: true,
      $or: audienceConditions,
    })
      .sort({ createdAt: -1 })
      .limit(40);

    const formatted = notifications.map((n) => {
      const isRead = n.readBy.some(
        (r) => r.user && r.user.toString() === userId.toString()
      );
      return {
        _id: n._id,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority,
        link: n.link,
        targetAudience: n.targetAudience,
        createdAt: n.createdAt,
        isRead,
      };
    });

    const unreadCount = formatted.filter((n) => !n.isRead).length;

    res.json({
      notifications: formatted,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private (Authenticated)
export const markNotificationAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    const userId = req.user._id;
    const alreadyRead = notification.readBy.some(
      (r) => r.user && r.user.toString() === userId.toString()
    );

    if (!alreadyRead) {
      notification.readBy.push({
        user: userId,
        readAt: new Date(),
      });
      await notification.save();
    }

    res.json({ message: 'Marked as read', notificationId: notification._id });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark all applicable notifications as read for logged in user
// @route   PUT /api/notifications/mark-all-read
// @access  Private (Authenticated)
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user._id;

    const audienceConditions = [{ targetAudience: 'all' }];
    if (userRole === 'seller') {
      audienceConditions.push({ targetAudience: 'sellers' });
    } else if (userRole === 'buyer') {
      audienceConditions.push({ targetAudience: 'buyers' });
    } else if (userRole === 'admin') {
      audienceConditions.push({ targetAudience: 'buyers' }, { targetAudience: 'sellers' });
    }
    audienceConditions.push({ recipient: userId });

    const notifications = await Notification.find({
      isActive: true,
      $or: audienceConditions,
      'readBy.user': { $ne: userId },
    });

    for (const notif of notifications) {
      notif.readBy.push({
        user: userId,
        readAt: new Date(),
      });
      await notif.save();
    }

    res.json({ message: 'All notifications marked as read', updatedCount: notifications.length });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ message: error.message });
  }
};
