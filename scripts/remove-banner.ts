import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src', 'views', 'customer', 'CartView.tsx');
let content = fs.readFileSync(file, 'utf-8');

// 1. Remove Truck from imports
content = content.replace('Truck, ', '');

// 2. Remove neededForFree and freeThreshold
content = content.replace(/  const freeThreshold = settings\?\.freeDeliveryThreshold \|\| 500;\r?\n  const neededForFree = Math\.max\(0, freeThreshold - subtotal\);\r?\n/, '');

// 3. Remove the Free Delivery Banner JSX block
const bannerStart = '      {/* Free Delivery Banner */}';
const bannerEnd = '      {/* Cart Items List */}';

const startIndex = content.indexOf(bannerStart);
const endIndex = content.indexOf(bannerEnd);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + content.substring(endIndex);
  fs.writeFileSync(file, content, 'utf-8');
  console.log('✅ Successfully removed Free Delivery banner from CartView.tsx');
} else {
  console.error('Could not locate banner boundaries in CartView.tsx');
}
