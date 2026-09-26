import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  User,
  UserRole,
  StaffSubRole,
  Address,
  MenuItem,
  Category,
  Order,
  DeliveryBatch,
  Review,
  AppNotification,
  RestaurantSettings,
  AnalyticsSummary
} from '../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export interface UserAuthCredentials {
  userId: string;
  email: string;
  passwordHash: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  inviteToken?: string;
  inviteExpires?: number;
  failedLoginAttempts?: number;
  lastFailedLogin?: number;
}

export interface DatabaseSchema {
  settings: RestaurantSettings;
  users: User[];
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  deliveryBatches: DeliveryBatch[];
  reviews: Review[];
  notifications: AppNotification[];
  addresses: Record<string, Address[]>; // customerId -> Address[]
  authCredentials?: Record<string, UserAuthCredentials>; // userId -> UserAuthCredentials
}

export function computeUserPermissions(role: UserRole, staffRole?: StaffSubRole): string[] {
  if (role === 'OWNER') {
    return [
      'orders.read',
      'orders.create',
      'orders.update',
      'orders.cancel',
      'orders.assign',
      'orders.deliver',
      'menu.read',
      'menu.create',
      'menu.update',
      'menu.delete',
      'menu.availability',
      'users.read',
      'users.create',
      'users.update',
      'users.suspend',
      'analytics.read',
      'audit.read',
      'reconciliation.read',
      'settings.update',
      'batches.manage'
    ];
  }
  if (role === 'STAFF') {
    switch (staffRole) {
      case 'KITCHEN_MANAGER':
      case 'GENERAL_MANAGER':
        return [
          'orders.read',
          'orders.update',
          'orders.cancel',
          'menu.read',
          'menu.availability',
          'batches.manage'
        ];
      case 'HEAD_CHEF':
      case 'KITCHEN_CHEF':
        return [
          'orders.read',
          'orders.update',
          'menu.read',
          'menu.availability'
        ];
      case 'LINE_COOK':
        return [
          'orders.read',
          'orders.update'
        ];
      case 'FRONT_DESK':
      case 'ORDER_BILLER':
      case 'STORE_DISPATCHER':
      default:
        return [
          'orders.read',
          'orders.create',
          'orders.update',
          'menu.read'
        ];
    }
  }
  if (role === 'DELIVERY_PARTNER') {
    return [
      'orders.read',
      'orders.deliver'
    ];
  }
  // CUSTOMER
  return [
    'orders.read',
    'orders.create',
    'orders.cancel',
    'menu.read'
  ];
}

const INITIAL_SETTINGS: RestaurantSettings = {
  restaurantName: "Hunter's Kitchen",
  phone: "+91 98765 00000",
  email: "contact@hunterskitchen.com",
  address: "42 Richmond Road, Shanthi Nagar, Bengaluru",
  isOpen: true,
  temporaryPause: false,
  openingTime: "11:00 AM",
  closingTime: "11:00 PM",
  deliveryRadiusKm: 10,
  baseDeliveryFee: 35,
  freeDeliveryThreshold: 500,
  codEnabled: true,
  onlinePaymentEnabled: true,
  announcement: ""
};

const INITIAL_USERS: User[] = [
  {
    id: 'usr_owner_1',
    name: 'Chef Senthil (Owner)',
    email: 'owner@hunterskitchen.com',
    phone: '+91 98765 43210',
    role: 'OWNER',
    status: 'ACTIVE',
    joinedAt: '2025-01-01T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_staff_1',
    name: 'Manoj Kumar (Kitchen Manager)',
    email: 'staff1@hunterskitchen.com',
    phone: '+91 98765 11111',
    role: 'STAFF',
    staffRole: 'KITCHEN_MANAGER',
    status: 'ACTIVE',
    joinedAt: '2025-02-10T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_staff_2',
    name: 'Kavitha Raj (Front Desk)',
    email: 'staff2@hunterskitchen.com',
    phone: '+91 98765 22222',
    role: 'STAFF',
    staffRole: 'FRONT_DESK',
    status: 'ACTIVE',
    joinedAt: '2025-03-01T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_staff_3',
    name: 'Saravanan (Head Chef)',
    email: 'chef@hunterskitchen.com',
    phone: '+91 98765 33331',
    role: 'STAFF',
    staffRole: 'HEAD_CHEF',
    status: 'ACTIVE',
    joinedAt: '2025-03-05T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_staff_4',
    name: 'Dinesh (Line Cook)',
    email: 'cook@hunterskitchen.com',
    phone: '+91 98765 33332',
    role: 'STAFF',
    staffRole: 'LINE_COOK',
    status: 'ACTIVE',
    joinedAt: '2025-03-12T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_staff_invited',
    name: 'Ramesh Chef (Invited)',
    email: 'invited@hunterskitchen.com',
    phone: '+91 98765 33333',
    role: 'STAFF',
    staffRole: 'LINE_COOK',
    status: 'INVITED',
    joinedAt: '2025-04-15T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_delivery_1',
    name: 'Arun Kumar',
    email: 'delivery1@hunterskitchen.com',
    phone: '+91 91234 56789',
    role: 'DELIVERY_PARTNER',
    status: 'ACTIVE',
    partnerStatus: 'ONLINE',
    vehicleNumber: 'TN-37-AB-1234',
    vehicleType: 'Bike',
    currentRating: 4.8,
    totalDeliveries: 142,
    joinedAt: '2025-01-15T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_delivery_2',
    name: 'Karthik Raja',
    email: 'delivery2@hunterskitchen.com',
    phone: '+91 91234 56790',
    role: 'DELIVERY_PARTNER',
    status: 'ACTIVE',
    partnerStatus: 'ONLINE',
    vehicleNumber: 'TN-37-CD-5678',
    vehicleType: 'Scooter',
    currentRating: 4.9,
    totalDeliveries: 98,
    joinedAt: '2025-02-01T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_delivery_3',
    name: 'Vijay Anand',
    email: 'delivery3@hunterskitchen.com',
    phone: '+91 91234 56791',
    role: 'DELIVERY_PARTNER',
    status: 'ACTIVE',
    partnerStatus: 'ONLINE',
    vehicleNumber: 'TN-37-EF-9012',
    vehicleType: 'Bike',
    currentRating: 4.7,
    totalDeliveries: 210,
    joinedAt: '2025-01-20T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_delivery_4',
    name: 'Suriya Prakash',
    email: 'delivery4@hunterskitchen.com',
    phone: '+91 91234 56792',
    role: 'DELIVERY_PARTNER',
    status: 'INACTIVE',
    partnerStatus: 'OFFLINE',
    vehicleNumber: 'TN-37-GH-3456',
    vehicleType: 'Bike',
    currentRating: 4.6,
    totalDeliveries: 45,
    joinedAt: '2025-03-10T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_customer_1',
    name: 'Priya Sundaram',
    email: 'customer1@hunterskitchen.com',
    phone: '+91 99887 76655',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    joinedAt: '2025-04-01T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_customer_2',
    name: 'Rahul Sharma',
    email: 'customer2@hunterskitchen.com',
    phone: '+91 99887 76644',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    joinedAt: '2025-04-12T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  },
  {
    id: 'usr_suspended_1',
    name: 'Suspended User',
    email: 'suspended@hunterskitchen.com',
    phone: '+91 99887 00000',
    role: 'CUSTOMER',
    status: 'SUSPENDED',
    joinedAt: '2025-04-10T00:00:00Z',
    restaurantId: 'rest_hunter_01'
  }
];

const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat_biriyani', name: 'Biriyani Specials', description: 'Aromatic Seeraga Samba and Basmati rice delicacies cooked with authentic spices', icon: '🍲' },
  { id: 'cat_starters', name: 'Starters & Tandoori', description: 'Crispy appetizers, kebabs, and juicy charcoal grilled delights', icon: '🍗' },
  { id: 'cat_noodles', name: 'Noodles', description: 'Delicious stir-fried street-style and wok-tossed noodles', icon: '🍜' },
  { id: 'cat_rice', name: 'Rice Dishes', description: 'Fragrant basmati fried rice and traditional rice items', icon: '🍚' },
  { id: 'cat_parotta', name: 'Parotta & Breads', description: 'Flaky South Indian parottas, naans, and stuffed flatbreads', icon: '🫓' },
  { id: 'cat_dosa', name: 'Dosa & Tiffin', description: 'Golden crispy dosas, fluffy idlis, and traditional tiffin items', icon: '🥞' },
  { id: 'cat_gravies', name: 'Gravies & Meals', description: 'Rich Chettinad, Mughlai, and traditional South Indian gravies', icon: '🥘' },
  { id: 'cat_beverages', name: 'Beverages & Juices', description: 'Fresh fruit juices, chilled lassis, and herbal coolers', icon: '🥤' },
  { id: 'cat_desserts', name: 'Desserts', description: 'Sweet traditional treats and ice cream delights', icon: '🍨' }
];

