import { Product } from '../Models/Product.js';

// Helper to provide multi-seller comparison offers for products
export const attachSellerOffers = (productDoc) => {
  if (!productDoc) return productDoc;
  const p = productDoc.toObject ? productDoc.toObject() : { ...productDoc };
  if (p.sellerOffers && p.sellerOffers.length > 0) {
    return p;
  }

  const basePrice = p.discountPrice > 0 ? p.discountPrice : p.price;
  const primarySellerName = p.seller?.shopName || p.seller?.name || 'Shoply Official Direct';

  const defaultOffer = {
    _id: `${p._id}_offer1`,
    sellerName: primarySellerName,
    sellerId: p.seller?._id || p.seller,
    price: basePrice,
    discountPrice: p.discountPrice || 0,
    originalPrice: p.price,
    deliveryText: '⚡ Fast Insured Delivery',
    deliveryDays: 2,
    shippingFee: 0,
    rating: Number((p.rating || 4.9).toFixed(1)),
    ratingCount: p.numReviews || 0,
    badge: p.fulfillmentChannel || 'Shoply Fulfilled',
    badgeType: 'official',
    stock: p.stock || 0,
    returnPolicy: '7 Days Hassle-Free Replacement',
    warranty: p.warranty || '1 Year Comprehensive Brand Warranty',
    condition: p.condition || 'Brand New (Factory Sealed)',
    isDefault: true,
  };

  p.sellerOffers = [defaultOffer];
  return p;
};

// @desc    Fetch all products with filtering, search, sorting & pagination
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const {
      keyword,
      category,
      minPrice,
      maxPrice,
      rating,
      inStock,
      sort,
      page = 1,
      limit = 12,
    } = req.query;

    const query = {};

    // Search keyword
    if (keyword) {
      query.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { brand: { $regex: keyword, $options: 'i' } },
      ];
    }

    // Category filter
    if (category && category !== 'All') {
      query.category = { $regex: new RegExp(`^${category}$`, 'i') };
    }

    // Price range
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Rating filter
    if (rating) {
      query.rating = { $gte: Number(rating) };
    }

    // In-stock only
    if (inStock === 'true') {
      query.stock = { $gt: 0 };
    }

    // Sorting
    let sortOptions = { createdAt: -1 };
    if (sort === 'price-asc') sortOptions = { price: 1 };
    else if (sort === 'price-desc') sortOptions = { price: -1 };
    else if (sort === 'rating') sortOptions = { rating: -1 };
    else if (sort === 'oldest') sortOptions = { createdAt: 1 };

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('seller', 'name shopName email')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);

    const enhancedProducts = products.map((p) => attachSellerOffers(p));

    res.json({
      products: enhancedProducts,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      total,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isFeatured: true })
      .populate('seller', 'name shopName')
      .limit(10);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get flash deal products (Mega Sale & Flash Drops)
// @route   GET /api/products/flash-deals
// @access  Public
export const getFlashDeals = async (req, res) => {
  try {
    const now = new Date();

    // Auto-expire flash deals that have passed their expiration timestamp
    await Product.updateMany(
      {
        isFlashDeal: true,
        flashSaleExpiresAt: { $exists: true, $ne: null, $lte: now },
      },
      {
        $set: {
          isFlashDeal: false,
          isMegaFlashSale: false,
          discountPrice: 0,
          offerTag: '',
        },
      }
    );

    const products = await Product.find({ isFlashDeal: true })
      .populate('seller', 'name shopName')
      .sort({ isMegaFlashSale: -1, updatedAt: -1 })
      .limit(20);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get product categories with counts
// @route   GET /api/products/categories
// @access  Public
export const getCategories = async (req, res) => {
  try {
    const categories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          image: { $first: { $arrayElemAt: ['$images', 0] } },
        },
      },
      {
        $project: {
          name: '$_id',
          count: 1,
          image: 1,
          _id: 0,
        },
      },
      { $sort: { name: 1 } },
    ]);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fetch single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'seller',
      'name shopName email storeDescription'
    );

    if (product) {
      res.json(attachSellerOffers(product));
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get related products by category
// @route   GET /api/products/related/:id
// @access  Public
export const getRelatedProducts = async (req, res) => {
  try {
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const related = await Product.find({
      category: currentProduct.category,
      _id: { $ne: currentProduct._id },
    })
      .populate('seller', 'name shopName')
      .limit(5);

    res.json(related);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new review for product
// @route   POST /api/products/:id/reviews
// @access  Private (Buyer)
export const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added successfully', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
