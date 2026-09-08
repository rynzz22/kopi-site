export type DrinkCategory = 'all' | 'signature' | 'korean-specialty' | 'espresso' | 'non-coffee' | 'pastries' | 'cold-brew';

export type CupSize = 'Regular' | 'Large' | 'XL';
export type SugarLevel = '0%' | '25%' | '50%' | '75%' | '100%';
export type IceLevel = 'No Ice' | 'Less Ice' | 'Normal Ice' | 'Extra Ice';
export type Temperature = 'Iced' | 'Hot';
export type MilkChoice = 'Fresh Milk' | 'Oat Milk (+₱30)' | 'Almond Milk (+₱30)' | 'Soy Milk (+₱25)' | 'None';

export interface AddOnOption {
  id: string;
  name: string;
  price: number;
}

export interface CustomizationOptions {
  size: CupSize;
  sugar: SugarLevel;
  ice: IceLevel;
  temperature: Temperature;
  milk: string;
  addons: string[];
  specialInstructions?: string;
}

export interface Product {
  id: string;
  name: string;
  koreanName?: string;
  category: DrinkCategory;
  description: string;
  basePrice: number;
  image: string;
  rating: number;
  reviewCount: number;
  isPopular?: boolean;
  isNew?: boolean;
  isPastry?: boolean;
  tags: string[];
  tastingNotes?: string[];
  calories?: number;
  availableSizes?: CupSize[];
}

export interface CartItem {
  cartItemId: string;
  product: Product;
  customization: CustomizationOptions;
  quantity: number;
  itemPrice: number;
  totalPrice: number;
}

export type ViewType = 'home' | 'menu' | 'gallery' | 'about' | 'contact' | 'wishlist' | 'order-tracker';

export interface OrderItemSummary {
  name: string;
  quantity: number;
  size: string;
  customizationSummary: string;
  price: number;
}

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  phone: string;
  email: string;
  serviceType: 'takeout' | 'dine-in' | 'delivery';
  address?: string;
  tableNumber?: string;
  notes?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'gcash' | 'maya' | 'card' | 'cod';
  status: 'received' | 'brewing' | 'crafting' | 'ready' | 'completed';
  estimatedMinutes: number;
}

export interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'coffee' | 'non-coffee' | 'pastries' | 'ambience';
  image: string;
  linkedProductId?: string;
  notes?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'favorite' | 'cart';
}
