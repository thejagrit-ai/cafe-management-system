/**
 * Repoints product and category images at the assets bundled with the client.
 *
 * The original seed pointed every image at images.unsplash.com. Several of
 * those photo IDs have since been removed or throttled, so the storefront
 * rendered broken tiles for items whose rows were written before the seed was
 * fixed. Reseeding is not an option once a café has real orders, so this
 * script rewrites only the image column, matching each row by name.
 *
 * Run with: npm run db:repair-images --workspace=server
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORY_IMAGES: Record<string, string> = {
  'hot coffee': '/assets/categories/hot-coffee.jpg',
  'cold coffee & brews': '/assets/categories/cold-coffee.jpg',
  'pure espresso': '/assets/categories/espresso.jpg',
  'artisan tea & matcha': '/assets/categories/tea.jpg',
  'bakery & pastries': '/assets/categories/pastries.jpg',
  'gourmet sandwiches': '/assets/categories/sandwiches.jpg',
  'fresh smoothies': '/assets/categories/smoothies.jpg',
  'chef specials': '/assets/categories/specials.jpg',
};

const PRODUCT_IMAGES: Record<string, string> = {
  'artisan latte art': '/assets/products/vanilla-latte.jpg',
  'classic velvet cappuccino': '/assets/products/classic-cappuccino.jpg',
  'madagascar vanilla latte': '/assets/products/caramel-macchiato.jpg',
  'belgian dark mocha': '/assets/products/mocha-delight.jpg',
  '24-hour signature cold brew': '/assets/products/cold-brew.jpg',
  'iced salted caramel macchiato': '/assets/products/iced-caramel-latte.jpg',
  'nitro cold brew float': '/assets/products/maple-pecan-cold-brew.jpg',
  'single-origin double espresso': '/assets/products/double-espresso.jpg',
  'espresso cortado': '/assets/products/espresso-macchiato.jpg',
  'espresso romano': '/assets/products/single-espresso.jpg',
  'ceremonial matcha latte': '/assets/products/green-tea-latte.jpg',
  'spiced masala chai latte': '/assets/products/chai-tea-latte.jpg',
  'earl grey reserve tea': '/assets/products/english-breakfast-tea.jpg',
  'french butter croissant': '/assets/products/butter-croissant.jpg',
  'blueberry almond muffin': '/assets/products/blueberry-muffin.jpg',
  'double chocolate fudge cookie': '/assets/products/chocolate-chip-cookie.jpg',
  'artisan avocado sourdough toast': '/assets/products/avocado-toast.jpg',
  'smoked turkey & bacon panini': '/assets/products/turkey-club-sandwich.jpg',
  'caprese pesto baguette': '/assets/products/turkey-club-sandwich.jpg',
  'acai berry power smoothie': '/assets/products/strawberry-banana-smoothie.jpg',
  'tropical mango passion bowl': '/assets/products/mango-tropical-smoothie.jpg',
  'seasonal spiced pumpkin latte': '/assets/products/pumpkin-spice-latte.jpg',
  'geisha reserve v60 pour-over': '/assets/products/americano.jpg',
};

/**
 * Keyword fallback for rows the café renamed or added by hand, so a product
 * called "Vanilla Latte Grande" still gets a picture instead of a grey tile.
 */
const KEYWORD_IMAGES: Array<[RegExp, string]> = [
  [/cold ?brew|nitro/i, '/assets/products/cold-brew.jpg'],
  [/iced.*(mocha)/i, '/assets/products/iced-mocha.jpg'],
  [/iced.*(caramel|latte)/i, '/assets/products/iced-caramel-latte.jpg'],
  [/iced|frapp/i, '/assets/products/iced-coffee.jpg'],
  [/cappuccino/i, '/assets/products/classic-cappuccino.jpg'],
  [/macchiato/i, '/assets/products/espresso-macchiato.jpg'],
  [/mocha/i, '/assets/products/mocha-delight.jpg'],
  [/matcha|green tea/i, '/assets/products/green-tea-latte.jpg'],
  [/chai/i, '/assets/products/chai-tea-latte.jpg'],
  [/tea/i, '/assets/products/english-breakfast-tea.jpg'],
  [/espresso|ristretto|cortado/i, '/assets/products/double-espresso.jpg'],
  [/americano|pour.?over|filter|drip/i, '/assets/products/americano.jpg'],
  [/latte/i, '/assets/products/vanilla-latte.jpg'],
  [/croissant/i, '/assets/products/butter-croissant.jpg'],
  [/muffin/i, '/assets/products/blueberry-muffin.jpg'],
  [/cookie|brownie/i, '/assets/products/chocolate-chip-cookie.jpg'],
  [/avocado|toast/i, '/assets/products/avocado-toast.jpg'],
  [/sandwich|panini|baguette|club|wrap/i, '/assets/products/turkey-club-sandwich.jpg'],
  [/mango|tropical/i, '/assets/products/mango-tropical-smoothie.jpg'],
  [/smoothie|berry|acai/i, '/assets/products/strawberry-banana-smoothie.jpg'],
  [/pumpkin|spice/i, '/assets/products/pumpkin-spice-latte.jpg'],
];

/** True for the image values this script is allowed to overwrite. */
function needsRepair(url: string | null): boolean {
  if (!url) return true;
  if (url.startsWith('/assets/')) return false;
  // Never clobber an image the café uploaded or pasted itself.
  if (url.startsWith('data:')) return false;
  return url.includes('images.unsplash.com');
}

function pickProductImage(name: string): string | null {
  const exact = PRODUCT_IMAGES[name.trim().toLowerCase()];
  if (exact) return exact;
  for (const [pattern, url] of KEYWORD_IMAGES) {
    if (pattern.test(name)) return url;
  }
  return null;
}

async function main() {
  let categoriesFixed = 0;
  let productsFixed = 0;
  const skipped: string[] = [];

  for (const category of await prisma.category.findMany()) {
    if (!needsRepair(category.imageUrl)) continue;
    const url = CATEGORY_IMAGES[category.name.trim().toLowerCase()];
    if (!url) {
      skipped.push(`category "${category.name}"`);
      continue;
    }
    await prisma.category.update({ where: { id: category.id }, data: { imageUrl: url } });
    categoriesFixed++;
  }

  for (const product of await prisma.product.findMany()) {
    if (!needsRepair(product.imageUrl)) continue;
    const url = pickProductImage(product.name);
    if (!url) {
      skipped.push(`product "${product.name}"`);
      continue;
    }
    await prisma.product.update({ where: { id: product.id }, data: { imageUrl: url } });
    productsFixed++;
  }

  console.log(`✓ ${categoriesFixed} category images repointed at bundled assets`);
  console.log(`✓ ${productsFixed} product images repointed at bundled assets`);
  if (skipped.length > 0) {
    console.log(`• ${skipped.length} row(s) left untouched — no matching asset:`);
    skipped.forEach((s) => console.log(`    ${s}`));
    console.log('  Set an image for these from Admin → Productos → Editar.');
  }
}

main()
  .catch((error) => {
    console.error('Image repair failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
