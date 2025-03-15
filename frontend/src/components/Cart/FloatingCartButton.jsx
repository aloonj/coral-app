import { useState, useEffect, useRef } from 'react';
import { Fab, Badge, useTheme, useMediaQuery } from '@mui/material';
import { ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';
import { useCart } from '../../contexts/CartContext';
import CartDropdown from './CartDropdown';

const FloatingCartButton = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { totalItems } = useCart();
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [animateCart, setAnimateCart] = useState(false);
  const prevTotalItemsRef = useRef(totalItems);
  const buttonRef = useRef(null);

  // Handle click on the floating cart button
  const handleClick = (event) => {
    if (isMobile) {
      setDrawerOpen(true);
    } else {
      setAnchorEl(buttonRef.current);
    }
  };

  // Handle closing the cart dropdown/drawer
  const handleClose = () => {
    if (isMobile) {
      setDrawerOpen(false);
    } else {
      setAnchorEl(null);
    }
  };

  // Detect changes in cart items to trigger animation
  useEffect(() => {
    // Only animate if items were added (not removed)
    if (totalItems > prevTotalItemsRef.current) {
      setAnimateCart(true);
      
      // Reset animation after it completes
      const timer = setTimeout(() => {
        setAnimateCart(false);
      }, 1000); // Animation duration
      
      return () => clearTimeout(timer);
    }
    
    prevTotalItemsRef.current = totalItems;
  }, [totalItems]);

  return (
    <>
      <Fab
        ref={buttonRef}
        color="primary"
        aria-label="cart"
        onClick={handleClick}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          animation: animateCart ? 
            'cartBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 2' : 
            'none',
          '@keyframes cartBounce': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.2)' }
          },
          // Make the button larger on desktop
          width: isMobile ? 56 : 64,
          height: isMobile ? 56 : 64,
        }}
      >
        <Badge 
          badgeContent={totalItems} 
          color="secondary"
          sx={{
            '& .MuiBadge-badge': {
              animation: animateCart ? 
                'badgePulse 1s cubic-bezier(0.4, 0, 0.6, 1)' : 
                'none',
              '@keyframes badgePulse': {
                '0%': { backgroundColor: theme.palette.secondary.main },
                '50%': { backgroundColor: theme.palette.success.main },
                '100%': { backgroundColor: theme.palette.secondary.main }
              }
            }
          }}
        >
          <ShoppingCartIcon fontSize={isMobile ? "medium" : "large"} />
        </Badge>
      </Fab>

      {/* Use the existing CartDropdown component for the dropdown/drawer */}
      <CartDropdown 
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        drawerOpen={drawerOpen}
        onClose={handleClose}
        floatingButton={true}
      />
    </>
  );
};

export default FloatingCartButton;
