import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, MenuItem, Address, CartCustomizationSelection, CartAddonSelection } from '../types';
import { useAuth } from './AuthContext';
import { apiService } from '../services/api';

interface CartContextType {
  cartItems: CartItem[];
  selectedAddress: Address | null;
  savedAddresses: Address[];
  orderNotes: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  grandTotal: number;
  totalItemCount: number;

  addToCart: (
    menuItem: MenuItem,
    quantity?: number,
    customizations?: CartCustomizationSelection[],
    addons?: CartAddonSelection[],
    specialInstructions?: string
  ) => void;
  updateQuantity: (cartItemId: string, newQuantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  setSelectedAddress: (address: Address | null) => void;
  setOrderNotes: (notes: string) => void;
  refreshAddresses: () => Promise<void>;
  saveNewAddress: (addr: Partial<Address>) => Promise<Address>;
  updateAddress: (addressId: string, addr: Partial<Address>) => Promise<Address>;
  deleteAddress: (addressId: string) => Promise<void>;
  isAddressModalOpen: boolean;
  setIsAddressModalOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser, settings } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('hk_cart_items');
    return saved ? JSON.parse(saved) : [];
  });

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [orderNotes, setOrderNotes] = useState('');
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Save cart to local storage
  useEffect(() => {
    localStorage.setItem('hk_cart_items', JSON.stringify(cartItems));
  }, [cartItems]);

  // Load addresses when customer user changes
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'CUSTOMER') {
      setSavedAddresses([]);
      setSelectedAddress(null);
      return;
    }
    refreshAddresses();
  }, [currentUser?.id, currentUser?.role]);

  const refreshAddresses = async () => {
    if (!currentUser || currentUser.role !== 'CUSTOMER') return;
    const userId = currentUser.id;

    try {
      const addrs = await apiService.getAddresses(userId);
      if (Array.isArray(addrs) && addrs.length > 0) {
        setSavedAddresses(addrs);
        if (!selectedAddress || !addrs.some((a) => a.id === selectedAddress.id)) {
          const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
          setSelectedAddress(defaultAddr);
        }
      } else {
        setSavedAddresses([]);
        setSelectedAddress(null);
      }
    } catch (err) {
      console.warn('Error fetching addresses:', err);
      setSavedAddresses([]);
      setSelectedAddress(null);
    }
  };

  const saveNewAddress = async (addr: Partial<Address>): Promise<Address> => {
    const userId = currentUser?.id || 'user_cust_1';
    try {
      const newAddr = await apiService.saveAddress(userId, addr);
      setSavedAddresses((prev) => {
        const updated = addr.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : [...prev];
        return [...updated, newAddr];
      });
      if (!selectedAddress || addr.isDefault) {
        setSelectedAddress(newAddr);
      }
      return newAddr;
    } catch (err) {
      console.warn('API save address failed, applying local state:', err);
      const fallbackAddr: Address = {
        id: 'addr_' + Date.now(),
        name: addr.name || currentUser?.name || 'Customer',
        phone: addr.phone || currentUser?.phone || '',
        doorNo: addr.doorNo || '',
        street: addr.street || '',
        area: addr.area || '',
        city: addr.city || 'Coimbatore',
        pincode: addr.pincode || '641001',
        type: addr.type || 'HOME',
        coordinates: addr.coordinates,
        isDefault: addr.isDefault || false
      };
      setSavedAddresses((prev) => [...prev, fallbackAddr]);
      setSelectedAddress(fallbackAddr);
      return fallbackAddr;
    }
  };

  const updateAddress = async (addressId: string, addr: Partial<Address>): Promise<Address> => {
    const userId = currentUser?.id || 'user_cust_1';

    // Optimistically update local state
    let updatedLocal: Address | null = null;
    setSavedAddresses((prev) =>
      prev.map((a) => {
        if (a.id === addressId) {
          updatedLocal = { ...a, ...addr };
          return updatedLocal;
        }
        return a;
      })
    );
    if (updatedLocal && selectedAddress?.id === addressId) {
      setSelectedAddress(updatedLocal);
    }

    try {
      const serverUpdated = await apiService.updateAddress(userId, addressId, addr);
      if (serverUpdated) {
        setSavedAddresses((prev) =>
          prev.map((a) => (a.id === addressId ? serverUpdated : a))
        );
        if (selectedAddress?.id === addressId) {
          setSelectedAddress(serverUpdated);
        }
        return serverUpdated;
      }
    } catch (err) {
      console.warn('API update address failed, using local optimistic state:', err);
    }
    return updatedLocal || ({ id: addressId, ...addr } as Address);
  };

  const deleteAddress = async (addressId: string): Promise<void> => {
    const userId = currentUser?.id || 'user_cust_1';

    // Optimistically delete from local state
    setSavedAddresses((prev) => {
      const remaining = prev.filter((a) => a.id !== addressId);
      if (selectedAddress?.id === addressId) {
        setSelectedAddress(remaining[0] || null);
      }
      return remaining;
    });

    try {
      await apiService.deleteAddress(userId, addressId);
    } catch (err) {
      console.warn('API delete address failed:', err);
    }
  };

  const addToCart = (
    menuItem: MenuItem,
    quantity = 1,
    customizations: CartCustomizationSelection[] = [],
    addons: CartAddonSelection[] = [],
    specialInstructions = ''
  ) => {
    const unitPrice = menuItem.discountPrice || menuItem.price;
    let extraPrice = 0;
    customizations.forEach((c) => (extraPrice += c.price || 0));
    addons.forEach((a) => (extraPrice += a.price || 0));

    const singleUnitPrice = unitPrice + extraPrice;
    const itemKey = `${menuItem.id}_${JSON.stringify(customizations)}_${JSON.stringify(addons)}_${specialInstructions}`;

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.cartItemId === itemKey);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          itemTotalPrice: singleUnitPrice * newQty
        };
        return updated;
      }

      return [
        ...prev,
        {
          cartItemId: itemKey,
          menuItem,
          quantity,
          customizations,
          addons,
          specialInstructions,
          itemTotalPrice: singleUnitPrice * quantity
        }
      ];
    });
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const unitPrice = item.menuItem.discountPrice || item.menuItem.price;
          let extra = 0;
          item.customizations.forEach((c) => (extra += c.price || 0));
          item.addons.forEach((a) => (extra += a.price || 0));
          const perUnit = unitPrice + extra;

          return {
            ...item,
            quantity: newQuantity,
            itemTotalPrice: perUnit * newQuantity
          };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setOrderNotes('');
  };

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.itemTotalPrice, 0);
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const freeThreshold = settings?.freeDeliveryThreshold || 500;
  const baseFee = settings?.baseDeliveryFee || 35;
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= freeThreshold ? 0 : baseFee;
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const grandTotal = subtotal + deliveryFee + tax;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        selectedAddress,
        savedAddresses,
        orderNotes,
        subtotal,
        deliveryFee,
        tax,
        grandTotal,
        totalItemCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        setSelectedAddress,
        setOrderNotes,
        refreshAddresses,
        saveNewAddress,
        updateAddress,
        deleteAddress,
        isAddressModalOpen,
        setIsAddressModalOpen
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
