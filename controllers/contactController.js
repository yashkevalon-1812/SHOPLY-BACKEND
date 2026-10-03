import { Message } from '../Models/Message.js';

// @desc    Submit contact message
// @route   POST /api/contact
// @access  Public
export const submitContactMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const newMessage = await Message.create({
      name,
      email,
      subject,
      message,
    });

    res.status(201).json({
      message: 'Your message has been sent successfully. We will contact you soon.',
      inquiry: newMessage,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all messages
// @route   GET /api/contact
// @access  Private (Admin Only)
export const getContactMessages = async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update message status (read / resolved)
// @route   PUT /api/contact/:id
// @access  Private (Admin Only)
export const updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const msg = await Message.findById(req.params.id);

    if (!msg) {
      return res.status(404).json({ message: 'Message not found' });
    }

    msg.status = status;
    const updated = await msg.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