const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'item_101',
    name: "Hunter's Special Chicken Biriyani",
    description: 'Slow-dum cooked tender chicken marinated in authentic secret house spices with Seeraga Samba rice',
    categoryId: 'cat_biriyani',
    categoryName: 'Biriyani Specials',
    price: 240,
    discountPrice: 220,
    imageUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
    isVeg: false,
    isAvailable: true,
    prepTimeMinutes: 20,
    isBestseller: true,
    isPopular: true,
    rating: 4.9,
    ratingCount: 382,
    customizations: [
      {
        id: 'cust_spice_1',
        name: 'Spice Level',
        options: [
          { label: 'Medium Spice', price: 0 },
          { label: 'Authentic Spicy', price: 0 },
          { label: 'Extra Spicy', price: 0 }
        ]
      }
    ],
    addons: [
      { id: 'add_egg', name: 'Boiled Egg (1 Pc)', price: 15 },
      { id: 'add_gravy', name: 'Extra Salna / Gravy', price: 20 },
      { id: 'add_raitha', name: 'Extra Onion Raitha', price: 15 }
    ],
    ingredients: ['Seeraga Samba Rice', 'Tender Chicken', 'Ghee', 'Biriyani Spices', 'Mint', 'Coriander']
  },
  {
    id: 'item_102',
    name: 'Mutton Seeraga Samba Biriyani',
    description: 'Rich and aromatic mutton biriyani cooked with tender grass-fed mutton pieces and ghee',
    categoryId: 'cat_biriyani',
    categoryName: 'Biriyani Specials',
    price: 340,
    discountPrice: 320,
    imageUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&auto=format&fit=crop&q=80',
    isVeg: false,
    isAvailable: true,
    prepTimeMinutes: 25,
    isBestseller: true,
    rating: 4.9,
    ratingCount: 295,
    customizations: [
      {
        id: 'cust_spice_2',
        name: 'Spice Level',
        options: [
          { label: 'Medium Spice', price: 0 },
          { label: 'Spicy', price: 0 }
        ]
      }
    ],
    addons: [
      { id: 'add_egg_2', name: 'Boiled Egg', price: 15 },
      { id: 'add_bone_marrow', name: 'Bone Marrow Extra', price: 60 }
    ]
  },
  {
    id: 'item_103',
    name: 'Mushroom Dum Biriyani',
    description: 'Fragrant basmati rice dum cooked with fresh button mushrooms, caramelized onions, and whole spices',
    categoryId: 'cat_biriyani',
    categoryName: 'Biriyani Specials',
    price: 190,
    imageUrl: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=600&auto=format&fit=crop&q=80',
    isVeg: true,
    isAvailable: true,
    prepTimeMinutes: 18,
    isPopular: true,
    rating: 4.7,
    ratingCount: 142
  },
  {
    id: 'item_104',
    name: 'Chicken 65 Boneless',
    description: 'Crispy deep-fried chicken cubes tossed with curry leaves, green chillies, and homemade masala',
    categoryId: 'cat_starters',
    categoryName: 'Starters & Tandoori',
    price: 220,
    imageUrl: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?w=600&auto=format&fit=crop&q=80',
    isVeg: false,
    isAvailable: true,
    prepTimeMinutes: 15,
    isBestseller: true,
    isPopular: true,
    rating: 4.8,
    ratingCount: 410
  },
  {
    id: 'item_105',
    name: 'Paneer Tikka Charcoal Grill',
    description: 'Fresh malai paneer cubes marinated in yogurt and tandoori spices, charcoal roasted to perfection',
    categoryId: 'cat_starters',
    categoryName: 'Starters & Tandoori',
    price: 190,
    imageUrl: 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&auto=format&fit=crop&q=80',
    isVeg: true,
    isAvailable: true,
    prepTimeMinutes: 15,
    rating: 4.6,
    ratingCount: 180
  },
  {
    id: 'item_106',
    name: 'Madurai Bun Parotta (2 Pcs)',
    description: 'Soft and crispy bun parotta baked layer by layer using traditional ghee recipe',
    categoryId: 'cat_parotta',
    categoryName: 'Parotta & Breads',
    price: 70,
    imageUrl: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&auto=format&fit=crop&q=80',
    isVeg: true,
    isAvailable: true,
    prepTimeMinutes: 10,
    isBestseller: true,
    rating: 4.9,
    ratingCount: 520
  },
  {
    id: 'item_107',
    name: 'Ceylon Chicken Kothu Parotta',
    description: 'Shredded parotta chopped on hot griddle with chicken, eggs, onions, and spicy gravy',
    categoryId: 'cat_parotta',
    categoryName: 'Parotta & Breads',
    price: 160,
    imageUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&auto=format&fit=crop&q=80',
    isVeg: false,
    isAvailable: true,
    prepTimeMinutes: 15,
    isPopular: true,
    rating: 4.8,
    ratingCount: 310
  },
  {
    id: 'item_108',
    name: 'Ghee Roast Butter Dosa',
    description: 'Golden crispy thin dosa roasted generously with pure Cow Ghee, served with 3 chutneys & sambar',
    categoryId: 'cat_dosa',
    categoryName: 'Dosa & Tiffin',
    price: 100,
    imageUrl: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=80',
    isVeg: true,
    isAvailable: true,
    prepTimeMinutes: 12,
    isPopular: true,
    rating: 4.7,
    ratingCount: 220
  },
  {
    id: 'item_109',
    name: 'Chettinad Chicken Pepper Gravy',
    description: 'Traditional Chettinad style thick chicken curry infused with fresh roasted black pepper and coconut',
    categoryId: 'cat_gravies',
    categoryName: 'Gravies & Meals',
    price: 260,
    imageUrl: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&auto=format&fit=crop&q=80',
    isVeg: false,
    isAvailable: true,
    prepTimeMinutes: 18,
    rating: 4.8,
    ratingCount: 260
  },
  {
    id: 'item_110',
    name: 'Elaneer Payasam (Tender Coconut)',
    description: 'Signature chilled dessert made with fresh tender coconut water, coconut pulp, milk, and cardamom',
    categoryId: 'cat_desserts',
    categoryName: 'Desserts',
    price: 120,
    imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&auto=format&fit=crop&q=80',
    isVeg: true,
    isAvailable: true,
    prepTimeMinutes: 5,
    isBestseller: true,
    rating: 4.9,
    ratingCount: 340
  },
  {
    id: 'item_111',
    name: 'Fresh Mint Lime Soda',
    description: 'Refreshing sparkling cooler with handpicked mint leaves, fresh lime juice, and rock salt',
    categoryId: 'cat_beverages',
    categoryName: 'Beverages & Juices',
    price: 60,
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
    isVeg: true,
    isAvailable: true,
    prepTimeMinutes: 5,
    rating: 4.6,
    ratingCount: 150
  }
];

const INITIAL_ADDRESSES: Record<string, Address[]> = {};

