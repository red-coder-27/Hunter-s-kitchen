export type UserRole = 'CUSTOMER' | 'STAFF' | 'ADMIN' | 'OWNER' | 'DELIVERY_PARTNER';

export type StaffSubRole =
  | 'KITCHEN_MANAGER'
  | 'HEAD_CHEF'
  | 'LINE_COOK'
  | 'FRONT_DESK'
  | 'KITCHEN_CHEF'
  | 'ORDER_BILLER'
  | 'STORE_DISPATCHER'
  | 'GENERAL_MANAGER';

export type Permission =
  | 'orders.read'
  | 'orders.create'
  | 'orders.update'
  | 'orders.cancel'
  | 'orders.assign'
  | 'orders.deliver'
  | 'menu.read'
  | 'menu.create'
  | 'menu.update'
  | 'menu.delete'
  | 'menu.availability'
  | 'users.read'
  | 'users.create'
  | 'users.update'
  | 'users.suspend'
  | 'analytics.read'
  | 'audit.read'
  | 'reconciliation.read'
  | 'settings.update'
  | 'batches.manage';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  staffRole?: StaffSubRole; // For staff roles (Kitchen, Billing, Dispatcher)
  avatar?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'SUSPENDED';
  partnerStatus?: 'ONLINE' | 'OFFLINE'; // For delivery partner
  vehicleNumber?: string; // For delivery partner
  vehicleType?: string;   // For delivery partner
  currentRating?: number;
  totalDeliveries?: number;
  joinedAt: string;
  permissions?: string[];
  restaurantId?: string;
  googleId?: string; // Stable Google Subject Identifier (sub)
  emailVerified?: boolean;
}

export interface Address {
  id: string;
  type: 'HOME' | 'WORK' | 'OTHER';
  name: string;
  phone: string;
  doorNo: string;
  street: string;
  area: string;
  city: string;
  pincode: string;
  landmark?: string;
  instructions?: string;
  coordinates?: string;
  isDefault?: boolean;
}

export interface CustomizationOption {
  id: string;
  name: string; // e.g. "Spice Level"
  options: { label: string; price: number }[]; // e.g. [{ label: "Mild", price: 0 }, { label: "Spicy", price: 0 }]
}

export interface AddonOption {
  id: string;
  name: string; // e.g. "Extra Gravy"
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  price: number;
  discountPrice?: number;
  imageUrl: string;
  isVeg: boolean;
  isAvailable: boolean;
  prepTimeMinutes: number;
  isPopular?: boolean;
  isBestseller?: boolean;
  rating: number;
  ratingCount: number;
  customizations?: CustomizationOption[];
  addons?: AddonOption[];
  ingredients?: string[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  itemCount?: number;
}

export interface CartCustomizationSelection {
  optionName: string;
  selectedLabel: string;
  price: number;
}

export interface CartAddonSelection {
  addonId: string;
  name: string;
  price: number;
}

export interface CartItem {
  cartItemId: string; // Unique client cart item key
  menuItem: MenuItem;
  quantity: number;
  customizations: CartCustomizationSelection[];
  addons: CartAddonSelection[];
  specialInstructions?: string;
  itemTotalPrice: number; // Price per unit including options * quantity
}

export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'ONLINE' | 'COD';
export type PaymentStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'COD_PENDING'
  | 'PAID_CASH'
  | 'FAILED'
  | 'REFUNDED';

export interface OrderItemSnapshot {
  menuItemId: string;
  name: string;
  unitPrice: number; // Snapshot of price at time of order
  quantity: number;
  isVeg: boolean;
  customizations: CartCustomizationSelection[];
  addons: CartAddonSelection[];
  specialInstructions?: string;
  totalPrice: number;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  status: OrderStatus;
  title: string;
  description: string;
  timestamp: string;
  changedBy: string; // User ID or system
  changedByRole: UserRole;
}

export interface ScheduledSlot {
  type: 'NOW' | 'SCHEDULED';
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  date?: string; // e.g. "2026-08-13"
  dateLabel?: string; // e.g. "Tomorrow, Aug 13"
  timeSlot?: string; // e.g. "07:30 PM - 08:00 PM"
  formattedText?: string;
}

export interface OrderChecklist {
  correctOrderNumber: boolean;
  correctCustomerDetails: boolean;
  correctItemsAndQty: boolean;
  specialInstructionsChecked: boolean;
  packagingChecked: boolean;
  paymentMethodChecked: boolean;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. HK-20260812-000102
  customerId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: Address;
  items: OrderItemSnapshot[];
  orderNotes?: string;
  
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  grandTotal: number;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentTransactionId?: string;
  codCashTendered?: number;
  codChangeDue?: number;

  status: OrderStatus;
  rejectionReason?: string;
  cancellationReason?: string;

  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedDeliveryPartnerId?: string;
  assignedDeliveryPartnerName?: string;
  assignedDeliveryPartnerPhone?: string;
  assignedDeliveryPartnerVehicle?: string;

  batchId?: string;
  checklist?: OrderChecklist;
  scheduledSlot?: ScheduledSlot;

  createdAt: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;

  events: OrderEvent[];
  hasBeenReviewed?: boolean;
  version?: number;
  updatedAt?: string;
}

export interface DeliveryBatch {
  id: string;
  batchNumber: string; // e.g. BATCH-101
  deliveryPartnerId: string;
  deliveryPartnerName: string;
  orderIds: string[];
  status: 'ASSIGNED' | 'IN_TRANSIT' | 'COMPLETED';
  createdAt: string;
  completedAt?: string;
}

export interface Review {
  id: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  foodRating: number;
  deliveryRating: number;
  overallRating: number;
  comment?: string;
  createdAt: string;
  itemRatings?: { menuItemId: string; menuItemName: string; rating: number; comment?: string }[];
}

export interface AppNotification {
  id: string;
  userId: string;
  userRole: UserRole;
  title: string;
  message: string;
  type: 'ORDER' | 'PAYMENT' | 'OFFER' | 'SYSTEM';
  isRead: boolean;
  createdAt: string;
  orderId?: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  phone: string;
  email: string;
  address: string;
  isOpen: boolean;
  temporaryPause: boolean;
  pauseReason?: string;
  openingTime: string;
  closingTime: string;
  deliveryRadiusKm: number;
  baseDeliveryFee: number;
  freeDeliveryThreshold: number;
  codEnabled: boolean;
  onlinePaymentEnabled: boolean;
  announcement?: string;
}

export interface AnalyticsSummary {
  revenueToday: number;
  revenueWeekly: number;
  revenueMonthly: number;
  totalOrdersToday: number;
  avgOrderValue: number;
  completedOrders: number;
  cancelledOrders: number;
  avgRating: number;
  activeStaffCount: number;
  activeDriverCount: number;
  itemSales: {
    menuItemId: string;
    name: string;
    categoryName: string;
    unitsSold: number;
    revenue: number;
    rating: number;
  }[];
  peakHours: { hour: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
  recentReviews: Review[];
  revenueByDay?: { day: string; revenue: number }[];
  ordersByStatus?: { status: string; count: number; percentage: number }[];
  avgPrepTimeMinutes?: number;
  topCategorySales?: { category: string; revenue: number; percentage: number }[];
}
