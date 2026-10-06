import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './Models/User.js';
import { Product } from './Models/Product.js';
import { Order } from './Models/Order.js';
import { Message } from './Models/Message.js';
import { Coupon } from './Models/Coupon.js';
import { Promotion } from './Models/Promotion.js';
import { Notification } from './Models/Notification.js';
import { connectDB } from './config/db.js';
import { encryptValue } from './utils/payoutCrypto.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing all existing database collections...');
    await User.deleteMany();
    await Product.deleteMany();
    await Order.deleteMany();
    await Message.deleteMany();
    await Coupon.deleteMany();
    await Promotion.deleteMany();
    await Notification.deleteMany();

    // =========================================================================
    // 1. SEED USERS (Admin, Approved Sellers, Pending Seller, Rejected Seller, Buyers)
    // =========================================================================
    console.log('👤 Seeding demo users...');

    const adminUser = await User.create({
      name: 'Elena Vance (Admin)',
      email: 'admin@shoply.com',
      password: 'admin123',
      role: 'admin',
      sellerStatus: 'active',
      phone: '+91 98201 02834',
      address: {
        street: 'Penthouse 42, Maker Chambers V, Nariman Point',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400021',
        country: 'India',
      },
    });

    const seller1 = await User.create({
      name: 'Marcus Sterling',
      email: 'seller@shoply.com',
      password: 'seller123',
      role: 'seller',
      sellerStatus: 'active',
      shopName: 'Shoply Atelier',
      storeDescription: 'Handcrafted precision timepieces, bespoke audio equipment, and artisanal lifestyle essentials.',
      businessType: 'registered',
      phone: '+91 98332 81720',
      address: {
        street: 'Heritage Arcade, Suite 8, Kala Ghoda, Fort',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      payoutDetails: {
        accountHolderName: 'Marcus Sterling',
        bankName: 'HDFC Bank',
        accountType: 'current',
        accountNumberEncrypted: encryptValue('50100234567890'),
        ifscEncrypted: encryptValue('HDFC0000123'),
        updatedAt: new Date('2026-01-12T10:30:00Z'),
      },
    });

    const seller2 = await User.create({
      name: 'Vikram Singhania',
      email: 'vikram@shoply.com',
      password: 'seller123',
      role: 'seller',
      sellerStatus: 'active',
      shopName: 'Apex Tech & Audio Lab',
      storeDescription: 'Audiophile acoustics, mechanical keyboards, premium cameras, and ergonomic workstation gear.',
      businessType: 'registered',
      phone: '+91 98112 34567',
      address: {
        street: 'Plot 44, Tech Horizon Park, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'India',
      },
      payoutDetails: {
        accountHolderName: 'Vikram Singhania',
        bankName: 'ICICI Bank',
        accountType: 'current',
        accountNumberEncrypted: encryptValue('026009881234567'),
        ifscEncrypted: encryptValue('ICIC0000260'),
        updatedAt: new Date('2026-01-18T14:05:00Z'),
      },
    });

    const pendingSeller = await User.create({
      name: 'Amit Sharma',
      email: 'amit@shoply.com',
      password: 'seller123',
      role: 'seller',
      sellerStatus: 'pending',
      shopName: 'Aura Tech & Studio',
      storeDescription: 'Minimalist desk setups, artisan keycaps, and custom coiled mechanical cables.',
      businessType: 'individual',
      phone: '+91 97645 19283',
      address: {
        street: '12th Cross, Sector 4, HSR Layout',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560102',
        country: 'India',
      },
      payoutDetails: {
        accountHolderName: 'Amit Sharma',
        bankName: 'State Bank of India',
        accountType: 'savings',
        accountNumberEncrypted: encryptValue('38291045678'),
        ifscEncrypted: encryptValue('SBIN0003829'),
        updatedAt: new Date('2026-02-02T09:15:00Z'),
      },
    });

    const rejectedSeller = await User.create({
      name: 'Rohan Mehra',
      email: 'rohan@shoply.com',
      password: 'seller123',
      role: 'seller',
      sellerStatus: 'rejected',
      shopName: 'Discount Gadgets Direct',
      storeDescription: 'Unverified refurbished consumer imports and excess inventory lots.',
      businessType: 'individual',
      phone: '+91 91234 56780',
      address: {
        street: 'Shop 19, Old Market Lane, Sadar',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110006',
        country: 'India',
      },
      payoutDetails: {
        accountHolderName: 'Rohan Mehra',
        bankName: 'Punjab National Bank',
        accountType: 'savings',
        accountNumberEncrypted: encryptValue('11882200345'),
        ifscEncrypted: encryptValue('PUNB0118822'),
        updatedAt: new Date('2026-02-08T17:45:00Z'),
      },
    });

    const buyer1 = await User.create({
      name: 'Sophia Patel',
      email: 'user@shoply.com',
      password: 'user123',
      role: 'buyer',
      phone: '+91 98201 92834',
      address: {
        street: 'Flat 14B, Sea Face Towers, Worli Sea Face',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400018',
        country: 'India',
      },
    });

    const buyer2 = await User.create({
      name: 'Arjun Kapoor',
      email: 'arjun@shoply.com',
      password: 'user123',
      role: 'buyer',
      phone: '+91 98765 43210',
      address: {
        street: 'Villa 7, Golf Links Residences',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110003',
        country: 'India',
      },
    });

    const buyer3 = await User.create({
      name: 'Priya Nambiar',
      email: 'priya@shoply.com',
      password: 'user123',
      role: 'buyer',
      phone: '+91 99887 76655',
      address: {
        street: 'Tower C - 1002, Prestige Lakeside Habitat, Varthur',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560087',
        country: 'India',
      },
    });

    console.log(`✅ Seeded ${[adminUser, seller1, seller2, pendingSeller, rejectedSeller, buyer1, buyer2, buyer3].length} users.`);

    // =========================================================================
    // 2. SEED PRODUCTS (Admin Official Store, Seller 1, Seller 2 across all departments)
    // =========================================================================
    console.log('🛍️ Seeding products across all departments...');

    const productsData = [
      // --- Luxury Watches ---
      {
        title: 'Shoply Chronograph Noir Heritage',
        description: 'Forged from surgical-grade 316L stainless steel with a sapphire crystal face, Swiss quartz movement, and genuine top-grain Italian leather strap. Water resistant to 100 meters.',
        price: 29999,
        discountPrice: 24999,
        category: 'Luxury Watches',
        brand: 'Shoply Atelier',
        stock: 15,
        sku: 'WAT-NOIR-316L',
        barcode: '890123450001',
        condition: 'Brand New (Factory Sealed)',
        warranty: '2 Year International Manufacturer Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Switzerland',
        bulletPoints: [
          'Swiss Ronda 5030.D chronograph quartz caliber',
          'Double-domed anti-reflective scratchproof sapphire glass',
          '316L hypoallergenic marine stainless steel casing',
          'Includes interchangeable top-grain Tuscan calfskin strap',
        ],
        specifications: {
          'Case Diameter': '41mm',
          'Case Thickness': '11.5mm',
          'Water Resistance': '10 ATM (100 Meters)',
          'Movement': 'Swiss Quartz Chronograph',
        },
        images: [
          'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.9,
        numReviews: 18,
        isFeatured: true,
        isFlashDeal: true,
        isMegaFlashSale: true,
        offerTag: 'MEGA FLASH SALE',
        flashSaleDiscountPercent: 17,
        flashSaleExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        reviews: [
          {
            user: buyer1._id,
            name: buyer1.name,
            rating: 5,
            comment: 'Stunning craftsmanship and weighty feel. Exceeded expectations in every dimension.',
          },
          {
            user: buyer2._id,
            name: buyer2.name,
            rating: 5,
            comment: 'The sapphire crystal reflects light beautifully. An heirloom piece for any watch collection.',
          },
        ],
      },
      {
        title: 'Shoply Automatic Royal Diver 300M',
        description: 'Robust 41mm ceramic bezel diver watch with high-beat automatic movement, luminescent Super-LumiNova markers, and solid oyster link bracelet.',
        price: 42999,
        discountPrice: 36999,
        category: 'Luxury Watches',
        brand: 'Shoply Atelier',
        stock: 11,
        sku: 'WAT-DIVER-300M',
        barcode: '890123450002',
        condition: 'Brand New (Factory Sealed)',
        warranty: '3 Year International Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Japan',
        bulletPoints: [
          '300M professional diving rating with helium escape valve',
          'Ceramic 120-click unidirectional rotating diver bezel',
          'Automatic 28,800 vph movement with 42-hour power reserve',
          'Swiss BGW9 Super-LumiNova for underwater visibility',
        ],
        images: [
          'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1533139502658-0198f920d8e8?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.9,
        numReviews: 33,
        isFeatured: true,
        isFlashDeal: true,
        isMegaFlashSale: false,
        offerTag: '14% FLASH DEAL',
        flashSaleDiscountPercent: 14,
        flashSaleExpiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      },
      {
        title: 'Grand Classic Skeleton Automatic Horology',
        description: 'Exquisite open-worked skeleton dial displaying the rhythmic heartbeat of precision escapement gears. Hand-polished bevels and sapphire caseback.',
        price: 58999,
        discountPrice: 49999,
        category: 'Luxury Watches',
        brand: 'Shoply Official Direct',
        stock: 8,
        sku: 'WAT-SKEL-GRD',
        barcode: '890123450003',
        condition: 'Brand New (Factory Sealed)',
        warranty: '5 Year Comprehensive Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Switzerland',
        bulletPoints: [
          'Fully exposed twin-barrel automatic skeleton movement',
          'Exhibition caseback showcasing blued rotor screws',
          'Genuine alligator pattern embossed Italian leather strap',
        ],
        images: [
          'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1539185441755-769473a23570?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: adminUser._id, // Admin Official Store product
        rating: 5.0,
        numReviews: 14,
        isFeatured: true,
        isFlashDeal: false,
      },

      // --- Audio & Acoustics ---
      {
        title: 'Aura ANC Studio Wireless Headphones',
        description: 'Immersive soundstage powered by 45mm custom dynamic drivers. Industry-leading 42dB active noise cancellation with 48 hours of uninterrupted battery endurance.',
        price: 22999,
        discountPrice: 17999,
        category: 'Audio',
        brand: 'Shoply Audio',
        stock: 22,
        sku: 'AUD-AURA-ANC45',
        barcode: '890123450004',
        condition: 'Brand New (Sealed)',
        warranty: '1 Year Brand Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Germany',
        bulletPoints: [
          'Hybrid Adaptive Noise Cancellation with 6 beamforming microphones',
          'LDAC and aptX HD lossless audio streaming over Bluetooth 5.3',
          'Plush memory foam earcups wrapped in breathable protein leather',
          'Quick 15-minute charge delivers 6 hours of playback',
        ],
        images: [
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.8,
        numReviews: 24,
        isFeatured: true,
        isFlashDeal: true,
        offerTag: 'HOT DEAL',
      },
      {
        title: 'Sirocco Hi-Res Tube Amplifier & DAC',
        description: 'Pure vacuum tube analog warmth paired with dual ESS Sabre DAC chips. Supports 32-bit/768kHz DSD512 decode for transcendent audiophile acoustic fidelity.',
        price: 31999,
        discountPrice: 26499,
        category: 'Audio',
        brand: 'Sirocco Sound',
        stock: 5,
        sku: 'AUD-SIR-TUBE512',
        barcode: '890123450005',
        condition: 'Brand New (Sealed)',
        warranty: '2 Year Manufacturer Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'United Kingdom',
        bulletPoints: [
          'Electro-Harmonix matched Russian dual vacuum tubes',
          'Dual ESS Sabre ES9038Q2M digital-to-analog converters',
          'Supports XLR balanced and 6.35mm single-ended headphone out',
          'CNC milled anodized aluminum shielding block',
        ],
        images: [
          'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller2._id,
        rating: 5.0,
        numReviews: 15,
        isFeatured: false,
        isFlashDeal: false,
      },
      {
        title: 'EchoPod Studio Pro Wireless Earbuds',
        description: 'Spatial audio with dynamic head tracking, dual-chamber acoustic drivers, IPX7 water resistance, and wireless charging case.',
        price: 11999,
        discountPrice: 8999,
        category: 'Audio',
        brand: 'Apex Acoustics',
        stock: 40,
        sku: 'AUD-ECHOPOD-PRO',
        barcode: '890123450006',
        condition: 'Brand New (Sealed)',
        warranty: '1 Year Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'India',
        bulletPoints: [
          'Dual dynamic drivers for punchy bass and crystal highs',
          'Active Transparency and Noise Suppression Modes',
          '36 hours total battery with compact wireless Qi case',
        ],
        images: [
          'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller2._id,
        rating: 4.7,
        numReviews: 38,
        isFeatured: true,
        isFlashDeal: true,
      },

      // --- Electronics & Workstation ---
      {
        title: 'Luminary Mechanical Gasket Keyboard',
        description: 'Precision CNC milled aerospace aluminum chassis, hot-swappable lubricated linear switches, RGB per-key illumination, and Bluetooth 5.2 tri-mode connectivity.',
        price: 16499,
        discountPrice: 13999,
        category: 'Electronics',
        brand: 'Luminary',
        stock: 14,
        sku: 'ELE-LUM-KB75',
        barcode: '890123450007',
        condition: 'Brand New (Sealed)',
        warranty: '1 Year Brand Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Taiwan',
        bulletPoints: [
          'PORON gasket mount structure with double sound-dampening silicone',
          'Factory pre-lubricated Gateron Pro Yellow linear switches',
          'Tri-mode: USB-C wired, 2.4GHz ultra-low latency, and Bluetooth 5.2',
          'Heavy CNC machined brass weight for anti-slide stability',
        ],
        images: [
          'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller2._id,
        rating: 4.9,
        numReviews: 31,
        isFeatured: true,
        isFlashDeal: false,
      },
      {
        title: 'AeroLens 4K Cinema Drone',
        description: 'Ultra-compact folding drone equipped with 1-inch CMOS 4K/60fps HDR camera, 3-axis motorized gimbal, omnidirectional obstacle avoidance, and 34-minute flight time.',
        price: 74999,
        discountPrice: 64999,
        category: 'Electronics',
        brand: 'AeroTech',
        stock: 7,
        sku: 'ELE-AERO-DRONE4K',
        barcode: '890123450008',
        condition: 'Brand New (Sealed)',
        warranty: '1 Year Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Japan',
        bulletPoints: [
          '1-inch 20MP Hasselblad CMOS Sensor with 4K/60fps 10-bit D-Log M',
          'Omnidirectional dual-vision obstacle sensing radar',
          '15km O3+ video transmission in ultra-low latency',
          'MasterShots intelligent automated flight cinematography',
        ],
        images: [
          'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: adminUser._id, // Admin Official Store product
        rating: 4.9,
        numReviews: 19,
        isFeatured: true,
        isFlashDeal: false,
      },
      {
        title: 'StudioFocus 4K HDR Ultra-Wide Creator Monitor',
        description: '34-inch curved Nano-IPS panel with 98% DCI-P3 color gamut, Thunderbolt 4 90W single-cable dock, factory delta-E < 1.5 calibration, and built-in KVM switch.',
        price: 59999,
        discountPrice: 51999,
        category: 'Electronics',
        brand: 'Apex Tech',
        stock: 9,
        sku: 'ELE-MON-UW34K',
        barcode: '890123450009',
        condition: 'Brand New (Sealed)',
        warranty: '3 Year On-Site Panel Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'South Korea',
        bulletPoints: [
          '34-inch 3440x1440p 1900R curved Nano-IPS panel',
          'Hardware color calibrator included in box',
          'Thunderbolt 4 with daisy chaining and 90W PD charging',
        ],
        images: [
          'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1547082299-de196ea013d6?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller2._id,
        rating: 4.8,
        numReviews: 22,
        isFeatured: false,
        isFlashDeal: false,
      },

      // --- Fashion & Apparel ---
      {
        title: 'Vanguard Cashmere Knit Overcoat',
        description: 'Tailored from 100% Mongolian grade-A double-faced cashmere. Classic notch lapel silhouette engineered for year-round warmth, fluid movement, and timeless sophistication.',
        price: 38999,
        discountPrice: 32999,
        category: 'Fashion',
        brand: 'Shoply Atelier',
        stock: 6,
        sku: 'FAS-VAN-COAT',
        barcode: '890123450010',
        condition: 'Brand New (Sealed)',
        warranty: 'Lifetime Workmanship Guarantee',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Italy',
        bulletPoints: [
          'Pure 100% Grade-A unblended Mongolian cashmere',
          'Natural horn buttons carved and polished by hand',
          'Silk Bemberg inner sleeve lining for effortless layering',
        ],
        images: [
          'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 5.0,
        numReviews: 9,
        isFeatured: true,
        isFlashDeal: false,
      },
      {
        title: 'Solstice Raw Indigo Selvedge Denim',
        description: 'Woven on vintage shuttle looms in Okayama using 14.5oz organic Zimbabwe cotton. Custom copper hardware, hidden back pocket rivets, and deep indigo rope dye.',
        price: 15499,
        discountPrice: 12999,
        category: 'Fashion',
        brand: 'Solstice Co.',
        stock: 18,
        sku: 'FAS-SOL-DENIM',
        barcode: '890123450011',
        condition: 'Brand New (Sealed)',
        warranty: '1 Year Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Japan',
        bulletPoints: [
          '14.5oz unsanforized right-hand twill selvedge denim',
          'Red line selvedge ID visible on cuffs',
          'Solid copper donut buttons with debossed branding',
        ],
        images: [
          'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.7,
        numReviews: 21,
        isFeatured: false,
        isFlashDeal: false,
      },
      {
        title: 'Merino Wool Minimalist Zip Cardigan',
        description: 'Superfine 19.5-micron Australian merino wool knitted in dense 12-gauge honeycomb stitch. Two-way matte gunmetal YKK zipper with ribbed collar.',
        price: 11499,
        discountPrice: 8999,
        category: 'Fashion',
        brand: 'Shoply Selection',
        stock: 20,
        sku: 'FAS-MERINO-ZIP',
        barcode: '890123450012',
        condition: 'Brand New',
        warranty: '1 Year Quality Guarantee',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Australia',
        images: [
          'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: adminUser._id,
        rating: 4.8,
        numReviews: 16,
        isFeatured: false,
        isFlashDeal: true,
      },

      // --- Shoes & Footwear ---
      {
        title: 'Apex Obsidian Runner Sneakers',
        description: 'Sculpted responsive nitrogen-infused foam midsole with breathable circular knit upper and adaptive traction outsoles for peak performance and street elegance.',
        price: 12999,
        discountPrice: 9999,
        category: 'Shoes',
        brand: 'Apex Athletics',
        stock: 25,
        sku: 'SHOE-APEX-OBSIDIAN',
        barcode: '890123450013',
        condition: 'Brand New (Sealed)',
        warranty: '6 Months Manufacturer Guarantee',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Vietnam',
        bulletPoints: [
          'Nitrogen supercritical foam midsole delivering 78% energy rebound',
          'Engineered warp-knit upper with zoned ventilation points',
          'Vibram Megagrip high-abrasion rubber pods',
        ],
        images: [
          'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.8,
        numReviews: 42,
        isFeatured: false,
        isFlashDeal: true,
        offerTag: 'BEST SELLER',
      },
      {
        title: 'Chelsea Derby Boot in Crust Calfskin',
        description: 'Handcrafted Goodyear welted boots constructed from French crust calfskin leather. Double storm welt, Dainite studded rubber sole, and elastic side gussets.',
        price: 19999,
        discountPrice: 16499,
        category: 'Shoes',
        brand: 'Shoply Atelier',
        stock: 12,
        sku: 'SHOE-CHELSEA-BOOT',
        barcode: '890123450014',
        condition: 'Brand New (Boxed)',
        warranty: '2 Year Leather Care Guarantee',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'England',
        images: [
          'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.9,
        numReviews: 19,
        isFeatured: true,
        isFlashDeal: false,
      },
      {
        title: 'Monochrome Velocity Low Sneakers',
        description: 'Italian nappa leather minimalist cupsole sneakers with cushioned orthotic insole, waxed cotton laces, and reinforced heel counter.',
        price: 14499,
        discountPrice: 11999,
        category: 'Shoes',
        brand: 'Shoply Selection',
        stock: 20,
        sku: 'SHOE-VELO-LOW',
        barcode: '890123450015',
        condition: 'Brand New',
        warranty: '1 Year Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Portugal',
        images: [
          'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1560769629-975ec94e6a86?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: adminUser._id,
        rating: 4.7,
        numReviews: 28,
        isFeatured: false,
        isFlashDeal: false,
      },

      // --- Accessories & Bags ---
      {
        title: 'Kevlar Horizon Commuter Backpack',
        description: 'Weatherproof ballistic nylon construction with modular magnetic fasteners, padded 16-inch laptop compartment, ergonomic memory foam back support, and hidden passport pocket.',
        price: 14999,
        discountPrice: 11999,
        category: 'Accessories',
        brand: 'Horizon Gear',
        stock: 19,
        sku: 'ACC-HORIZON-BP16',
        barcode: '890123450016',
        condition: 'Brand New (Sealed)',
        warranty: 'Lifetime Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'USA',
        bulletPoints: [
          '1680D Cordura ballistic nylon with DWR fluorocarbon-free coating',
          'Fidlock magnetic quick-release chest buckle',
          'Dedicated lay-flat TSA checkpoint friendly laptop compartment',
        ],
        images: [
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.7,
        numReviews: 14,
        isFeatured: false,
        isFlashDeal: false,
      },
      {
        title: 'Vault Titanium RFID-Shielded Slim Wallet',
        description: 'Aerospace grade-5 titanium front plates with high-tensile silicone retention band, holds up to 12 cards and folded cash with integrated airtag slot.',
        price: 5499,
        discountPrice: 4299,
        category: 'Accessories',
        brand: 'Apex Tech',
        stock: 45,
        sku: 'ACC-VAULT-TITAN',
        barcode: '890123450017',
        condition: 'Brand New',
        warranty: 'Lifetime Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'USA',
        images: [
          'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1606503829098-b80894e63784?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller2._id,
        rating: 4.9,
        numReviews: 64,
        isFeatured: true,
        isFlashDeal: true,
      },
      {
        title: 'Solitude Polarized Aviator Sunglasses',
        description: 'Precision Japanese titanium frame with Carl Zeiss polarized mineral glass lenses, offering 100% UVA/UVB protection and anti-scratch hydrophobic coating.',
        price: 13999,
        discountPrice: 11499,
        category: 'Accessories',
        brand: 'Shoply Atelier',
        stock: 16,
        sku: 'ACC-SOL-AV1',
        barcode: '890123450018',
        condition: 'Brand New (Hard Case)',
        warranty: '2 Year Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Japan',
        images: [
          'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.8,
        numReviews: 25,
        isFeatured: false,
        isFlashDeal: false,
      },

      // --- Gaming & Gear ---
      {
        title: 'CyberViper Wireless Ergonomic Esports Mouse',
        description: 'Ultra-lightweight 54g magnesium alloy honeycomb frame with 30,000 DPI optical sensor, optical switches rated for 90 million clicks, and 4K polling wireless receiver.',
        price: 10999,
        discountPrice: 8499,
        category: 'Gaming',
        brand: 'Apex Tech',
        stock: 28,
        sku: 'GAM-VIPER-4K',
        barcode: '890123450019',
        condition: 'Brand New (Sealed)',
        warranty: '2 Year Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'South Korea',
        bulletPoints: [
          'True 4000Hz hyperpolling rate via dedicated USB dongle',
          'Sub-60 millisecond optical actuation with zero debouncing delay',
          'Virgin-grade PTFE glide skates for frictionless control',
        ],
        images: [
          'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller2._id,
        rating: 4.9,
        numReviews: 53,
        isFeatured: true,
        isFlashDeal: true,
        offerTag: 'GAMING PICK',
      },
      {
        title: 'Apex Obsidian Pro Wireless Controller',
        description: 'Hall effect magnetic drift-free joysticks, microswitch mechanical face buttons, 4 remappable back paddles, and multi-platform low-latency wireless.',
        price: 8999,
        discountPrice: 6999,
        category: 'Gaming',
        brand: 'Apex Tech',
        stock: 35,
        sku: 'GAM-APEX-PAD',
        barcode: '890123450020',
        condition: 'Brand New',
        warranty: '1 Year Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'China',
        images: [
          'https://images.unsplash.com/photo-1600080972464-8e5f35f63d08?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1592840496694-26d035b52b48?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller2._id,
        rating: 4.8,
        numReviews: 37,
        isFeatured: false,
        isFlashDeal: false,
      },

      // --- Home & Living ---
      {
        title: 'Zenith Minimalist Oak Standing Desk',
        description: 'Solid European white oak desktop with dual whisper-quiet electric motors, four programmable height presets, integrated cable spine, and anti-collision sensors.',
        price: 54999,
        discountPrice: 45999,
        category: 'Home & Living',
        brand: 'Zenith Studio',
        stock: 9,
        sku: 'HOM-ZENITH-DESK',
        barcode: '890123450021',
        condition: 'Brand New (Crated)',
        warranty: '5 Year Motor & Frame Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Germany',
        bulletPoints: [
          '1.5-inch FSC-certified solid European white oak table top',
          'Dual commercial-grade motors lifting up to 140kg effortlessly',
          'Gyroscopic anti-collision and child lock safety mechanism',
        ],
        images: [
          'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.8,
        numReviews: 17,
        isFeatured: true,
        isFlashDeal: false,
      },
      {
        title: 'Nordic Walnut Ceramic Pour-Over Set',
        description: 'Handcrafted stoneware dripper with double-walled thermal glass carafe and solid walnut base. Engineered for barista-level extraction notes in every brew.',
        price: 6999,
        discountPrice: 5499,
        category: 'Home & Living',
        brand: 'Nordic Craft',
        stock: 30,
        sku: 'HOM-NORD-POUR',
        barcode: '890123450022',
        condition: 'Brand New (Boxed)',
        warranty: '1 Year Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'Denmark',
        images: [
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: seller1._id,
        rating: 4.6,
        numReviews: 12,
        isFeatured: false,
        isFlashDeal: false,
      },
      {
        title: 'AromaVessel Ultrasonic Stone Diffuser',
        description: 'Sculpted from a single block of natural matte porcelain stone. Delivers whisper-quiet micro-mist aromatherapy covering spaces up to 500 sq ft.',
        price: 4999,
        discountPrice: 3899,
        category: 'Home & Living',
        brand: 'Shoply Selection',
        stock: 32,
        sku: 'HOM-AROMA-VES',
        barcode: '890123450023',
        condition: 'Brand New',
        warranty: '1 Year Warranty',
        fulfillmentChannel: 'Shoply Fulfilled',
        originCountry: 'India',
        images: [
          'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=1000&q=80',
          'https://images.unsplash.com/photo-1508746829417-e6f548d8d6ed?auto=format&fit=crop&w=1000&q=80',
        ],
        seller: adminUser._id,
        rating: 4.7,
        numReviews: 18,
        isFeatured: false,
        isFlashDeal: true,
      },
    ];

    const createdProducts = await Product.insertMany(productsData);
    console.log(`✅ Seeded ${createdProducts.length} rich catalog products across 7 departments.`);

    // =========================================================================
    // 3. SEED COUPONS (Storewide & Seller Specific)
    // =========================================================================
    console.log('🎟️ Seeding promotional discount coupons...');

    const couponsData = [
      {
        code: 'SHOPLY10',
        description: '10% instant discount on your entire shopping cart basket with zero minimum order limit.',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        expiryDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        usageLimit: 500,
        usedCount: 38,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        code: 'VIP20',
        description: 'Exclusive 20% savings on premier luxury horology and designer tech for orders above ₹1,999.',
        discountType: 'percentage',
        discountValue: 20,
        minOrderAmount: 1999,
        maxDiscountAmount: 2500,
        expiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        usageLimit: 250,
        usedCount: 42,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        code: 'MEGASALE',
        description: 'Special seasonal mega sale promotion: 20% off on all trending catalog items.',
        discountType: 'percentage',
        discountValue: 20,
        minOrderAmount: 999,
        maxDiscountAmount: 2000,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 1000,
        usedCount: 114,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        code: 'FLAT500',
        description: 'Flat ₹500 instant cash discount on high-tier orders above ₹3,499.',
        discountType: 'flat',
        discountValue: 500,
        minOrderAmount: 3499,
        maxDiscountAmount: 500,
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        usageLimit: 300,
        usedCount: 22,
        isActive: true,
        createdBy: adminUser._id,
      },
      {
        code: 'ATELIER15',
        description: 'Marcus Sterling Atelier exclusive 15% off voucher on timepieces and leathercraft.',
        discountType: 'percentage',
        discountValue: 15,
        minOrderAmount: 4999,
        maxDiscountAmount: 3000,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        usageLimit: 150,
        usedCount: 19,
        isActive: true,
        createdBy: seller1._id,
        seller: seller1._id,
      },
      {
        code: 'APEX10',
        description: 'Apex Tech special 10% voucher for mechanical gear and audiophile devices.',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 1499,
        maxDiscountAmount: 1500,
        expiryDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        usageLimit: 200,
        usedCount: 31,
        isActive: true,
        createdBy: seller2._id,
        seller: seller2._id,
      },
      {
        code: 'WINTER2025',
        description: 'Archived winter holiday coupon (expired for audit test).',
        discountType: 'percentage',
        discountValue: 25,
        minOrderAmount: 2000,
        maxDiscountAmount: 1000,
        expiryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired
        usageLimit: 100,
        usedCount: 100,
        isActive: false,
        createdBy: adminUser._id,
      },
    ];

    const createdCoupons = await Coupon.insertMany(couponsData);
    console.log(`✅ Seeded ${createdCoupons.length} promotional coupons.`);

    // =========================================================================
    // 4. SEED PROMOTION (Sitewide Active Mega Sale Event)
    // =========================================================================
    console.log('📣 Seeding active Mega Sale event promotion...');

    await Promotion.create({
      title: 'SHOPLY MEGA SALE 2026',
      subtitle: 'Up to 70% OFF on Top Tech, Luxury Horology & Bespoke Apparel',
      bannerText: '⚡ FLASH SALE: Extra 20% Instant Discount at Checkout with code MEGASALE',
      couponCode: 'MEGASALE',
      discountPercent: 50,
      badgeText: 'LIMITED TIME MEGA EVENT',
      theme: 'amber',
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      isActive: true,
    });

    console.log('✅ Seeded active Mega Sale promotion.');

    // =========================================================================
    // 5. SEED ORDERS (Processing, Shipped, Delivered, Cancelled across multiple buyers)
    // =========================================================================
    console.log('📦 Seeding customer orders across multiple stages...');

    const ordersData = [
      // 1. Delivered Order (Sophia Patel)
      {
        user: buyer1._id,
        orderItems: [
          {
            product: createdProducts[0]._id, // Watch
            title: createdProducts[0].title,
            image: createdProducts[0].images[0],
            price: 24999,
            qty: 1,
            seller: seller1._id,
          },
          {
            product: createdProducts[16]._id, // Titanium Wallet
            title: createdProducts[16].title,
            image: createdProducts[16].images[0],
            price: 4299,
            qty: 1,
            seller: seller2._id,
          },
        ],
        shippingAddress: {
          fullName: buyer1.name,
          phone: buyer1.phone,
          street: buyer1.address.street,
          city: buyer1.address.city,
          state: buyer1.address.state,
          postalCode: buyer1.address.postalCode,
          country: buyer1.address.country,
        },
        paymentMethod: 'Credit/Debit Card',
        itemsPrice: 29298,
        shippingPrice: 0,
        taxPrice: 5273.64,
        discountAmount: 2500, // VIP20 applied with cap
        totalPrice: 32071.64,
        isPaid: true,
        paidAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        status: 'Delivered',
        deliveredAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },

      // 2. Shipped Order (Sophia Patel - In Transit)
      {
        user: buyer1._id,
        orderItems: [
          {
            product: createdProducts[3]._id, // Headphones
            title: createdProducts[3].title,
            image: createdProducts[3].images[0],
            price: 17999,
            qty: 1,
            seller: seller1._id,
          },
        ],
        shippingAddress: {
          fullName: buyer1.name,
          phone: buyer1.phone,
          street: buyer1.address.street,
          city: buyer1.address.city,
          state: buyer1.address.state,
          postalCode: buyer1.address.postalCode,
          country: buyer1.address.country,
        },
        paymentMethod: 'UPI',
        itemsPrice: 17999,
        shippingPrice: 0,
        taxPrice: 3239.82,
        discountAmount: 1799.9,
        totalPrice: 19438.92,
        isPaid: true,
        paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: 'Shipped',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },

      // 3. Processing Order (Sophia Patel - Cash on Delivery)
      {
        user: buyer1._id,
        orderItems: [
          {
            product: createdProducts[12]._id, // Sneakers
            title: createdProducts[12].title,
            image: createdProducts[12].images[0],
            price: 9999,
            qty: 1,
            seller: seller1._id,
          },
        ],
        shippingAddress: {
          fullName: buyer1.name,
          phone: buyer1.phone,
          street: buyer1.address.street,
          city: buyer1.address.city,
          state: buyer1.address.state,
          postalCode: buyer1.address.postalCode,
          country: buyer1.address.country,
        },
        paymentMethod: 'Cash on Delivery',
        itemsPrice: 9999,
        shippingPrice: 0,
        taxPrice: 1799.82,
        discountAmount: 0,
        totalPrice: 11798.82,
        isPaid: false,
        status: 'Processing',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },

      // 4. Processing Order (Arjun Kapoor - High Ticket Creator Setup)
      {
        user: buyer2._id,
        orderItems: [
          {
            product: createdProducts[6]._id, // Keyboard
            title: createdProducts[6].title,
            image: createdProducts[6].images[0],
            price: 13999,
            qty: 1,
            seller: seller2._id,
          },
          {
            product: createdProducts[18]._id, // Esports Mouse
            title: createdProducts[18].title,
            image: createdProducts[18].images[0],
            price: 8499,
            qty: 1,
            seller: seller2._id,
          },
        ],
        shippingAddress: {
          fullName: buyer2.name,
          phone: buyer2.phone,
          street: buyer2.address.street,
          city: buyer2.address.city,
          state: buyer2.address.state,
          postalCode: buyer2.address.postalCode,
          country: buyer2.address.country,
        },
        paymentMethod: 'Credit/Debit Card',
        itemsPrice: 22498,
        shippingPrice: 0,
        taxPrice: 4049.64,
        discountAmount: 2000,
        totalPrice: 24547.64,
        isPaid: true,
        paidAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        status: 'Processing',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },

      // 5. Delivered Order (Priya Nambiar - Home & Living)
      {
        user: buyer3._id,
        orderItems: [
          {
            product: createdProducts[21]._id, // Pour-Over Set
            title: createdProducts[21].title,
            image: createdProducts[21].images[0],
            price: 5499,
            qty: 2,
            seller: seller1._id,
          },
        ],
        shippingAddress: {
          fullName: buyer3.name,
          phone: buyer3.phone,
          street: buyer3.address.street,
          city: buyer3.address.city,
          state: buyer3.address.state,
          postalCode: buyer3.address.postalCode,
          country: buyer3.address.country,
        },
        paymentMethod: 'UPI',
        itemsPrice: 10998,
        shippingPrice: 0,
        taxPrice: 1979.64,
        discountAmount: 1099.8,
        totalPrice: 11877.84,
        isPaid: true,
        paidAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
        status: 'Delivered',
        deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },

      // 6. Cancelled Order (Priya Nambiar)
      {
        user: buyer3._id,
        orderItems: [
          {
            product: createdProducts[10]._id, // Denim
            title: createdProducts[10].title,
            image: createdProducts[10].images[0],
            price: 12999,
            qty: 1,
            seller: seller1._id,
          },
        ],
        shippingAddress: {
          fullName: buyer3.name,
          phone: buyer3.phone,
          street: buyer3.address.street,
          city: buyer3.address.city,
          state: buyer3.address.state,
          postalCode: buyer3.address.postalCode,
          country: buyer3.address.country,
        },
        paymentMethod: 'Cash on Delivery',
        itemsPrice: 12999,
        shippingPrice: 0,
        taxPrice: 2339.82,
        discountAmount: 0,
        totalPrice: 15338.82,
        isPaid: false,
        status: 'Cancelled',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ];

    const createdOrders = await Order.insertMany(ordersData);
    console.log(`✅ Seeded ${createdOrders.length} customer orders across various fulfillment states.`);

    // =========================================================================
    // 6. SEED NOTIFICATIONS (System announcements, Orders, Seller Approvals)
    // =========================================================================
    console.log('🔔 Seeding platform and user notifications...');

    const notificationsData = [
      {
        title: '🎉 Welcome to Shoply Marketplace 2026',
        message: 'Explore our newly curated luxury collections across Horology, Acoustics, Workstation tech, and Bespoke Tailoring.',
        type: 'announcement',
        priority: 'normal',
        targetAudience: 'all',
        link: '/shop',
        sentBy: adminUser._id,
        isActive: true,
      },
      {
        title: '⚡ SHOPLY MEGA SALE 2026 Is Live!',
        message: 'Enjoy up to 70% instant discounts plus an extra 20% off at checkout using coupon code MEGASALE.',
        type: 'offer',
        priority: 'high',
        targetAudience: 'buyers',
        link: '/offers',
        sentBy: adminUser._id,
        isActive: true,
      },
      {
        title: '🛍️ New Order Received (#ORD-29298)',
        message: 'Sophia Patel purchased Shoply Chronograph Noir Heritage and Vault Titanium Slim Wallet totaling ₹32,071.',
        type: 'order',
        priority: 'high',
        targetAudience: 'user',
        recipient: seller1._id,
        link: '/seller/orders',
        sentBy: adminUser._id,
        isActive: true,
      },
      {
        title: '🛍️ New Order Received (#ORD-22498)',
        message: 'Arjun Kapoor purchased Luminary Mechanical Gasket Keyboard & CyberViper Gaming Mouse totaling ₹24,547.',
        type: 'order',
        priority: 'high',
        targetAudience: 'user',
        recipient: seller2._id,
        link: '/seller/orders',
        sentBy: adminUser._id,
        isActive: true,
      },
      {
        title: '📦 Order Dispatched & Tracking Live',
        message: 'Your order for Aura ANC Studio Wireless Headphones has been handed over to courier dispatch.',
        type: 'order',
        priority: 'normal',
        targetAudience: 'user',
        recipient: buyer1._id,
        link: '/orders',
        sentBy: adminUser._id,
        isActive: true,
      },
      {
        title: '🛡️ Seller KYC Verification Approved',
        message: 'Your merchant account "Apex Tech & Audio Lab" has been officially verified by Shoply administration.',
        type: 'system',
        priority: 'high',
        targetAudience: 'user',
        recipient: seller2._id,
        link: '/seller',
        sentBy: adminUser._id,
        isActive: true,
      },
      {
        title: '⏳ New Seller Application Pending Approval',
        message: 'Amit Sharma has submitted an application for "Aura Tech & Studio". Review KYC documents on the admin console.',
        type: 'alert',
        priority: 'high',
        targetAudience: 'user',
        recipient: adminUser._id,
        link: '/admin/sellers',
        sentBy: adminUser._id,
        isActive: true,
      },
    ];

    const createdNotifications = await Notification.insertMany(notificationsData);
    console.log(`✅ Seeded ${createdNotifications.length} in-app notifications.`);

    // =========================================================================
    // 7. SEED MESSAGES (Customer Inquiries, Partner Requests)
    // =========================================================================
    console.log('💬 Seeding contact messages...');

    const messagesData = [
      {
        name: 'Jordan Belfort',
        email: 'jordan@invest.com',
        subject: 'Wholesale partnership inquiry for Shoply watches',
        message: 'Hello Shoply team, I represent a boutique retail syndicate in Mumbai and Delhi. We are interested in stocking your Chronograph line in 4 of our flagship showrooms. Please connect with wholesale catalog sheets.',
        status: 'unread',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      },
      {
        name: 'Ananya Deshmukh',
        email: 'ananya.d@gmail.com',
        subject: 'Bulk corporate gifting for Diwali festival',
        message: 'We are looking to order 50 units of the Nordic Ceramic Pour-Over Sets and 50 AromaVessel diffusers for our annual executive client hampers. Please share institutional pricing.',
        status: 'unread',
        createdAt: new Date(Date.now() - 18 * 60 * 60 * 1000),
      },
      {
        name: 'Devraj Mukherjee',
        email: 'devraj@soundcraft.in',
        subject: 'Seller onboarding query regarding audio licensing',
        message: 'We are official distributors for several British acoustic components. Could you clarify the KYC document requirements for registered enterprise sellers?',
        status: 'read',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        name: 'Kavita Joshi',
        email: 'kavita.j@outlook.com',
        subject: 'Custom engraving inquiry for Chronograph Diver',
        message: 'Can I request custom laser caseback engraving for an anniversary gift? Happy to pay standard customization surcharge.',
        status: 'resolved',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ];

    const createdMessages = await Message.insertMany(messagesData);
    console.log(`✅ Seeded ${createdMessages.length} contact messages.`);

    console.log('\n========================================================');
    console.log('🎉 COMPLETE DATABASE SEEDING FINISHED SUCCESSFULLY!');
    console.log('========================================================');
    console.log('📊 Summary:');
    console.log(`- Users:         ${[adminUser, seller1, seller2, pendingSeller, rejectedSeller, buyer1, buyer2, buyer3].length}`);
    console.log(`- Payouts:       4 seller bank accounts (AES-256-GCM encrypted)`);
    console.log(`- Products:      ${createdProducts.length}`);
    console.log(`- Coupons:       ${createdCoupons.length}`);
    console.log(`- Promotions:    1 active Mega Sale campaign`);
    console.log(`- Orders:        ${createdOrders.length}`);
    console.log(`- Notifications: ${createdNotifications.length}`);
    console.log(`- Messages:      ${createdMessages.length}`);
    console.log('========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`❌ Error during database seed: ${error.message}`);
    process.exit(1);
  }
};

seedData();
