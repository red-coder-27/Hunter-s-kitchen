const fs = require('fs');
const path = require('path');

// 1. Parse user prompt
const promptText = fs.readFileSync('scripts/user_menu_prompt.txt', 'utf8');
const lines = promptText.split('\n');

const categoriesDef = [
  {
    id: 'cat_dosa_tiffin',
    name: 'Dosa & Tiffin',
    description: 'Traditional South Indian dosas, roasts, and uthappams',
    icon: '🥞',
    itemCount: 10
  },
  {
    id: 'cat_parotta_kothu',
    name: 'Parottas, Chappathi, Lappa & Kothu',
    description: 'Flaky layered parottas, hand-stretched veechu, stuffed lappa, and sizzling kothu',
    icon: '🫓',
    itemCount: 14
  },
  {
    id: 'cat_chittinadu',
    name: 'Chittinadu Special — Biryani & Gilma',
    description: 'Chittinadu-style aromatic biryanis and special spicy gilma preparations',
    icon: '🥘',
    itemCount: 6
  },
  {
    id: 'cat_hyderabad',
    name: 'Hyderabad Special',
    description: 'Hyderabad-style biryanis and special kadai items',
    icon: '🍲',
    itemCount: 6
  },
  {
    id: 'cat_chicken',
    name: 'Chicken Specials',
    description: 'Spicy chicken chukka, rich gravies, Manchurian, liver fry, and crispy Chicken 65',
    icon: '🍗',
    itemCount: 9
  },
  {
    id: 'cat_beef',
    name: 'Beef Specials',
    description: 'Tender beef chukka, flavorful beef gravy, and deep-fried Beef 65',
    icon: '🥩',
    itemCount: 3
  },
  {
    id: 'cat_egg',
    name: 'Egg Specials',
    description: 'Street-style kalakki, fluffy omelettes, podimas, egg masal, and boiled eggs',
    icon: '🍳',
    itemCount: 7
  },
  {
    id: 'cat_rice',
    name: 'Rice Items',
    description: 'Wok-tossed fried rice specials with chicken, beef, egg, and vegetables',
    icon: '🍚',
    itemCount: 6
  },
  {
    id: 'cat_quail',
    name: 'Quail / Kadai Specials',
    description: 'Country-style Kaadai 65 and spicy Kaadai Pepper Fry preparations',
    icon: '🍖',
    itemCount: 2
  }
];

// Read existing image and metadata mapping from seed-full-menu.ts
const seedContent = fs.readFileSync('scripts/seed-full-menu.ts', 'utf8');
const menuStart = seedContent.indexOf('const menuItems = [');
const menuSlice = seedContent.substring(menuStart);
const arrayEnd = menuSlice.indexOf('];');
const arrayStr = menuSlice.substring('const menuItems = '.length, arrayEnd + 1);
const seedItems = eval(arrayStr);

const promptItems = [];
let currentCatIndex = 0;

for (let line of lines) {
  line = line.trim();
  if (!line) continue;

  const parts = line.split('\t');
  if (parts.length >= 4 && /^\d+$/.test(parts[0].trim())) {
    const num = parseInt(parts[0].trim(), 10);
    const name = parts[1].trim();
    const description = parts[2].trim();
    const priceStr = parts[3].trim().replace(/[^0-9]/g, '');
    const typeStr = parts[4] ? parts[4].trim() : '';
    const isVeg = typeStr.toLowerCase().includes('veg') && !typeStr.toLowerCase().includes('non');
    promptItems.push({
      num,
      name,
      description,
      price: parseInt(priceStr, 10),
      isVeg
    });
  }
}

if (promptItems.length !== 63) {
  console.error(`Expected 63 items, found ${promptItems.length}`);
  process.exit(1);
}

// Build final menu items
const finalMenuItems = promptItems.map((p, idx) => {
  const seed = seedItems[idx] || {};
  
  // Determine category based on item number ranges matching the user's categories:
  // 1-10: Dosa & Tiffin
  // 11-24: Parottas, Chappathi, Lappa & Kothu
  // 25-30: Chittinadu Special — Biryani & Gilma
  // 31-36: Hyderabad Special
  // 37-45: Chicken Specials
  // 46-48: Beef Specials
  // 49-55: Egg Specials
  // 56-61: Rice Items
  // 62-63: Quail / Kadai Specials
  let category = categoriesDef[0];
  if (p.num >= 1 && p.num <= 10) category = categoriesDef[0];
  else if (p.num >= 11 && p.num <= 24) category = categoriesDef[1];
  else if (p.num >= 25 && p.num <= 30) category = categoriesDef[2];
  else if (p.num >= 31 && p.num <= 36) category = categoriesDef[3];
  else if (p.num >= 37 && p.num <= 45) category = categoriesDef[4];
  else if (p.num >= 46 && p.num <= 48) category = categoriesDef[5];
  else if (p.num >= 49 && p.num <= 55) category = categoriesDef[6];
  else if (p.num >= 56 && p.num <= 61) category = categoriesDef[7];
  else if (p.num >= 62 && p.num <= 63) category = categoriesDef[8];

  const prefix = category.id.replace('cat_', '');
  const id = `item_${prefix}_${String(p.num).padStart(2, '0')}`;

  return {
    id,
    name: p.name,
    description: p.description,
    categoryId: category.id,
    categoryName: category.name,
    price: p.price,
    imageUrl: seed.imageUrl || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    isVeg: p.isVeg,
    isAvailable: true,
    prepTimeMinutes: seed.prepTimeMinutes || 15,
    ...(seed.isPopular ? { isPopular: true } : {}),
    ...(seed.isBestseller ? { isBestseller: true } : {}),
    rating: seed.rating || 4.7,
    ratingCount: seed.ratingCount || 50,
    customizations: [],
    addons: []
  };
});

// Update data/database.json
const dbPath = path.join(process.cwd(), 'data', 'database.json');
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

dbData.categories = categoriesDef;
dbData.menuItems = finalMenuItems;

fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
console.log(`✅ Successfully updated ${dbPath}`);
console.log(`   Categories count: ${dbData.categories.length}`);
console.log(`   MenuItems count: ${dbData.menuItems.length}`);

// Print category summary
categoriesDef.forEach(cat => {
  const items = finalMenuItems.filter(i => i.categoryId === cat.id);
  console.log(`   - ${cat.name} (${cat.id}): ${items.length} items`);
});