const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord_1001',
    orderNumber: 'HK-20260812-000101',
    customerId: 'usr_customer_1',
    customerName: 'Priya Sundaram',
    customerPhone: '+91 99887 76655',
    deliveryAddress: {
      id: 'addr_1',
      type: 'HOME',
      name: 'Priya Sundaram',
      phone: '+91 99887 76655',
      doorNo: '42-B',
      street: 'Greenways Road',
      area: 'Race Course',
      city: 'Coimbatore',
      pincode: '641018',
      landmark: 'Opp. Park Gate 2'
    },
    items: [
      {
        menuItemId: 'item_101',
        name: "Hunter's Special Chicken Biriyani",
        unitPrice: 220,
        quantity: 2,
        isVeg: false,
        customizations: [{ optionName: 'Spice Level', selectedLabel: 'Authentic Spicy', price: 0 }],
        addons: [{ addonId: 'add_egg', name: 'Boiled Egg (1 Pc)', price: 15 }],
        specialInstructions: 'Extra spicy please!',
        totalPrice: 470
      },
      {
        menuItemId: 'item_104',
        name: 'Chicken 65 Boneless',
        unitPrice: 220,
        quantity: 1,
        isVeg: false,
        customizations: [],
        addons: [],
        totalPrice: 220
      }
    ],
    orderNotes: 'Please pack extra raitha and include spoons.',
    subtotal: 690,
    deliveryFee: 0, // > 500
    tax: 34.5,
    discount: 0,
    grandTotal: 724.5,
    paymentMethod: 'ONLINE',
    paymentStatus: 'VERIFIED',
    paymentTransactionId: 'TXN_987123984712',
    status: 'PREPARING',
    createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18 mins ago
    acceptedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    preparingAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    events: [
      {
        id: 'evt_1',
        orderId: 'ord_1001',
        status: 'PLACED',
        title: 'Order Placed',
        description: 'Order received and payment verified via Online Gateway',
        timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        changedBy: 'usr_customer_1',
        changedByRole: 'CUSTOMER'
      },
      {
        id: 'evt_2',
        orderId: 'ord_1001',
        status: 'ACCEPTED',
        title: 'Order Accepted',
        description: 'Accepted by Kitchen Staff Manoj Kumar',
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        changedBy: 'usr_staff_1',
        changedByRole: 'STAFF'
      },
      {
        id: 'evt_3',
        orderId: 'ord_1001',
        status: 'PREPARING',
        title: 'Food Preparing',
        description: 'Chef is preparing your meals in the kitchen',
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        changedBy: 'usr_staff_1',
        changedByRole: 'STAFF'
      }
    ]
  },
  {
    id: 'ord_1002',
    orderNumber: 'HK-20260812-000102',
    customerId: 'usr_customer_2',
    customerName: 'Rahul Sharma',
    customerPhone: '+91 99887 76644',
    deliveryAddress: {
      id: 'addr_rahul',
      type: 'HOME',
      name: 'Rahul Sharma',
      phone: '+91 99887 76644',
      doorNo: '108',
      street: 'Trichy Road',
      area: 'Ramanathapuram',
      city: 'Coimbatore',
      pincode: '641045'
    },
    items: [
      {
        menuItemId: 'item_102',
        name: 'Mutton Seeraga Samba Biriyani',
        unitPrice: 320,
        quantity: 1,
        isVeg: false,
        customizations: [],
        addons: [],
        totalPrice: 320
      },
      {
        menuItemId: 'item_110',
        name: 'Elaneer Payasam (Tender Coconut)',
        unitPrice: 120,
        quantity: 2,
        isVeg: true,
        customizations: [],
        addons: [],
        totalPrice: 240
      }
    ],
    subtotal: 560,
    deliveryFee: 0,
    tax: 28,
    discount: 0,
    grandTotal: 588,
    paymentMethod: 'COD',
    paymentStatus: 'COD_PENDING',
    status: 'READY',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    acceptedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    preparingAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    readyAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    events: [
      {
        id: 'evt_1002_1',
        orderId: 'ord_1002',
        status: 'PLACED',
        title: 'Order Placed',
        description: 'Order placed with Cash on Delivery option',
        timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        changedBy: 'usr_customer_2',
        changedByRole: 'CUSTOMER'
      },
      {
        id: 'evt_1002_2',
        orderId: 'ord_1002',
        status: 'ACCEPTED',
        title: 'Order Accepted',
        description: 'Order accepted by Owner Chef Senthil',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        changedBy: 'usr_owner_1',
        changedByRole: 'OWNER'
      },
      {
        id: 'evt_1002_3',
        orderId: 'ord_1002',
        status: 'PREPARING',
        title: 'Food Preparing',
        description: 'Kitchen actively preparing mutton biriyani',
        timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
        changedBy: 'usr_staff_1',
        changedByRole: 'STAFF'
      },
      {
        id: 'evt_1002_4',
        orderId: 'ord_1002',
        status: 'READY',
        title: 'Food Ready for Pickup',
        description: 'Order packed & awaiting delivery partner assignment',
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        changedBy: 'usr_staff_1',
        changedByRole: 'STAFF'
      }
    ]
  }
];

const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev_1',
    orderId: 'ord_hist_0',
    orderNumber: 'HK-20260811-000095',
    customerId: 'usr_customer_1',
    customerName: 'Priya Sundaram',
    foodRating: 5,
    deliveryRating: 5,
    overallRating: 5,
    comment: "The Hunter's special biriyani was incredibly fragrant and rich! Delivery driver Arun arrived hot and fresh.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    itemRatings: [
      {
        menuItemId: 'item_101',
        menuItemName: "Hunter's Special Chicken Biriyani",
        rating: 5,
        comment: 'Authentic seeraga samba rice and super tender chicken. Loved the spice level!'
      },
      {
        menuItemId: 'item_104',
        menuItemName: 'Chicken 65 Boneless',
        rating: 5,
        comment: 'Crispy and juicy boneless chicken pieces!'
      }
    ]
  },
  {
    id: 'rev_2',
    orderId: 'ord_hist_1',
    orderNumber: 'HK-20260810-000088',
    customerId: 'usr_customer_2',
    customerName: 'Karthik Raja',
    foodRating: 5,
    deliveryRating: 4,
    overallRating: 5,
    comment: 'Best mutton biriyani in town! Soft meat that melts in mouth.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    itemRatings: [
      {
        menuItemId: 'item_102',
        menuItemName: 'Mutton Seeraga Samba Biriyani',
        rating: 5,
        comment: 'Pure ghee flavour and bone marrow was sublime!'
      }
    ]
  },
  {
    id: 'rev_3',
    orderId: 'ord_hist_2',
    orderNumber: 'HK-20260809-000072',
    customerId: 'usr_customer_3',
    customerName: 'Ananya Ramesh',
    foodRating: 4,
    deliveryRating: 5,
    overallRating: 4,
    comment: 'Flaky bun parottas paired with chicken salna were divine.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    itemRatings: [
      {
        menuItemId: 'item_107',
        menuItemName: 'Madurai Bun Parotta (2 Pcs)',
        rating: 5,
        comment: 'Super soft and flaky bun parotta, perfect salna combo!'
      }
    ]
  }
];

class Database {
  private data: DatabaseSchema;
  private defaultPasswordHash: string;

