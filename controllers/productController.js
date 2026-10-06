import https from 'https';
import http from 'http';
import { Product } from '../Models/Product.js';
import { Order } from '../Models/Order.js';

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

    const query = {
      approvalStatus: 'approved',
    };

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
    const products = await Product.find({ isFeatured: true, approvalStatus: 'approved' })
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

    const products = await Product.find({ isFlashDeal: true, approvalStatus: 'approved' })
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
        $match: {
          approvalStatus: 'approved',
        },
      },
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
      'name shopName email storeDescription role'
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // If product is not approved, only the owner seller or an admin can view it
    if (product.approvalStatus && product.approvalStatus !== 'approved') {
      const isOwner =
        req.user &&
        product.seller &&
        (product.seller._id?.toString() === req.user._id.toString() ||
          product.seller.toString() === req.user._id.toString());
      const isAdmin = req.user && req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(404).json({
          message:
            product.approvalStatus === 'pending'
              ? 'This product is currently pending admin approval and is not yet available on the storefront.'
              : 'This product listing is currently unavailable on the storefront.',
          approvalStatus: product.approvalStatus,
        });
      }
    }

    res.json(attachSellerOffers(product));
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }
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
      approvalStatus: 'approved',
    })
      .populate('seller', 'name shopName')
      .limit(5);

    res.json(related);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new review for product
// @route   POST /api/products/:id/reviews
// @access  Private (Buyer)
export const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Rating must be a valid number between 1 and 5' });
    }

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({ message: 'Review comment cannot be empty' });
    }

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

    // Check if the reviewing user has purchased this product
    const hasPurchased = await Order.exists({
      user: req.user._id,
      'orderItems.product': product._id,
      status: { $in: ['Processing', 'Shipped', 'Delivered'] },
    });

    const review = {
      name: req.user.name,
      rating: Math.round(numRating),
      comment: comment.trim(),
      user: req.user._id,
      isVerifiedPurchase: Boolean(hasPurchased),
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added successfully', product });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Proxy an external product image to bypass CORS/hotlinking/adblocker blocks with strict SSRF protection
// @route   GET /api/products/image-proxy
// @access  Public
export const proxyProductImage = async (req, res) => {
  const fallbackImage =
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80';

  try {
    const { url } = req.query;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ message: 'Valid image URL is required' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return res.status(400).json({ message: 'Only HTTP/HTTPS protocols are permitted' });
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Prevent SSRF: block internal addresses, loopbacks, link-local, and cloud metadata (169.254.*)
    const isPrivateOrInternal =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost') ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      /^127\./.test(hostname);

    if (isPrivateOrInternal) {
      return res.status(403).json({ message: 'Access to private or local network resources is forbidden' });
    }

    // Whitelist approved external image CDNs & media hosts
    const DEFAULT_ALLOWED_DOMAINS = [
      'images.unsplash.com',
      'plus.unsplash.com',
      'res.cloudinary.com',
      'cloudinary.com',
      'i.imgur.com',
      'imgur.com',
      'images.pexels.com',
      'img.freepik.com',
      'm.media-amazon.com',
      'images-na.ssl-images-amazon.com',
      'cdn.shopify.com',
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com',
    ];

    const envDomains = (process.env.ALLOWED_IMAGE_DOMAINS || '')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const allowedDomains = new Set([...DEFAULT_ALLOWED_DOMAINS, ...envDomains]);

    const isDomainAllowed =
      allowedDomains.has(hostname) ||
      [...allowedDomains].some((domain) => hostname === domain || hostname.endsWith('.' + domain));

    if (!isDomainAllowed) {
      return res.redirect(fallbackImage);
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;
    const request = client.get(
      parsedUrl.href,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        timeout: 5000,
      },
      (upstreamRes) => {
        if (upstreamRes.statusCode && upstreamRes.statusCode >= 400) {
          return res.redirect(fallbackImage);
        }

        const rawContentType = upstreamRes.headers['content-type'] || 'image/jpeg';

        // Verify that the upstream response is actually an image
        if (!rawContentType.toLowerCase().startsWith('image/')) {
          return res.redirect(fallbackImage);
        }

        res.setHeader('Content-Type', rawContentType);
        res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=604800');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Access-Control-Allow-Origin', '*');
        upstreamRes.pipe(res);
      }
    );

    request.on('timeout', () => {
      request.destroy();
      res.redirect(fallbackImage);
    });

    request.on('error', () => {
      res.redirect(fallbackImage);
    });
  } catch (error) {
    res.redirect(fallbackImage);
  }
};
