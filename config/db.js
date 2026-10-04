import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/velora');
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // Seamless migration: ensure all existing products in DB default to 'approved'
    try {
      const { Product } = await import('../Models/Product.js');
      await Product.updateMany(
        { approvalStatus: { $exists: false } },
        { $set: { approvalStatus: 'approved' } }
      );
    } catch (migErr) {
      console.warn('Product approval migration notice:', migErr.message);
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};