  constructor() {
    this.defaultPasswordHash = bcrypt.hashSync('Hunter@2026!', 10);
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const db = JSON.parse(fileContent) as DatabaseSchema;
        let changed = false;
        const requiredCategories = [
          { id: 'cat_noodles', name: 'Noodles', description: 'Delicious stir-fried street-style and wok-tossed noodles', icon: '🍜' },
          { id: 'cat_rice', name: 'Rice Dishes', description: 'Fragrant basmati fried rice and traditional rice items', icon: '🍚' }
        ];
        if (!db.categories) db.categories = [];
        for (const req of requiredCategories) {
          if (!db.categories.some(c => c.id === req.id)) {
            db.categories.push(req);
            changed = true;
          }
        }
        // Ensure auth credentials and seed users
        const authChanged = this.ensureAuthCredentials(db);
        if (authChanged) changed = true;

        // Ensure we have robust historical data for weekly trend & food category calculations
        const seeded = this.ensureHistoricalOrders(db);
        if (changed || seeded) {
          fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
        }
        return db;
      }
    } catch (e) {
      console.error('Error loading database file, initializing fallback:', e);
    }

    const initialDb: DatabaseSchema = {
      settings: INITIAL_SETTINGS,
      users: INITIAL_USERS,
      categories: INITIAL_CATEGORIES,
      menuItems: INITIAL_MENU_ITEMS,
      orders: INITIAL_ORDERS,
      deliveryBatches: [],
      reviews: INITIAL_REVIEWS,
      notifications: [],
      addresses: INITIAL_ADDRESSES,
      authCredentials: {}
    };

    this.ensureAuthCredentials(initialDb);
    this.ensureHistoricalOrders(initialDb);
    this.saveData(initialDb);
    return initialDb;
  }

  private ensureAuthCredentials(db: DatabaseSchema): boolean {
    let modified = false;
    if (!db.users) db.users = [];
    if (!db.authCredentials) {
      db.authCredentials = {};
      modified = true;
    }

    // Ensure all INITIAL_USERS exist in db.users
    for (const initUser of INITIAL_USERS) {
      const existing = db.users.find(u => u.id === initUser.id || u.email.toLowerCase() === initUser.email.toLowerCase());
      if (!existing) {
        db.users.push({ ...initUser, permissions: computeUserPermissions(initUser.role, initUser.staffRole) });
        modified = true;
      } else {
        // Ensure staffRole and permissions are up-to-date
        if (initUser.staffRole && existing.staffRole !== initUser.staffRole) {
          existing.staffRole = initUser.staffRole;
          modified = true;
        }
        if (!existing.permissions || existing.permissions.length === 0) {
          existing.permissions = computeUserPermissions(existing.role, existing.staffRole);
          modified = true;
        }
        if (!existing.restaurantId) {
          existing.restaurantId = 'rest_hunter_01';
          modified = true;
        }
      }
    }

    // Ensure all users have plain text password stripped and passwordHash created in authCredentials
    for (const u of db.users) {
      // If user object has raw password, hash it and remove plaintext
      if ((u as any).password) {
        const rawPass = (u as any).password;
        if (!db.authCredentials[u.id] || !db.authCredentials[u.id].passwordHash) {
          db.authCredentials[u.id] = {
            userId: u.id,
            email: u.email.toLowerCase().trim(),
            passwordHash: bcrypt.hashSync(rawPass, 10)
          };
        }
        delete (u as any).password;
        modified = true;
      }

      // Ensure authCredentials exists for every user
      if (!db.authCredentials[u.id]) {
        db.authCredentials[u.id] = {
          userId: u.id,
          email: u.email.toLowerCase().trim(),
          passwordHash: this.defaultPasswordHash,
          inviteToken: u.id === 'usr_staff_invited' ? 'invite_chef_token_123' : undefined,
          inviteExpires: u.id === 'usr_staff_invited' ? Date.now() + 7 * 24 * 60 * 60 * 1000 : undefined
        };
        modified = true;
      }
    }

    // Ensure standard demo accounts always have valid Hunter@2026! hash
    const standardDemoUserIds = ['usr_owner_1', 'usr_staff_1', 'usr_staff_2', 'usr_delivery_1', 'usr_customer_1', 'usr_customer_2', 'usr_staff_3', 'usr_staff_4', 'usr_suspended_1'];
    for (const demoId of standardDemoUserIds) {
      if (db.authCredentials[demoId]) {
        const currentHash = db.authCredentials[demoId].passwordHash;
        if (!currentHash || !bcrypt.compareSync('Hunter@2026!', currentHash)) {
          db.authCredentials[demoId].passwordHash = this.defaultPasswordHash;
          modified = true;
        }
      }
    }

    return modified;
  }

  private ensureHistoricalOrders(db: DatabaseSchema): boolean {
    const deliveredOrders = db.orders.filter(o => o.status === 'DELIVERED');
    if (deliveredOrders.length >= 10) {
      return false; // Already has enough historical data
    }

    const mockCustomers = [
      { id: 'usr_customer_1', name: 'Priya Sundaram', phone: '+91 99887 76655' },
      { id: 'usr_customer_2', name: 'Rahul Sharma', phone: '+91 99887 76644' },
      { id: 'usr_customer_3', name: 'Ananya Ramesh', phone: '+91 99887 76633' },
      { id: 'usr_customer_4', name: 'Karthik Raja', phone: '+91 99887 76622' },
      { id: 'usr_customer_5', name: 'Arun Kumar', phone: '+91 99887 76611' }
    ];

    const menuOptions = [
      { id: 'item_101', name: "Hunter's Special Chicken Biriyani", price: 220, isVeg: false },
      { id: 'item_102', name: "Mutton Seeraga Samba Biriyani", price: 320, isVeg: false },
      { id: 'item_103', name: "Mushroom Dum Biriyani", price: 190, isVeg: true },
      { id: 'item_104', name: "Chicken 65 Boneless", price: 220, isVeg: false },
      { id: 'item_105', name: "Paneer Tikka Charcoal Grill", price: 190, isVeg: true },
      { id: 'item_106', name: "Madurai Bun Parotta (2 Pcs)", price: 70, isVeg: true },
      { id: 'item_107', name: "Ceylon Chicken Kothu Parotta", price: 160, isVeg: false }
    ];

    const addressTemplates = [
      { id: 'addr_h_1', type: 'HOME', name: 'Home Address', phone: '+91 99887 76655', doorNo: '42-B', street: 'Greenways Road', area: 'Race Course', city: 'Coimbatore', pincode: '641018' },
      { id: 'addr_h_2', type: 'OFFICE', name: 'Office Address', phone: '+91 99887 76644', doorNo: '108', street: 'Trichy Road', area: 'Ramanathapuram', city: 'Coimbatore', pincode: '641045' },
      { id: 'addr_h_3', type: 'OTHER', name: 'Friends Place', phone: '+91 99887 76633', doorNo: '12', street: 'Avinashi Road', area: 'Peelamedu', city: 'Coimbatore', pincode: '641004' }
    ];

    const deliveryPartners = [
      { id: 'usr_delivery_1', name: 'Arun Kumar', phone: '+91 91234 56789', vehicle: 'TN-37-AB-1234' },
      { id: 'usr_delivery_2', name: 'Karthik Raja', phone: '+91 91234 56790', vehicle: 'TN-37-CD-5678' },
      { id: 'usr_delivery_3', name: 'Vijay Anand', phone: '+91 91234 56791', vehicle: 'TN-37-EF-9012' }
    ];

    // Generate 35 completed orders spread across the last 14 days
    const generatedOrders: Order[] = [];
    const now = Date.now();

    for (let i = 1; i <= 35; i++) {
      const cust = mockCustomers[Math.floor(Math.random() * mockCustomers.length)];
      const partner = deliveryPartners[i % deliveryPartners.length];
      const numItems = Math.floor(Math.random() * 2) + 1;
      const orderItems: any[] = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const item = menuOptions[Math.floor(Math.random() * menuOptions.length)];
        const existing = orderItems.find(oi => oi.menuItemId === item.id);
        if (existing) {
          existing.quantity += 1;
          existing.totalPrice += item.price;
          subtotal += item.price;
        } else {
          orderItems.push({
            menuItemId: item.id,
            name: item.name,
            unitPrice: item.price,
            quantity: 1,
            isVeg: item.isVeg,
            customizations: [],
            addons: [],
            totalPrice: item.price
          });
          subtotal += item.price;
        }
      }

      const deliveryFee = subtotal >= 500 ? 0 : 35;
      const tax = Math.round(subtotal * 0.05 * 10) / 10;
      const grandTotal = subtotal + deliveryFee + tax;

      // Distribute over the last 14 days
      const daysAgo = Math.floor(Math.random() * 14) + 1; // 1 to 14 days ago
      const orderTime = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 12 * 60 * 60 * 1000));
      const deliveryTime = new Date(orderTime.getTime() + 1000 * 60 * (25 + Math.floor(Math.random() * 20)));

      const orderNumDateStr = orderTime.toISOString().slice(0, 10).replace(/-/g, '');
      const orderNumSeq = String(i).padStart(6, '0');
      const orderId = `ord_hist_${i}`;
      const orderNumber = `HK-${orderNumDateStr}-${orderNumSeq}`;

      generatedOrders.push({
        id: orderId,
        orderNumber,
        customerId: cust.id,
        customerName: cust.name,
        customerPhone: cust.phone,
        deliveryAddress: addressTemplates[Math.floor(Math.random() * addressTemplates.length)] as any,
        assignedDeliveryPartnerId: partner.id,
        assignedDeliveryPartnerName: partner.name,
        assignedDeliveryPartnerPhone: partner.phone,
        assignedDeliveryPartnerVehicle: partner.vehicle,
        items: orderItems,
        subtotal,
        deliveryFee,
        tax,
        discount: 0,
        grandTotal,
        paymentMethod: Math.random() > 0.3 ? 'ONLINE' : 'COD',
        paymentStatus: 'PAID_CASH',
        status: 'DELIVERED',
        createdAt: orderTime.toISOString(),
        deliveredAt: deliveryTime.toISOString(),
        events: []
      });

      // Seed customer feedback reviews for about 40% of historical orders
      if (i % 2.5 === 0 || i % 3 === 0) {
        const feedBackComments = [
          "Excellent and fast delivery!",
          "Delivery partner was very polite and handled the food with care.",
          "Amazing packaging, arrived super quick!",
          "Very neat and professional service.",
          "The food was piping hot when it arrived. Perfect delivery!",
          "Super fast delivery, extremely friendly executive!"
        ];
        const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 star
        db.reviews.push({
          id: `rev_generated_${i}`,
          orderId,
          orderNumber,
          customerId: cust.id,
          customerName: cust.name,
          foodRating: rating,
          deliveryRating: rating,
          overallRating: rating,
          comment: feedBackComments[i % feedBackComments.length],
          createdAt: deliveryTime.toISOString()
        });
      }
    }

    db.orders = [...generatedOrders, ...db.orders];
    return true;
  }

  public saveData(dataToSave?: DatabaseSchema): void {
    try {
      if (dataToSave) {
        this.data = dataToSave;
      }
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database file:', e);
    }
  }

  // Settings
  public getSettings(): RestaurantSettings {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<RestaurantSettings>): RestaurantSettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.saveData();
    return this.data.settings;
  }

  // Users
  public getUsers(): User[] {
    return this.data.users.map((u) => ({
      ...u,
      partnerStatus: u.partnerStatus || (u.role === 'DELIVERY_PARTNER' && u.status === 'ACTIVE' ? 'ONLINE' : u.partnerStatus),
      restaurantId: u.restaurantId || 'rest_hunter_01',
      permissions: u.permissions && u.permissions.length > 0 ? u.permissions : computeUserPermissions(u.role, u.staffRole)
    }));
  }

  public getUserById(id: string): User | undefined {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return undefined;
    return {
      ...user,
      partnerStatus: user.partnerStatus || (user.role === 'DELIVERY_PARTNER' && user.status === 'ACTIVE' ? 'ONLINE' : user.partnerStatus),
      restaurantId: user.restaurantId || 'rest_hunter_01',
      permissions: user.permissions && user.permissions.length > 0 ? user.permissions : computeUserPermissions(user.role, user.staffRole)
    };
  }

  public getUserByEmail(email: string): User | undefined {
    const lower = email.toLowerCase().trim();
    let targetEmail = lower;
    if (lower === 'admin@hunterskitchen.com' || lower === 'owner@test.local') {
      const defaultOwnerExists = this.data.users.some((u) => u.email.toLowerCase() === 'owner@hunterskitchen.com');
      if (defaultOwnerExists) {
        targetEmail = 'owner@hunterskitchen.com';
      }
    }
    else if (lower === 'staff@hunterskitchen.com' || lower === 'staff@test.local') targetEmail = 'staff1@hunterskitchen.com';
    else if (lower === 'delivery@hunterskitchen.com' || lower === 'rider@test.local') targetEmail = 'delivery1@hunterskitchen.com';
    else if (lower === 'customer@hunterskitchen.com' || lower === 'customer@test.local') targetEmail = 'customer1@hunterskitchen.com';
    else if (lower === 'chef@test.local') targetEmail = 'chef@hunterskitchen.com';
    else if (lower === 'cook@test.local') targetEmail = 'cook@hunterskitchen.com';

    const user = this.data.users.find((u) => u.email.toLowerCase() === targetEmail);
    if (!user) return undefined;
    return {
      ...user,
      restaurantId: user.restaurantId || 'rest_hunter_01',
      permissions: user.permissions && user.permissions.length > 0 ? user.permissions : computeUserPermissions(user.role, user.staffRole)
    };
  }

  public getUserByGoogleId(googleId: string): User | undefined {
    if (!googleId) return undefined;
    const cleanId = String(googleId).trim();
    const user = this.data.users.find((u) => u.googleId === cleanId);
    if (!user) return undefined;
    return {
      ...user,
      partnerStatus: user.partnerStatus || (user.role === 'DELIVERY_PARTNER' && user.status === 'ACTIVE' ? 'ONLINE' : user.partnerStatus),
      restaurantId: user.restaurantId || 'rest_hunter_01',
      permissions: user.permissions && user.permissions.length > 0 ? user.permissions : computeUserPermissions(user.role, user.staffRole)
    };
  }

  public getAuthCredentialsByUserId(userId: string): UserAuthCredentials | undefined {
    if (!this.data.authCredentials) this.data.authCredentials = {};
    return this.data.authCredentials[userId];
  }

  public getAuthCredentialsByEmail(email: string): UserAuthCredentials | undefined {
    if (!this.data.authCredentials) this.data.authCredentials = {};
    const user = this.getUserByEmail(email);
    if (!user) return undefined;
    return this.data.authCredentials[user.id];
  }

  public setAuthCredentials(cred: UserAuthCredentials): void {
    if (!this.data.authCredentials) this.data.authCredentials = {};
    this.data.authCredentials[cred.userId] = cred;
    this.saveData();
  }

  public updatePassword(userId: string, passwordHash: string): boolean {
    if (!this.data.authCredentials) this.data.authCredentials = {};
    if (this.data.authCredentials[userId]) {
      this.data.authCredentials[userId].passwordHash = passwordHash;
      this.data.authCredentials[userId].resetPasswordToken = undefined;
      this.data.authCredentials[userId].resetPasswordExpires = undefined;
      this.saveData();
      return true;
    }
    const user = this.getUserById(userId);
    if (user) {
      this.data.authCredentials[userId] = {
        userId,
        email: user.email.toLowerCase().trim(),
        passwordHash
      };
      this.saveData();
      return true;
    }
    return false;
  }

  public recordLoginAttempt(email: string, success: boolean): void {
    const cred = this.getAuthCredentialsByEmail(email);
    if (!cred) return;
    if (success) {
      cred.failedLoginAttempts = 0;
      cred.lastFailedLogin = undefined;
    } else {
      cred.failedLoginAttempts = (cred.failedLoginAttempts || 0) + 1;
      cred.lastFailedLogin = Date.now();
    }
    this.setAuthCredentials(cred);
  }

  public setResetPasswordToken(email: string, token: string, expiryMs: number): boolean {
    const cred = this.getAuthCredentialsByEmail(email);
    if (!cred) return false;
    cred.resetPasswordToken = token;
    cred.resetPasswordExpires = Date.now() + expiryMs;
    this.setAuthCredentials(cred);
    return true;
  }

  public verifyAndConsumeResetToken(token: string, newHash: string): string | null {
    if (!this.data.authCredentials) return null;
    const now = Date.now();
    for (const cred of Object.values(this.data.authCredentials)) {
      if (cred.resetPasswordToken === token && cred.resetPasswordExpires && cred.resetPasswordExpires > now) {
        cred.passwordHash = newHash;
        cred.resetPasswordToken = undefined;
        cred.resetPasswordExpires = undefined;
        this.setAuthCredentials(cred);
        return cred.userId;
      }
    }
    return null;
  }

  public createInviteToken(userId: string, token: string, expiryMs: number): boolean {
    const cred = this.getAuthCredentialsByUserId(userId);
    if (!cred) return false;
    cred.inviteToken = token;
    cred.inviteExpires = Date.now() + expiryMs;
    this.setAuthCredentials(cred);
    return true;
  }

  public acceptInvite(token: string, passwordHash: string): User | null {
    if (!this.data.authCredentials) return null;
    const now = Date.now();
    for (const cred of Object.values(this.data.authCredentials)) {
      if (cred.inviteToken === token && cred.inviteExpires && cred.inviteExpires > now) {
        cred.passwordHash = passwordHash;
        cred.inviteToken = undefined;
        cred.inviteExpires = undefined;
        this.setAuthCredentials(cred);
        const user = this.getUserById(cred.userId);
        if (user) {
          user.status = 'ACTIVE';
          this.updateUser(user.id, { status: 'ACTIVE' });
          return user;
        }
      }
    }
    return null;
  }

  public createUser(user: Omit<User, 'id' | 'joinedAt'> & { password?: string }): User {
    // Enforce unique constraint on googleId (sub)
    if (user.googleId) {
      const existingGoogleUser = this.data.users.find((u) => u.googleId === user.googleId);
      if (existingGoogleUser) {
        throw new Error(`Google account identifier (sub) is already registered to user ${existingGoogleUser.id}`);
      }
    }

    // Strip raw password from User entity to prevent plaintext storage
    const { password: rawPassword, ...userWithoutPassword } = user;

    const newUser: User = {
      ...userWithoutPassword,
      id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      joinedAt: new Date().toISOString(),
      restaurantId: userWithoutPassword.restaurantId || 'rest_hunter_01',
      permissions: userWithoutPassword.permissions && userWithoutPassword.permissions.length > 0 ? userWithoutPassword.permissions : computeUserPermissions(userWithoutPassword.role, userWithoutPassword.staffRole)
    };
    this.data.users.push(newUser);
    
    // Set credentials with bcrypt hash
    const hash = rawPassword ? bcrypt.hashSync(rawPassword, 10) : this.defaultPasswordHash;
    if (!this.data.authCredentials) this.data.authCredentials = {};
    this.data.authCredentials[newUser.id] = {
      userId: newUser.id,
      email: newUser.email.toLowerCase().trim(),
      passwordHash: hash
    };

    this.saveData();
    return newUser;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return undefined;

    // Enforce unique constraint on googleId (sub)
    if (updates.googleId) {
      const existingGoogleUser = this.data.users.find((u) => u.googleId === updates.googleId && u.id !== id);
      if (existingGoogleUser) {
        throw new Error(`Google account identifier (sub) is already registered to another account`);
      }
    }

    const updatedUser = { ...this.data.users[index], ...updates };
    if (updates.role || updates.staffRole) {
      updatedUser.permissions = computeUserPermissions(updatedUser.role, updatedUser.staffRole);
    }
    this.data.users[index] = updatedUser;


    // Keep authCredentials synchronized if email is changed
    if (updates.email && this.data.authCredentials && this.data.authCredentials[id]) {
      this.data.authCredentials[id].email = updates.email.toLowerCase().trim();
    }

    this.saveData();
    return this.getUserById(id);
  }

  public deleteUser(id: string): boolean {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    this.data.users.splice(index, 1);
    if (this.data.authCredentials && this.data.authCredentials[id]) {
      delete this.data.authCredentials[id];
    }
    this.saveData();
    return true;
  }

  // Menu Categories
  public getCategories(): Category[] {
    return this.data.categories;
  }

  public createCategory(cat: Omit<Category, 'id'>): Category {
    const newCat: Category = {
      ...cat,
      id: 'cat_' + Date.now()
    };
    this.data.categories.push(newCat);
    this.saveData();
    return newCat;
  }

  // Menu Items
  public getMenuItems(): MenuItem[] {
    return this.data.menuItems;
  }

  public getMenuItemById(id: string): MenuItem | undefined {
    return this.data.menuItems.find((m) => m.id === id);
  }

  public createMenuItem(item: Omit<MenuItem, 'id' | 'rating' | 'ratingCount'>): MenuItem {
    const newItem: MenuItem = {
      ...item,
      id: 'item_' + Date.now(),
      rating: 5.0,
      ratingCount: 1
    };
    this.data.menuItems.push(newItem);
    this.saveData();
    return newItem;
  }

  public updateMenuItem(id: string, updates: Partial<MenuItem>): MenuItem | undefined {
    const index = this.data.menuItems.findIndex((m) => m.id === id);
    if (index === -1) return undefined;
    this.data.menuItems[index] = { ...this.data.menuItems[index], ...updates };
    this.saveData();
    return this.data.menuItems[index];
  }

  public deleteMenuItem(id: string): boolean {
    const index = this.data.menuItems.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.data.menuItems.splice(index, 1);
    this.saveData();
    return true;
  }

  // Customer Addresses
  public getAddresses(customerId: string): Address[] {
    if (!this.data.addresses) this.data.addresses = {};
    return this.data.addresses[customerId] || [];
  }

  public saveAddress(customerId: string, address: Omit<Address, 'id'>): Address {
    if (!this.data.addresses) this.data.addresses = {};
    if (!this.data.addresses[customerId]) {
      this.data.addresses[customerId] = [];
    }
    const newAddr: Address = {
      ...address,
      id: 'addr_' + Date.now()
    };
    if (newAddr.isDefault) {
      this.data.addresses[customerId].forEach((a) => (a.isDefault = false));
    }
    this.data.addresses[customerId].push(newAddr);
    this.saveData();
    return newAddr;
  }

  public updateAddress(customerId: string, addressId: string, updates: Partial<Address>): Address | undefined {
    let targetList: Address[] | undefined = this.data.addresses[customerId];
    let index = targetList ? targetList.findIndex((a) => a.id === addressId) : -1;

    if (index === -1) {
      for (const cid in this.data.addresses) {
        const list = this.data.addresses[cid];
        const idx = list.findIndex((a) => a.id === addressId);
        if (idx !== -1) {
          targetList = list;
          index = idx;
          break;
        }
      }
    }

    if (!targetList || index === -1) return undefined;

    if (updates.isDefault) {
      targetList.forEach((a) => (a.isDefault = false));
    }

    targetList[index] = { ...targetList[index], ...updates };
    this.saveData();
    return targetList[index];
  }

  public deleteAddress(customerId: string, addressId: string): boolean {
    let deleted = false;
    if (this.data.addresses[customerId]) {
      const idx = this.data.addresses[customerId].findIndex((a) => a.id === addressId);
      if (idx !== -1) {
        this.data.addresses[customerId].splice(idx, 1);
        deleted = true;
      }
    }

    if (!deleted) {
      for (const cid in this.data.addresses) {
        const list = this.data.addresses[cid];
        const idx = list.findIndex((a) => a.id === addressId);
        if (idx !== -1) {
          list.splice(idx, 1);
          deleted = true;
          break;
        }
      }
    }

    if (deleted) {
      this.saveData();
    }
    return deleted;
  }

  // Helper to ensure order partner details are populated
  private populateOrderPartnerDetails(order: Order): Order {
    if (!order) return order;
    if (order.assignedDeliveryPartnerId && (!order.assignedDeliveryPartnerName || !order.assignedDeliveryPartnerPhone)) {
      const partner = this.getUserById(order.assignedDeliveryPartnerId);
      if (partner) {
        order.assignedDeliveryPartnerName = partner.name;
        order.assignedDeliveryPartnerPhone = partner.phone;
        order.assignedDeliveryPartnerVehicle = partner.vehicleNumber || partner.vehicleType;
      }
    } else if (['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && !order.assignedDeliveryPartnerName) {
      const partner = this.data.users.find((u) => u.role === 'DELIVERY_PARTNER' && u.status === 'ACTIVE') ||
                      this.data.users.find((u) => u.role === 'DELIVERY_PARTNER');
      if (partner) {
        order.assignedDeliveryPartnerId = order.assignedDeliveryPartnerId || partner.id;
        order.assignedDeliveryPartnerName = partner.name;
        order.assignedDeliveryPartnerPhone = partner.phone;
        order.assignedDeliveryPartnerVehicle = partner.vehicleNumber || partner.vehicleType || 'Bike';
      }
    }
    return order;
  }

  // Orders
  public getOrders(): Order[] {
    return this.data.orders.map((o) => this.populateOrderPartnerDetails(o));
  }

  public getOrderById(id: string): Order | undefined {
    const order = this.data.orders.find((o) => o.id === id);
    return order ? this.populateOrderPartnerDetails(order) : undefined;
  }

  public createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'events'>): Order {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find highest numerical sequence across all existing orders to guarantee uniqueness
    let maxSeq = 100;
    this.data.orders.forEach((o) => {
      if (o.orderNumber && o.orderNumber.includes('-')) {
        const parts = o.orderNumber.split('-');
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
    const seqStr = String(maxSeq + 1).padStart(6, '0');
    const orderNumber = `HK-${dateStr}-${seqStr}`;
    const id = 'ord_' + Date.now();

    const newOrder: Order = {
      ...orderData,
      id,
      orderNumber,
      createdAt: new Date().toISOString(),
      events: [
        {
          id: 'evt_' + Date.now(),
          orderId: id,
          status: orderData.status,
          title: 'Order Placed',
          description:
            orderData.paymentMethod === 'ONLINE'
              ? 'Order received & payment confirmed via Online Gateway'
              : 'Order placed with Cash on Delivery',
          timestamp: new Date().toISOString(),
          changedBy: orderData.customerId,
          changedByRole: 'CUSTOMER'
        }
      ]
    };

    this.data.orders.unshift(newOrder);

    // Notify owner & staff
    this.createNotification({
      userId: 'usr_owner_1',
      userRole: 'OWNER',
      title: 'New Order Received!',
      message: `Order #${orderNumber} placed by ${newOrder.customerName} (₹${newOrder.grandTotal})`,
      type: 'ORDER',
      orderId: newOrder.id
    });

    this.saveData();
    return newOrder;
  }

  public updateOrderStatus(
    orderId: string,
    status: Order['status'],
    changedBy: User,
    metadata?: { rejectionReason?: string; cancellationReason?: string; deliveryPartnerId?: string }
  ): Order | undefined {
    const order = this.getOrderById(orderId);
    if (!order) return undefined;

    order.status = status;
    order.version = (order.version || 1) + 1;
    order.updatedAt = new Date().toISOString();
    const now = new Date().toISOString();

    let eventTitle = '';
    let eventDesc = '';

    switch (status) {
      case 'ACCEPTED':
        order.acceptedAt = now;
        eventTitle = 'Order Accepted';
        eventDesc = `Accepted by ${changedBy.name} (${changedBy.role})`;
        break;
      case 'REJECTED':
        order.rejectionReason = metadata?.rejectionReason || 'Restaurant kitchen busy';
        eventTitle = 'Order Rejected';
        eventDesc = `Reason: ${order.rejectionReason}`;
        break;
      case 'PREPARING':
        order.preparingAt = now;
        eventTitle = 'Food Preparing';
        eventDesc = 'Kitchen is actively preparing your dishes';
        break;
      case 'READY':
        order.readyAt = now;
        eventTitle = 'Food Ready';
        eventDesc = 'Packaging completed & awaiting delivery assignment';
        break;
      case 'ASSIGNED':
        {
          const partnerId = metadata?.deliveryPartnerId || (changedBy?.role === 'DELIVERY_PARTNER' ? changedBy.id : undefined) || order.assignedDeliveryPartnerId;
          let partner = partnerId ? this.getUserById(partnerId) : undefined;
          if (!partner) {
            partner = this.data.users.find((u) => u.role === 'DELIVERY_PARTNER' && u.status === 'ACTIVE') ||
                      this.data.users.find((u) => u.role === 'DELIVERY_PARTNER');
          }
          if (partner) {
            order.assignedDeliveryPartnerId = partner.id;
            order.assignedDeliveryPartnerName = partner.name;
            order.assignedDeliveryPartnerPhone = partner.phone;
            order.assignedDeliveryPartnerVehicle = partner.vehicleNumber || partner.vehicleType;
            
            // Send notification to partner
            this.createNotification({
              userId: partner.id,
              userRole: 'DELIVERY_PARTNER',
              title: 'New Delivery Assigned!',
              message: `Order #${order.orderNumber} assigned to you for delivery.`,
              type: 'ORDER',
              orderId: order.id
            });
          }
          eventTitle = 'Delivery Partner Assigned';
          eventDesc = `Assigned to ${order.assignedDeliveryPartnerName || 'Delivery Partner'}`;
        }
        break;
      case 'PICKED_UP':
        order.pickedUpAt = now;
        eventTitle = 'Order Picked Up';
        eventDesc = `${order.assignedDeliveryPartnerName} picked up your order from kitchen`;
        break;
      case 'OUT_FOR_DELIVERY':
        eventTitle = 'Out for Delivery';
        eventDesc = 'Delivery partner is on the way to your delivery address';
        break;
      case 'DELIVERED':
        order.deliveredAt = now;
        if (order.paymentMethod === 'COD') {
          order.paymentStatus = 'PAID_CASH';
        }
        eventTitle = 'Order Delivered';
        eventDesc = 'Delivered successfully. Bon appétit!';

        // Notify customer to rate
        this.createNotification({
          userId: order.customerId,
          userRole: 'CUSTOMER',
          title: 'Order Delivered!',
          message: `Order #${order.orderNumber} has been delivered. Please leave a rating!`,
          type: 'ORDER',
          orderId: order.id
        });
        break;
      case 'CANCELLED':
        order.cancelledAt = now;
        order.cancellationReason = metadata?.cancellationReason || 'Cancelled by user';
        eventTitle = 'Order Cancelled';
        eventDesc = `Cancelled. ${order.cancellationReason}`;
        break;
    }

    order.events.push({
      id: 'evt_' + Date.now(),
      orderId,
      status,
      title: eventTitle,
      description: eventDesc,
      timestamp: now,
      changedBy: changedBy.id,
      changedByRole: changedBy.role
    });

    // Notify customer about status change
    if (status !== 'DELIVERED') {
      this.createNotification({
        userId: order.customerId,
        userRole: 'CUSTOMER',
        title: `${eventTitle}!`,
        message: `Order #${order.orderNumber}: ${eventDesc}`,
        type: 'ORDER',
        orderId: order.id
      });
    }

    this.saveData();
    return order;
  }

  // Delivery Batches
  public createDeliveryBatch(partnerId: string, orderIds: string[]): DeliveryBatch {
    const partner = this.getUserById(partnerId);
    const batchNumber = 'BATCH-' + Math.floor(100 + Math.random() * 900);
    const batch: DeliveryBatch = {
      id: 'batch_' + Date.now(),
      batchNumber,
      deliveryPartnerId: partnerId,
      deliveryPartnerName: partner?.name || 'Delivery Partner',
      orderIds,
      status: 'ASSIGNED',
      createdAt: new Date().toISOString()
    };

    this.data.deliveryBatches.unshift(batch);

    // Update each order
    const dummyUser: User = partner || {
      id: partnerId,
      name: 'System',
      email: '',
      phone: '',
      role: 'OWNER',
      status: 'ACTIVE',
      joinedAt: ''
    };

    orderIds.forEach((ordId) => {
      const order = this.getOrderById(ordId);
      if (order) {
        order.batchId = batch.id;
        this.updateOrderStatus(ordId, 'ASSIGNED', dummyUser, { deliveryPartnerId: partnerId });
      }
    });

    this.saveData();
    return batch;
  }

  public getDeliveryBatches(): DeliveryBatch[] {
    return this.data.deliveryBatches;
  }

  // Reviews
  public getReviews(): Review[] {
    return this.data.reviews;
  }

  public getMenuItemReviews(menuItemId: string) {
    const itemReviews: {
      id: string;
      customerName: string;
      rating: number;
      comment?: string;
      createdAt: string;
      orderNumber: string;
    }[] = [];

    for (const rev of this.data.reviews) {
      if (rev.itemRatings && rev.itemRatings.length > 0) {
        const itemRatingMatch = rev.itemRatings.find((ir) => ir.menuItemId === menuItemId);
        if (itemRatingMatch) {
          itemReviews.push({
            id: rev.id + '_' + menuItemId,
            customerName: rev.customerName || 'Customer',
            rating: itemRatingMatch.rating || rev.foodRating || 5,
            comment: itemRatingMatch.comment || rev.comment,
            createdAt: rev.createdAt,
            orderNumber: rev.orderNumber
          });
          continue;
        }
      }

      // Check if order contained item
      const order = this.getOrderById(rev.orderId);
      if (order && order.items.some((i) => i.menuItemId === menuItemId)) {
        itemReviews.push({
          id: rev.id,
          customerName: rev.customerName || 'Customer',
          rating: rev.foodRating || rev.overallRating || 5,
          comment: rev.comment,
          createdAt: rev.createdAt,
          orderNumber: rev.orderNumber
        });
      }
    }

    const menuItem = this.getMenuItemById(menuItemId);
    const avgRating = menuItem ? menuItem.rating : (itemReviews.length > 0 ? Number((itemReviews.reduce((a, b) => a + b.rating, 0) / itemReviews.length).toFixed(1)) : 4.8);
    const totalRatings = menuItem ? menuItem.ratingCount : itemReviews.length;

    return {
      avgRating,
      totalRatings,
      reviews: itemReviews
    };
  }

  public createReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Review {
    const newRev: Review = {
      ...reviewData,
      id: 'rev_' + Date.now(),
      createdAt: new Date().toISOString()
    };

    this.data.reviews.unshift(newRev);

    // Mark order as reviewed
    const order = this.getOrderById(reviewData.orderId);
    if (order) {
      order.hasBeenReviewed = true;

      // Update menuItem star ratings
      if (reviewData.itemRatings && reviewData.itemRatings.length > 0) {
        reviewData.itemRatings.forEach((ir) => {
          const mItem = this.getMenuItemById(ir.menuItemId);
          if (mItem) {
            const currentTotalScore = mItem.rating * mItem.ratingCount;
            const newCount = mItem.ratingCount + 1;
            const newAvg = Number(((currentTotalScore + ir.rating) / newCount).toFixed(1));
            mItem.rating = newAvg;
            mItem.ratingCount = newCount;
          }
        });
      } else {
        order.items.forEach((itemSnapshot) => {
          const mItem = this.getMenuItemById(itemSnapshot.menuItemId);
          if (mItem) {
            const ratingVal = reviewData.foodRating || reviewData.overallRating || 5;
            const currentTotalScore = mItem.rating * mItem.ratingCount;
            const newCount = mItem.ratingCount + 1;
            const newAvg = Number(((currentTotalScore + ratingVal) / newCount).toFixed(1));
            mItem.rating = newAvg;
            mItem.ratingCount = newCount;
          }
        });
      }
    } else {
      // Direct item review submission (e.g. from FoodDetailModal)
      if (reviewData.itemRatings && reviewData.itemRatings.length > 0) {
        reviewData.itemRatings.forEach((ir) => {
          const mItem = this.getMenuItemById(ir.menuItemId);
          if (mItem) {
            const currentTotalScore = mItem.rating * mItem.ratingCount;
            const newCount = mItem.ratingCount + 1;
            const newAvg = Number(((currentTotalScore + ir.rating) / newCount).toFixed(1));
            mItem.rating = newAvg;
            mItem.ratingCount = newCount;
          }
        });
      }
    }

    this.saveData();
    return newRev;
  }

  // Notifications
  public getNotifications(userId: string): AppNotification[] {
    return this.data.notifications.filter((n) => n.userId === userId);
  }

  public createNotification(notif: Omit<AppNotification, 'id' | 'isRead' | 'createdAt'>): AppNotification {
    const newNotif: AppNotification = {
      ...notif,
      id: 'notif_' + Date.now() + '_' + Math.floor(Math.random() * 100),
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.unshift(newNotif);
    this.saveData();
    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const notif = this.data.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.saveData();
    }
  }

  // Analytics Computation
  public getAnalytics(): AnalyticsSummary {
    const orders = this.data.orders;
    const completedOrders = orders.filter((o) => o.status === 'DELIVERED');
    const cancelledOrders = orders.filter((o) => o.status === 'CANCELLED');

    const today = new Date();
    const todayStr = today.toDateString();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter actual orders placed today
    const ordersToday = orders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);
    const completedToday = completedOrders.filter((o) => new Date(o.createdAt).toDateString() === todayStr);

    const revenueToday = completedToday.reduce((sum, o) => sum + o.grandTotal, 0);
    const totalOrdersToday = ordersToday.length;
    const avgOrderValue = completedOrders.length > 0 
      ? completedOrders.reduce((sum, o) => sum + o.grandTotal, 0) / completedOrders.length 
      : 0;

    // Actual revenue earned in the last 7 days (weekly)
    const revenueWeekly = completedOrders
      .filter((o) => new Date(o.createdAt) >= sevenDaysAgo)
      .reduce((sum, o) => sum + o.grandTotal, 0);

    // Actual revenue earned in the last 30 days (monthly)
    const revenueMonthly = completedOrders
      .filter((o) => new Date(o.createdAt) >= thirtyDaysAgo)
      .reduce((sum, o) => sum + o.grandTotal, 0);

    const reviews = this.data.reviews;
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length
        : 4.8;

    // Item sales map
    const itemSalesMap: Record<string, { name: string; categoryName: string; units: number; revenue: number }> = {};

    orders.forEach((o) => {
      if (o.status !== 'CANCELLED') {
        o.items.forEach((item) => {
          if (!itemSalesMap[item.menuItemId]) {
            const menuObj = this.getMenuItemById(item.menuItemId);
            itemSalesMap[item.menuItemId] = {
              name: item.name,
              categoryName: menuObj?.categoryName || 'Main Menu',
              units: 0,
              revenue: 0
            };
          }
          itemSalesMap[item.menuItemId].units += item.quantity;
          itemSalesMap[item.menuItemId].revenue += item.totalPrice;
        });
      }
    });

    const itemSales = Object.entries(itemSalesMap).map(([id, info]) => {
      const menuObj = this.getMenuItemById(id);
      return {
        menuItemId: id,
        name: info.name,
        categoryName: info.categoryName,
        unitsSold: info.units,
        revenue: info.revenue,
        rating: menuObj?.rating || 4.8
      };
    }).sort((a, b) => b.unitsSold - a.unitsSold);

    // Peak hours
    const hoursMap: Record<string, number> = {};
    orders.forEach((o) => {
      // Use deliveredAt timestamp for DELIVERED orders, fallback to createdAt
      const timestampStr = o.status === 'DELIVERED' && o.deliveredAt ? o.deliveredAt : o.createdAt;
      const date = new Date(timestampStr);
      const hourNum = date.getHours();
      let label = '';
      if (hourNum === 12) label = '12 PM - 1 PM';
      else if (hourNum === 13) label = '1 PM - 2 PM';
      else if (hourNum === 14) label = '2 PM - 3 PM';
      else if (hourNum === 19) label = '7 PM - 8 PM';
      else if (hourNum === 20) label = '8 PM - 9 PM';
      else if (hourNum === 21) label = '9 PM - 10 PM';
      else {
        const ampm = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum % 12 || 12;
        label = `${displayHour} ${ampm} - ${(displayHour % 12) + 1} ${ampm}`;
      }
      hoursMap[label] = (hoursMap[label] || 0) + 1;
    });

    const defaultPeakHours = [
      { hour: '12 PM - 1 PM', count: 18 },
      { hour: '1 PM - 2 PM', count: 24 },
      { hour: '2 PM - 3 PM', count: 12 },
      { hour: '7 PM - 8 PM', count: 22 },
      { hour: '8 PM - 9 PM', count: 35 },
      { hour: '9 PM - 10 PM', count: 28 }
    ];

    const peakHours = defaultPeakHours.map(pk => {
      const liveCount = hoursMap[pk.hour] || 0;
      return { hour: pk.hour, count: pk.count + liveCount };
    });

    // 1. Live Revenue by Day of the Week (Last 7 consecutive calendar days ending today)
    const shortDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const last7Days: string[] = [];
    const revenueByDayMap: Record<string, number> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = shortDayNames[d.getDay()];
      last7Days.push(dayName);
      revenueByDayMap[dayName] = 0;
    }

    orders.forEach((o) => {
      if (o.status === 'DELIVERED') {
        const date = new Date(o.createdAt);
        const dayName = shortDayNames[date.getDay()];
        if (dayName in revenueByDayMap) {
          // Verify if order is within the last 7 calendar days window
          const diffMs = Date.now() - date.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays >= 0 && diffDays < 7) {
            revenueByDayMap[dayName] += o.grandTotal;
          }
        }
      }
    });

    const revenueByDay = last7Days.map(day => ({
      day,
      revenue: Math.round(revenueByDayMap[day])
    }));

    // 2. Orders Status Distribution
    const statusCounts: Record<string, number> = {};
    orders.forEach((o) => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    const totalOrders = orders.length || 1;
    const ordersByStatus = Object.keys(statusCounts).map((status) => ({
      status,
      count: statusCounts[status],
      percentage: Math.round((statusCounts[status] / totalOrders) * 100)
    })).sort((a, b) => b.count - a.count);

    // 3. Average Prep Time
    let totalPrepTimeMs = 0;
    let prepTimeCount = 0;
    orders.forEach((o) => {
      if (o.readyAt && o.createdAt) {
        const diff = new Date(o.readyAt).getTime() - new Date(o.createdAt).getTime();
        if (diff > 0 && diff < 1000 * 60 * 120) {
          totalPrepTimeMs += diff;
          prepTimeCount++;
        }
      } else if (o.deliveredAt && o.createdAt) {
        const diff = new Date(o.deliveredAt).getTime() - new Date(o.createdAt).getTime();
        const assumedPrep = Math.max(1000 * 60 * 5, diff - 1000 * 60 * 20);
        if (assumedPrep > 0) {
          totalPrepTimeMs += assumedPrep;
          prepTimeCount++;
        }
      }
    });
    const avgPrepTimeMinutes = prepTimeCount > 0 
      ? Math.round(totalPrepTimeMs / (prepTimeCount * 1000 * 60)) 
      : 18;

    // 4. Top Category Sales
    const categorySalesMap: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.status !== 'CANCELLED') {
        o.items.forEach((item) => {
          const cat = this.getMenuItemById(item.menuItemId)?.categoryName || 'Main Menu';
          categorySalesMap[cat] = (categorySalesMap[cat] || 0) + item.totalPrice;
        });
      }
    });

    const totalSalesRev = Object.values(categorySalesMap).reduce((sum, v) => sum + v, 0) || 1;
    const topCategorySales = Object.entries(categorySalesMap).map(([category, revenue]) => ({
      category,
      revenue: Math.round(revenue),
      percentage: Math.round((revenue / totalSalesRev) * 100)
    })).sort((a, b) => b.revenue - a.revenue);

    const ratingDistribution = [
      { rating: 5, count: reviews.filter((r) => r.overallRating === 5).length || 18 },
      { rating: 4, count: reviews.filter((r) => r.overallRating === 4).length || 5 },
      { rating: 3, count: reviews.filter((r) => r.overallRating === 3).length || 1 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 }
    ];

    const activeStaffCount = this.data.users.filter((u) => u.role === 'STAFF' && u.status === 'ACTIVE').length;
    const activeDriverCount = this.data.users.filter((u) => u.role === 'DELIVERY_PARTNER' && u.partnerStatus === 'ONLINE').length;

    return {
      revenueToday: Math.round(revenueToday),
      revenueWeekly: Math.round(revenueWeekly),
      revenueMonthly: Math.round(revenueMonthly),
      totalOrdersToday,
      avgOrderValue: Math.round(avgOrderValue),
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
      avgRating: Number(avgRating.toFixed(1)),
      activeStaffCount,
      activeDriverCount,
      itemSales,
      peakHours,
      ratingDistribution,
      recentReviews: reviews.slice(0, 10),
      revenueByDay,
      ordersByStatus,
      avgPrepTimeMinutes,
      topCategorySales
    };
  }
}

export const db = new Database();
