import { createContext, useContext, useState, useEffect } from 'react';
import { config } from '../config';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [orderQuantities, setOrderQuantities] = useState({});
  
  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    const savedQuantities = localStorage.getItem('orderQuantities');
    
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Error parsing saved cart:', error);
        localStorage.removeItem('cart');
      }
    }
    
    if (savedQuantities) {
      try {
        setOrderQuantities(JSON.parse(savedQuantities));
      } catch (error) {
        console.error('Error parsing saved quantities:', error);
        localStorage.removeItem('orderQuantities');
      }
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
    localStorage.setItem('orderQuantities', JSON.stringify(orderQuantities));
  }, [cartItems, orderQuantities]);
  
  // Add item to cart
  const addToCart = (coral, quantity) => {
    // Update quantities
    setOrderQuantities(prev => ({
      ...prev,
      [coral.id]: (prev[coral.id] || 0) + quantity
    }));
    
    // Update cart items
    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === coral.id);
      if (existingIndex >= 0) {
        // Update existing item
        return prev;
      } else {
        // Add new item
        return [...prev, coral];
      }
    });
  };
  
  // Remove item from cart
  const removeFromCart = (coralId) => {
    setOrderQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[coralId];
      return newQuantities;
    });
    
    setCartItems(prev => prev.filter(item => item.id !== coralId));
  };
  
  // Update item quantity
  const updateQuantity = (coralId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(coralId);
      return;
    }
    
    setOrderQuantities(prev => ({
      ...prev,
      [coralId]: quantity
    }));
  };
  
  // Clear cart
  const clearCart = () => {
    setCartItems([]);
    setOrderQuantities({});
    localStorage.removeItem('cart');
    localStorage.removeItem('orderQuantities');
  };
  
  // Calculate total items and price
  const totalItems = Object.values(orderQuantities).reduce((sum, qty) => sum + qty, 0);
  const totalPrice = cartItems.reduce((sum, item) => {
    const quantity = orderQuantities[item.id] || 0;
    return sum + (item.price * quantity);
  }, 0);
  
  // Calculate discounted price if needed
  const getDiscountedPrice = (originalPrice, discountRate = 0) => {
    if (!discountRate) return originalPrice;
    
    const discountedPrice = originalPrice * (1 - (discountRate / 100));
    return Math.round(discountedPrice * 100) / 100; // Round to 2 decimal places
  };
  
  return (
    <CartContext.Provider value={{
      cartItems,
      orderQuantities,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      totalPrice,
      getDiscountedPrice
    }}>
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

export default CartContext;
