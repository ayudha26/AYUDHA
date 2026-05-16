import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '@src/Types/types';
import supabase from '@config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockProducts } from '@src/Utils/mockData';
import { Session } from '@supabase/supabase-js';

const GUEST_CART_STORAGE_KEY = 'tooldrop_guest_cart_v1';

type GuestCartStorageItem = {
  product_id: string;
  quantity: number;
};

interface CartContextType {
  cartItems: (CartItem & { product?: Product })[];
  loading: boolean;
  mutating: boolean;
  error: string | null;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  cartTotal: number;
  refreshCart: () => Promise<void>;
  clearError: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<(CartItem & { product?: Product })[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveGuestCart = async (items: (CartItem & { product?: Product })[]) => {
    const payload: GuestCartStorageItem[] = items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }));
    await AsyncStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(payload));
  };

  const loadProductsByIds = async (productIds: string[]) => {
    if (!productIds.length) {
      return new Map<string, Product>();
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (error) {
        throw error;
      }

      return new Map<string, Product>((data || []).map((product) => [product.id, product]));
    } catch (fetchError) {
      return new Map<string, Product>(
        mockProducts
          .filter((product) => productIds.includes(product.id))
          .map((product) => [product.id, product])
      );
    }
  };

  const loadGuestCart = async (): Promise<(CartItem & { product?: Product })[]> => {
    const raw = await AsyncStorage.getItem(GUEST_CART_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as GuestCartStorageItem[]) : [];
    const normalized = parsed.filter((item) => item.product_id && item.quantity > 0);
    const productIds = normalized.map((item) => item.product_id);
    const productMap = await loadProductsByIds(productIds);

    return normalized.map((item) => ({
      id: `guest-${item.product_id}`,
      user_id: 'guest',
      product_id: item.product_id,
      quantity: item.quantity,
      product:
        productMap.get(item.product_id) ||
        mockProducts.find((product) => product.id === item.product_id),
    }));
  };

  const migrateGuestCartToUser = async (userId: string) => {
    const guestItems = await loadGuestCart();

    if (!guestItems.length) {
      return;
    }

    const { data: existingItems, error: existingError } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity')
      .eq('user_id', userId);

    if (existingError) {
      throw existingError;
    }

    const existingMap = new Map(
      (existingItems || []).map((item) => [item.product_id, item])
    );

    const updates = guestItems
      .filter((item) => existingMap.has(item.product_id))
      .map((item) => ({
        id: existingMap.get(item.product_id)!.id,
        quantity: existingMap.get(item.product_id)!.quantity + item.quantity,
        updated_at: new Date().toISOString(),
      }));

    const inserts = guestItems
      .filter((item) => !existingMap.has(item.product_id))
      .map((item) => ({
        user_id: userId,
        product_id: item.product_id,
        quantity: item.quantity,
      }));

    if (updates.length) {
      const { error: updateError } = await supabase
        .from('cart_items')
        .upsert(updates, { onConflict: 'id' });

      if (updateError) {
        throw updateError;
      }
    }

    if (inserts.length) {
      const { error: insertError } = await supabase
        .from('cart_items')
        .insert(inserts);

      if (insertError) {
        throw insertError;
      }
    }

    await AsyncStorage.removeItem(GUEST_CART_STORAGE_KEY);
  };

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const guestItems = await loadGuestCart();
        setCartItems(guestItems);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products (*)
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems(data || []);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      setError('Could not sync cart items. Pull to refresh and try again.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: string, quantity: number) => {
    try {
      setMutating(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const existingItem = cartItems.find(item => item.product_id === productId);
        let nextItems: (CartItem & { product?: Product })[];

        if (existingItem) {
          nextItems = cartItems.map((item) =>
            item.product_id === productId ? { ...item, quantity: item.quantity + quantity } : item
          );
        } else {
          const productLookup = await loadProductsByIds([productId]);
          nextItems = [
            ...cartItems,
            {
              id: `guest-${productId}`,
              user_id: 'guest',
              product_id: productId,
              quantity,
              product:
                productLookup.get(productId) ||
                mockProducts.find((product) => product.id === productId),
            },
          ];
        }

        setCartItems(nextItems);
        await saveGuestCart(nextItems);
        return;
      }

      const existingItem = cartItems.find(item => item.product_id === productId);

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity,
          });

        if (error) throw error;
      }

      await fetchCartItems();
    } catch (error) {
      console.error('Error adding to cart:', error);
      setError('Could not add item to cart right now.');
      throw error;
    } finally {
      setMutating(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      setMutating(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const nextItems = cartItems.filter((item) => item.id !== itemId);
        setCartItems(nextItems);
        await saveGuestCart(nextItems);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      await fetchCartItems();
    } catch (error) {
      console.error('Error removing from cart:', error);
      setError('Could not remove item from cart right now.');
      throw error;
    } finally {
      setMutating(false);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    try {
      setMutating(true);
      setError(null);
      if (quantity <= 0) {
        await removeFromCart(itemId);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const nextItems = cartItems.map((item) =>
          item.id === itemId ? { ...item, quantity } : item
        );
        setCartItems(nextItems);
        await saveGuestCart(nextItems);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (error) throw error;
      await fetchCartItems();
    } catch (error) {
      console.error('Error updating quantity:', error);
      setError('Could not update quantity right now.');
      throw error;
    } finally {
      setMutating(false);
    }
  };

  const clearCart = async () => {
    try {
      setMutating(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setCartItems([]);
        await saveGuestCart([]);
        return;
      }

      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setCartItems([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
      setError('Could not clear cart right now.');
      throw error;
    } finally {
      setMutating(false);
    }
  };

  const cartTotal = cartItems.reduce((total, item) => {
    return total + (item.product?.price || 0) * item.quantity;
  }, 0);

  const refreshCart = fetchCartItems;
  const clearError = () => setError(null);

  useEffect(() => {
    fetchCartItems();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session: Session | null) => {
      try {
        if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          await migrateGuestCartToUser(session.user.id);
        }
      } catch (migrationError) {
        console.error('Error migrating guest cart:', migrationError);
        setError('Could not sync your saved cart to your account.');
      } finally {
        fetchCartItems();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        loading,
        mutating,
        error,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        refreshCart,
        clearError,
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
