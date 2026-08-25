import {
  PrismaClient,
  Role,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  InventoryTransactionType,
} from '@prisma/client';
import { hashPassword } from '../src/utils/helpers';

const prisma = new PrismaClient();

async function clean() {
  // Delete in dependency order so re-running the seed is safe.
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.inventoryTransaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.address.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.businessSettings.deleteMany();
  await prisma.auditLog.deleteMany();
}

/**
 * Whether this database already holds real content.
 *
 * `clean()` truncates every table, and the Render build command runs this
 * seed on every deploy - so each push to main was erasing the cafe's live
 * orders, customers, payments and audit history and replacing them with demo
 * rows. A database that already has data is now left alone unless the
 * operator explicitly asks for a reset with SEED_FORCE=true.
 */
async function alreadyPopulated(): Promise<boolean> {
  const [users, products, orders] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
  ]);
  return users > 0 || products > 0 || orders > 0;
}

async function main() {
  const force = process.env.SEED_FORCE === 'true';

  if (!force && (await alreadyPopulated())) {
    console.log('Database already contains data - seed skipped (nothing was deleted).');
    console.log('Re-run with SEED_FORCE=true to wipe it and reseed from scratch.');
    return;
  }

  if (force) {
    console.log('SEED_FORCE=true - erasing all existing data before reseeding.');
  }

  console.log('Seeding database...');

  await clean();

  // The demo accounts below are created directly rather than registered, so
  // their addresses need no confirmation and they skip the verification prompt.
  const adminPasswordHash = await hashPassword('admin123');
  const staffPasswordHash = await hashPassword('staff123');
  const customerPasswordHash = await hashPassword('customer123');

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@cafe.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      emailVerified: true,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@cafe.com',
      passwordHash: staffPasswordHash,
      role: Role.STAFF,
      emailVerified: true,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@cafe.com',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
      emailVerified: true,
    },
  });

  const employee = await prisma.employee.create({
    data: {
      userId: staffUser.id,
      firstName: 'Mateo',
      lastName: 'Gómez',
      phone: '+1 (555) 234-5678',
    },
  });

  const customer = await prisma.customer.create({
    data: {
      userId: customerUser.id,
      firstName: 'Valentina',
      lastName: 'Herrera',
      phone: '+1 (555) 876-5432',
    },
  });

  const address = await prisma.address.create({
    data: {
      customerId: customer.id,
      label: 'Casa',
      street: 'Calle 93 # 12-45, Apt 502',
      city: 'Bogotá',
      state: 'Cundinamarca',
      postalCode: '110221',
      country: 'Colombia',
      isDefault: true,
    },
  });

  console.log(`✓ Core users created (admin=${adminUser.email}, staff=${staffUser.email}, customer=${customerUser.email})`);

  // -------------------------------------------------------------
  // 1. Categories with Real High-Def Photography
  // -------------------------------------------------------------
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Hot Coffee',
        description: 'Artisan freshly brewed espresso & steamed milk creations',
        sortOrder: 1,
        imageUrl: '/assets/categories/hot-coffee.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Cold Coffee & Brews',
        description: 'Slow-steeped cold brews, iced lattes & refreshing blends',
        sortOrder: 2,
        imageUrl: '/assets/categories/cold-coffee.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Pure Espresso',
        description: 'Single-origin double shots, macchiatos & ristrettos',
        sortOrder: 3,
        imageUrl: '/assets/categories/espresso.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Artisan Tea & Matcha',
        description: 'Ceremonial grade matcha, chai spice & organic infusions',
        sortOrder: 4,
        imageUrl: '/assets/categories/tea.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Bakery & Pastries',
        description: 'Freshly baked French butter croissants, muffins & tarts',
        sortOrder: 5,
        imageUrl: '/assets/categories/pastries.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Gourmet Sandwiches',
        description: 'Artisan sourdough paninis, avocado toast & baguettes',
        sortOrder: 6,
        imageUrl: '/assets/categories/sandwiches.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Fresh Smoothies',
        description: '100% natural organic fruit & superfood smoothie bowls',
        sortOrder: 7,
        imageUrl: '/assets/categories/smoothies.jpg',
      },
    }),
    prisma.category.create({
      data: {
        name: 'Chef Specials',
        description: 'Seasonal specials, pour-overs & signature roastery drinks',
        sortOrder: 8,
        imageUrl: '/assets/categories/specials.jpg',
      },
    }),
  ]);

  console.log(`✓ 8 Categories created`);

  // -------------------------------------------------------------
  // 2. Suppliers
  // -------------------------------------------------------------
  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: 'Andean Origin Coffee Roasters',
        contactName: 'Carlos Restrepo',
        email: 'carlos@andeanroasters.com',
        phone: '+57 (310) 456-7890',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Valley Organics Dairy & Milk',
        contactName: 'Sofia Mendez',
        email: 'sofia@valleyorganics.com',
        phone: '+57 (315) 678-1234',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Artisan Bakery Supplies',
        contactName: 'Lucia Dupont',
        email: 'lucia@artisanbakery.com',
        phone: '+57 (300) 890-5678',
      },
    }),
    prisma.supplier.create({
      data: {
        name: 'Tropical Farms Produce',
        contactName: 'Esteban Morales',
        email: 'esteban@tropicalfarms.com',
        phone: '+57 (320) 123-9876',
      },
    }),
  ]);

  console.log(`✓ 4 Suppliers created`);

  // -------------------------------------------------------------
  // 3. Ingredients & Inventory
  // -------------------------------------------------------------
  const ingredients = await Promise.all([
    prisma.ingredient.create({ data: { name: 'Specialty Arabica Beans (Huila)', sku: 'ING-CB001', unit: 'grams', currentStock: 8500, minStock: 2000, maxStock: 15000, costPerUnit: 0.045, supplierId: suppliers[0].id } }),
    prisma.ingredient.create({ data: { name: 'Dark Roast Espresso Beans', sku: 'ING-CB002', unit: 'grams', currentStock: 6200, minStock: 1500, maxStock: 12000, costPerUnit: 0.038, supplierId: suppliers[0].id } }),
    prisma.ingredient.create({ data: { name: 'Fresh Whole Milk', sku: 'ING-ML001', unit: 'milliliters', currentStock: 18000, minStock: 3000, maxStock: 25000, costPerUnit: 0.0025, supplierId: suppliers[1].id } }),
    prisma.ingredient.create({ data: { name: 'Barista Oat Milk', sku: 'ING-ML002', unit: 'milliliters', currentStock: 9500, minStock: 2000, maxStock: 15000, costPerUnit: 0.0045, supplierId: suppliers[1].id } }),
    prisma.ingredient.create({ data: { name: 'Organic Almond Milk', sku: 'ING-ML003', unit: 'milliliters', currentStock: 6000, minStock: 1500, maxStock: 10000, costPerUnit: 0.005, supplierId: suppliers[1].id } }),
    prisma.ingredient.create({ data: { name: 'Madagascar Vanilla Syrup', sku: 'ING-SY001', unit: 'milliliters', currentStock: 2800, minStock: 500, maxStock: 5000, costPerUnit: 0.012, supplierId: suppliers[2].id } }),
    prisma.ingredient.create({ data: { name: 'Salted Caramel Syrup', sku: 'ING-SY002', unit: 'milliliters', currentStock: 2400, minStock: 500, maxStock: 5000, costPerUnit: 0.013, supplierId: suppliers[2].id } }),
    prisma.ingredient.create({ data: { name: 'Belgian Dark Chocolate Sauce', sku: 'ING-SY003', unit: 'milliliters', currentStock: 2000, minStock: 400, maxStock: 4000, costPerUnit: 0.015, supplierId: suppliers[2].id } }),
    prisma.ingredient.create({ data: { name: 'Japanese Matcha Uji Grade', sku: 'ING-TEA01', unit: 'grams', currentStock: 1200, minStock: 300, maxStock: 2000, costPerUnit: 0.085, supplierId: suppliers[2].id } }),
    prisma.ingredient.create({ data: { name: 'Masala Spiced Chai Blend', sku: 'ING-TEA02', unit: 'grams', currentStock: 1400, minStock: 300, maxStock: 2500, costPerUnit: 0.065, supplierId: suppliers[2].id } }),
    prisma.ingredient.create({ data: { name: 'Butter Croissant Dough', sku: 'ING-BK001', unit: 'pieces', currentStock: 65, minStock: 20, maxStock: 100, costPerUnit: 0.85, supplierId: suppliers[2].id } }),
    prisma.ingredient.create({ data: { name: 'Sourdough Artisan Loaves', sku: 'ING-BK002', unit: 'pieces', currentStock: 40, minStock: 15, maxStock: 60, costPerUnit: 1.20, supplierId: suppliers[2].id } }),
    prisma.ingredient.create({ data: { name: 'Organic Fresh Avocados', sku: 'ING-PR001', unit: 'pieces', currentStock: 45, minStock: 15, maxStock: 80, costPerUnit: 0.75, supplierId: suppliers[3].id } }),
    prisma.ingredient.create({ data: { name: 'Smoked Turkey Breast Slices', sku: 'ING-PR002', unit: 'grams', currentStock: 2500, minStock: 500, maxStock: 4000, costPerUnit: 0.018, supplierId: suppliers[3].id } }),
    prisma.ingredient.create({ data: { name: 'Organic Strawberries', sku: 'ING-PR003', unit: 'grams', currentStock: 3200, minStock: 800, maxStock: 5000, costPerUnit: 0.014, supplierId: suppliers[3].id } }),
    prisma.ingredient.create({ data: { name: 'Fresh Mangoes & Passionfruit', sku: 'ING-PR004', unit: 'grams', currentStock: 2800, minStock: 600, maxStock: 4500, costPerUnit: 0.012, supplierId: suppliers[3].id } }),
  ]);

  console.log(`✓ 16 Core ingredients created`);

  // -------------------------------------------------------------
  // 4. Products with Real Dish Photos
  // -------------------------------------------------------------
  const products = await Promise.all([
    // Hot Coffee
    prisma.product.create({
      data: {
        name: 'Artisan Latte Art',
        description: 'Double espresso poured over velvety steamed microfoam milk with silky finish.',
        price: 4.75,
        categoryId: categories[0].id,
        imageUrl: '/assets/products/vanilla-latte.jpg',
        isFeatured: true,
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Classic Velvet Cappuccino',
        description: 'Rich dark roast espresso layered with equal parts steamed milk and airy milk foam dusted with cocoa.',
        price: 4.50,
        categoryId: categories[0].id,
        imageUrl: '/assets/products/classic-cappuccino.jpg',
        isFeatured: true,
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Madagascar Vanilla Latte',
        description: 'Smooth double espresso infused with pure Madagascar vanilla extract and steamed whole milk.',
        price: 5.25,
        categoryId: categories[0].id,
        imageUrl: '/assets/products/caramel-macchiato.jpg',
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Belgian Dark Mocha',
        description: 'Rich Belgian dark chocolate ganache blended with double espresso and topped with whipped cream.',
        price: 5.75,
        categoryId: categories[0].id,
        imageUrl: '/assets/products/mocha-delight.jpg',
        isFeatured: true,
      },
    }),

    // Cold Coffee
    prisma.product.create({
      data: {
        name: '24-Hour Signature Cold Brew',
        description: 'Single-origin Colombian beans slow steeped for 24 hours in mountain spring water over ice.',
        price: 4.95,
        categoryId: categories[1].id,
        imageUrl: '/assets/products/cold-brew.jpg',
        isFeatured: true,
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Iced Salted Caramel Macchiato',
        description: 'Layered iced milk, rich vanilla, double espresso float and house salted caramel drizzle.',
        price: 5.50,
        categoryId: categories[1].id,
        imageUrl: '/assets/products/iced-caramel-latte.jpg',
        isFeatured: true,
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Nitro Cold Brew Float',
        description: 'Nitrogen-infused velvety cold brew served cold on tap with sweet vanilla cream.',
        price: 5.95,
        categoryId: categories[1].id,
        imageUrl: '/assets/products/maple-pecan-cold-brew.jpg',
      },
    }),

    // Pure Espresso
    prisma.product.create({
      data: {
        name: 'Single-Origin Double Espresso',
        description: 'Double ristretto shot extracted at 9 bars of pressure with thick hazelnut crema.',
        price: 3.50,
        categoryId: categories[2].id,
        imageUrl: '/assets/products/double-espresso.jpg',
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Espresso Cortado',
        description: 'Equal parts bold espresso cut with warm steamed milk to reduce acidity.',
        price: 3.95,
        categoryId: categories[2].id,
        imageUrl: '/assets/products/espresso-macchiato.jpg',
        isFeatured: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Espresso Romano',
        description: 'Intense espresso served with a twist of fresh candied lemon peel.',
        price: 3.75,
        categoryId: categories[2].id,
        imageUrl: '/assets/products/single-espresso.jpg',
      },
    }),

    // Tea & Matcha
    prisma.product.create({
      data: {
        name: 'Ceremonial Matcha Latte',
        description: 'First-harvest Japanese Uji matcha whisked with warm oat milk and organic agave.',
        price: 5.50,
        categoryId: categories[3].id,
        imageUrl: '/assets/products/green-tea-latte.jpg',
        isFeatured: true,
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Spiced Masala Chai Latte',
        description: 'Slow-simmered cinnamon, cardamom, ginger, and black tea with steamed milk.',
        price: 5.00,
        categoryId: categories[3].id,
        imageUrl: '/assets/products/chai-tea-latte.jpg',
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Earl Grey Reserve Tea',
        description: 'Fragrant bergamot black tea infusion served with organic honey and lemon.',
        price: 4.00,
        categoryId: categories[3].id,
        imageUrl: '/assets/products/english-breakfast-tea.jpg',
      },
    }),

    // Pastries & Bakery
    prisma.product.create({
      data: {
        name: 'French Butter Croissant',
        description: 'Freshly baked flaky all-butter croissant with honeycomb interior and golden crust.',
        price: 3.95,
        categoryId: categories[4].id,
        imageUrl: '/assets/products/butter-croissant.jpg',
        isFeatured: true,
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Blueberry Almond Muffin',
        description: 'Moist vanilla bakery muffin loaded with wild blueberries and sliced roasted almonds.',
        price: 4.25,
        categoryId: categories[4].id,
        imageUrl: '/assets/products/blueberry-muffin.jpg',
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Double Chocolate Fudge Cookie',
        description: 'Warm, chewy soft-baked cookie with chunks of melted dark and milk chocolate.',
        price: 3.25,
        categoryId: categories[4].id,
        imageUrl: '/assets/products/chocolate-chip-cookie.jpg',
      },
    }),

    // Sandwiches
    prisma.product.create({
      data: {
        name: 'Artisan Avocado Sourdough Toast',
        description: 'Crushed ripe avocado, cherry tomatoes, micro-greens, chili flakes on toasted sourdough.',
        price: 7.95,
        categoryId: categories[5].id,
        imageUrl: '/assets/products/avocado-toast.jpg',
        isFeatured: true,
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Smoked Turkey & Bacon Panini',
        description: 'Thinly sliced smoked turkey, crispy bacon, aged provolone, pesto on pressed ciabatta.',
        price: 9.50,
        categoryId: categories[5].id,
        imageUrl: '/assets/products/turkey-club-sandwich.jpg',
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Caprese Pesto Baguette',
        description: 'Fresh buffalo mozzarella, heirloom tomatoes, fresh basil and balsamic reduction glaze.',
        price: 8.50,
        categoryId: categories[5].id,
        imageUrl: '/assets/products/turkey-club-sandwich.jpg',
      },
    }),

    // Smoothies
    prisma.product.create({
      data: {
        name: 'Acai Berry Power Smoothie',
        description: 'Organic Amazon acai, fresh strawberries, wild blueberries, banana and almond milk.',
        price: 6.50,
        categoryId: categories[6].id,
        imageUrl: '/assets/products/strawberry-banana-smoothie.jpg',
        isFeatured: true,
        isPopular: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Tropical Mango Passion Bowl',
        description: 'Golden mango, passionfruit puree, coconut milk, topped with chia seeds and granola.',
        price: 6.75,
        categoryId: categories[6].id,
        imageUrl: '/assets/products/mango-tropical-smoothie.jpg',
      },
    }),

    // Specials
    prisma.product.create({
      data: {
        name: 'Seasonal Spiced Pumpkin Latte',
        description: 'Real pumpkin puree, autumn spices, espresso, warm milk and cinnamon stick.',
        price: 6.25,
        categoryId: categories[7].id,
        imageUrl: '/assets/products/pumpkin-spice-latte.jpg',
        isFeatured: true,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Geisha Reserve V60 Pour-Over',
        description: 'Single-estate Panama Geisha coffee hand-brewed with floral jasmine notes and bergamot.',
        price: 7.50,
        categoryId: categories[7].id,
        imageUrl: '/assets/products/americano.jpg',
        isFeatured: true,
      },
    }),
  ]);

  console.log(`✓ 23 Gourmet products created with HD real photos`);

  // -------------------------------------------------------------
  // 5. Recipes & Ingredient Linking
  // -------------------------------------------------------------
  const recipes = await Promise.all([
    prisma.recipe.create({ data: { productId: products[0].id, instructions: 'Pull 18g double espresso, steam whole milk to 150°F with silky microfoam, pour latte art rosette', prepTime: 1, cookTime: 2, servings: 1 } }),
    prisma.recipe.create({ data: { productId: products[1].id, instructions: 'Pull 18g double espresso into ceramic cup, steam milk with thick foam, dust with Dutch cocoa', prepTime: 1, cookTime: 2, servings: 1 } }),
    prisma.recipe.create({ data: { productId: products[2].id, instructions: 'Add 15ml Madagascar vanilla syrup, pull double espresso, steam milk, blend smoothly', prepTime: 1, cookTime: 2, servings: 1 } }),
    prisma.recipe.create({ data: { productId: products[3].id, instructions: 'Melt 20ml dark chocolate, extract double espresso, steam milk, top with cream', prepTime: 2, cookTime: 2, servings: 1 } }),
    prisma.recipe.create({ data: { productId: products[4].id, instructions: 'Pour 24h cold-steeped concentrate over crystal ice sphere, serve in chilled glass', prepTime: 1, cookTime: 0, servings: 1 } }),
    prisma.recipe.create({ data: { productId: products[5].id, instructions: 'Layer ice and milk, pour double espresso float on top, finish with salted caramel drizzle', prepTime: 2, cookTime: 1, servings: 1 } }),
    prisma.recipe.create({ data: { productId: products[7].id, instructions: 'Dose 18g specialty roast, extract 36g in 28 seconds at 9 bar pressure', prepTime: 1, cookTime: 1, servings: 1 } }),
    prisma.recipe.create({ data: { productId: products[10].id, instructions: 'Whisk 3g ceremonial matcha with 80°C water, steam oat milk, pour smoothly', prepTime: 2, cookTime: 2, servings: 1 } }),
    prisma.recipe.create({ data: { productId: products[13].id, instructions: 'Bake pre-proofed butter croissant at 190°C for 14 minutes until deep golden brown', prepTime: 2, cookTime: 14, servings: 1 } }),
    prisma.recipe.create({ data: { productId: products[16].id, instructions: 'Toast thick sourdough slice, smash 1 avocado with lime and sea salt, garnish with micro-greens', prepTime: 3, cookTime: 2, servings: 1 } }),
  ]);

  const recipeIngredients = [
    { recipeId: recipes[0].id, ingredientId: ingredients[0].id, quantity: 18, unit: 'grams' },
    { recipeId: recipes[0].id, ingredientId: ingredients[2].id, quantity: 200, unit: 'milliliters' },
    { recipeId: recipes[1].id, ingredientId: ingredients[1].id, quantity: 18, unit: 'grams' },
    { recipeId: recipes[1].id, ingredientId: ingredients[2].id, quantity: 150, unit: 'milliliters' },
    { recipeId: recipes[2].id, ingredientId: ingredients[0].id, quantity: 18, unit: 'grams' },
    { recipeId: recipes[2].id, ingredientId: ingredients[5].id, quantity: 15, unit: 'milliliters' },
    { recipeId: recipes[2].id, ingredientId: ingredients[2].id, quantity: 200, unit: 'milliliters' },
    { recipeId: recipes[3].id, ingredientId: ingredients[1].id, quantity: 18, unit: 'grams' },
    { recipeId: recipes[3].id, ingredientId: ingredients[7].id, quantity: 20, unit: 'milliliters' },
    { recipeId: recipes[4].id, ingredientId: ingredients[0].id, quantity: 25, unit: 'grams' },
    { recipeId: recipes[5].id, ingredientId: ingredients[1].id, quantity: 18, unit: 'grams' },
    { recipeId: recipes[5].id, ingredientId: ingredients[6].id, quantity: 15, unit: 'milliliters' },
    { recipeId: recipes[6].id, ingredientId: ingredients[0].id, quantity: 18, unit: 'grams' },
    { recipeId: recipes[7].id, ingredientId: ingredients[8].id, quantity: 3, unit: 'grams' },
    { recipeId: recipes[7].id, ingredientId: ingredients[3].id, quantity: 200, unit: 'milliliters' },
    { recipeId: recipes[8].id, ingredientId: ingredients[10].id, quantity: 1, unit: 'pieces' },
    { recipeId: recipes[9].id, ingredientId: ingredients[11].id, quantity: 1, unit: 'pieces' },
    { recipeId: recipes[9].id, ingredientId: ingredients[12].id, quantity: 1, unit: 'pieces' },
  ];

  await prisma.recipeIngredient.createMany({ data: recipeIngredients });
  console.log(`✓ Recipe ingredients connected for automatic deduction`);

  // -------------------------------------------------------------
  // 6. Business Settings
  // -------------------------------------------------------------
  await prisma.businessSettings.create({
    data: {
      taxRate: 8,
      currency: 'USD',
      deliveryFee: 4.50,
      allowOutOfStockOrders: false,
      openingTime: '07:00',
      closingTime: '21:00',
    },
  });

  console.log(`✓ Business settings initialized`);

  // -------------------------------------------------------------
  // 7. Extra Customers & Trading History (Past 30 Days)
  // -------------------------------------------------------------
  const extraCustomerSpecs = [
    { first: 'Sofia', last: 'Ramirez', phone: '+1 (555) 301-4455' },
    { first: 'Julian', last: 'Navarro', phone: '+1 (555) 302-8877' },
    { first: 'Camila', last: 'Torres', phone: '+1 (555) 303-9911' },
    { first: 'Santiago', last: 'Mora', phone: '+1 (555) 304-1234' },
    { first: 'Isabella', last: 'Castillo', phone: '+1 (555) 305-6789' },
    { first: 'Mateo', last: 'Silva', phone: '+1 (555) 306-4321' },
  ];

  const sharedCustomerHash = await hashPassword('customer123');
  const extraCustomers = [];
  for (const spec of extraCustomerSpecs) {
    const u = await prisma.user.create({
      data: {
        email: `${spec.first.toLowerCase()}.${spec.last.toLowerCase()}@example.com`,
        passwordHash: sharedCustomerHash,
        role: Role.CUSTOMER,
        emailVerified: true,
      },
    });
    extraCustomers.push(
      await prisma.customer.create({
        data: {
          userId: u.id,
          firstName: spec.first,
          lastName: spec.last,
          phone: spec.phone,
        },
      })
    );
  }

  const allCustomers = [customer, ...extraCustomers];

  let randomState = 20240514;
  const random = () => {
    randomState = (randomState * 1664525 + 1013904223) % 4294967296;
    return randomState / 4294967296;
  };
  const pick = <T,>(list: T[]): T => list[Math.floor(random() * list.length)];
  const between = (min: number, max: number) => min + Math.floor(random() * (max - min + 1));

  const DAYS_OF_HISTORY = 30;
  const taxRate = 8;
  const deliveryFeeAmount = 4.50;
  const round2 = (value: number) => Math.round(value * 100) / 100;

  const orderTypes = [OrderType.DINE_IN, OrderType.PICKUP, OrderType.DELIVERY];
  const paymentMethods = [PaymentMethod.CARD, PaymentMethod.ONLINE, PaymentMethod.CASH];

  let orderSequence = 0;
  let historyOrders = 0;

  for (let daysAgo = DAYS_OF_HISTORY; daysAgo >= 0; daysAgo--) {
    const day = new Date();
    day.setDate(day.getDate() - daysAgo);
    day.setHours(0, 0, 0, 0);

    const weekday = day.getDay();
    const weekendBoost = weekday === 0 || weekday === 6 ? 1.4 : 1;
    const ordersToday = Math.max(2, Math.round(between(4, 8) * weekendBoost));

    for (let n = 0; n < ordersToday; n++) {
      const placedAt = new Date(day);
      const hour = random() < 0.6 ? between(7, 12) : between(13, 20);
      placedAt.setHours(hour, between(0, 59), between(0, 59), 0);

      const type = pick(orderTypes);
      const lineCount = between(1, 3);
      const chosen = new Map<string, number>();
      for (let i = 0; i < lineCount; i++) {
        const prod = pick(products);
        chosen.set(prod.id, (chosen.get(prod.id) ?? 0) + between(1, 2));
      }

      const items = [...chosen.entries()].map(([productId, quantity]) => {
        const prod = products.find((p) => p.id === productId)!;
        const unitPrice = Number(prod.price);
        return {
          productId,
          quantity,
          unitPrice,
          totalPrice: round2(unitPrice * quantity),
        };
      });

      const subtotal = round2(items.reduce((sum, item) => sum + item.totalPrice, 0));
      const taxAmount = round2(subtotal * (taxRate / 100));
      const deliveryFee = type === OrderType.DELIVERY ? deliveryFeeAmount : 0;
      const total = round2(subtotal + taxAmount + deliveryFee);

      const isToday = daysAgo === 0;
      let status: OrderStatus;
      if (isToday) {
        status = pick([
          OrderStatus.PENDING,
          OrderStatus.CONFIRMED,
          OrderStatus.PREPARING,
          OrderStatus.READY,
          OrderStatus.COMPLETED,
        ]);
      } else {
        status = OrderStatus.COMPLETED;
      }

      const orderCustomer = pick(allCustomers);
      orderSequence++;
      const stamp = `${String(placedAt.getFullYear()).slice(-2)}${String(placedAt.getMonth() + 1).padStart(2, '0')}${String(placedAt.getDate()).padStart(2, '0')}`;

      const created = await prisma.order.create({
        data: {
          orderNumber: `ORD-${stamp}-${String(orderSequence).padStart(4, '0')}`,
          customerId: orderCustomer?.id,
          employeeId: employee.id,
          type,
          status,
          tableNumber: type === OrderType.DINE_IN ? between(1, 14) : undefined,
          addressId: type === OrderType.DELIVERY ? address.id : undefined,
          subtotal,
          taxAmount,
          deliveryFee,
          total,
          createdAt: placedAt,
          confirmedAt: status === OrderStatus.PENDING ? undefined : placedAt,
          completedAt: status === OrderStatus.COMPLETED ? new Date(placedAt.getTime() + 15 * 60_000) : undefined,
          items: { create: items },
        },
      });

      // Payments
      if (status === OrderStatus.COMPLETED || status === OrderStatus.READY || status === OrderStatus.PREPARING) {
        await prisma.payment.create({
          data: {
            orderId: created.id,
            amount: total,
            method: pick(paymentMethods),
            status: PaymentStatus.PAID,
            paidAt: placedAt,
            createdAt: placedAt,
          },
        });
      }
      historyOrders++;
    }
  }

  console.log(`✓ ${historyOrders} Orders & transactions seeded across 30 days`);

  console.log('');
  console.log('✨ Seeding completed successfully!');
  console.log('----------------------------------------------------');
  console.log('Admin Account:    admin@cafe.com    / admin123');
  console.log('Staff Barista:    staff@cafe.com    / staff123');
  console.log('Customer Account: customer@cafe.com / customer123');
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
