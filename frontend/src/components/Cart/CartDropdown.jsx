import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  IconButton,
  Badge,
  Popover,
  Drawer,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Delete as DeleteIcon,
  ShoppingCart as ShoppingCartIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { config } from '../../config';

const CartDropdown = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { cartItems, orderQuantities, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice } = useCart();
  const { user } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [animateCart, setAnimateCart] = useState(false);
  const prevTotalItemsRef = useRef(totalItems);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  
  const handleClick = (event) => {
    if (isMobile) {
      setDrawerOpen(true);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };
  
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
  
  // Check if we're on the QuickOrder page and get the selected client from localStorage
  useEffect(() => {
    if (location.pathname === '/quickorder') {
      const savedClient = localStorage.getItem('selectedClient');
      if (savedClient) {
        setSelectedClient(savedClient);
      }
    }
    
    // Listen for client selection changes
    const handleClientSelectionChange = (event) => {
      setSelectedClient(event.detail.selectedClient);
    };
    
    // Add event listener
    window.addEventListener('clientSelectionChanged', handleClientSelectionChange);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('clientSelectionChanged', handleClientSelectionChange);
    };
  }, [location.pathname]);

  const handleCheckout = () => {
    navigate('/quickorder');
    handleClose();
  };
  
  // Determine if the Place Order button should be disabled
  const isPlaceOrderDisabled = isAdmin && !selectedClient;
  
  const open = Boolean(anchorEl);
  
  // Cart content that will be used in both popover and drawer
  const cartContent = (
    <>
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid rgba(0,0,0,0.12)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <Typography variant="h6">Your Cart</Typography>
          <Typography variant="body2" color="text.secondary">
            {totalItems} item{totalItems !== 1 ? 's' : ''} in cart
          </Typography>
        </div>
        {isMobile && (
          <IconButton onClick={handleClose} edge="end">
            <CloseIcon />
          </IconButton>
        )}
      </Box>
      
      {cartItems.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body1">Your cart is empty</Typography>
        </Box>
      ) : (
        <>
          <List sx={{ py: 0 }}>
            {cartItems.map(item => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => removeFromCart(item.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
                divider
              >
                <ListItemAvatar>
                  <Avatar src={item.imageUrl} alt={item.speciesName} variant="rounded" />
                </ListItemAvatar>
                <ListItemText
                  primary={item.speciesName}
                  secondary={
                    <>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.id, Math.max(1, (orderQuantities[item.id] || 0) - 1));
                          }}
                          sx={{ p: 0.5 }}
                        >
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                        
                        <Typography component="span" variant="body2" sx={{ mx: 1 }}>
                          {orderQuantities[item.id]}
                        </Typography>
                        
                        <IconButton 
                          size="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.id, (orderQuantities[item.id] || 0) + 1);
                          }}
                          sx={{ p: 0.5 }}
                        >
                          <AddIcon fontSize="small" />
                        </IconButton>
                        
                        <Typography component="span" variant="body2" sx={{ ml: 1 }}>
                          × {config.defaultCurrency}{item.price}
                        </Typography>
                      </Box>
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
          
          <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.12)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1">Total:</Typography>
              <Typography variant="subtitle1" fontWeight="bold">
                {config.defaultCurrency}{totalPrice.toFixed(2)}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={clearCart}
                color="error"
                fullWidth
              >
                Clear Cart
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleCheckout}
                color="primary"
                fullWidth
                disabled={isPlaceOrderDisabled}
              >
                Place Order
              </Button>
            </Box>
          </Box>
        </>
      )}
    </>
  );
  
  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleClick}
        aria-label="cart"
        title="Cart"
        sx={{
          animation: animateCart ? 
            'cartBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) 2' : 
            'none',
          '@keyframes cartBounce': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.3)' }
          }
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
          <ShoppingCartIcon />
        </Badge>
      </IconButton>
      
      {/* Desktop Popover */}
      {!isMobile && (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <Paper sx={{ width: 320, maxHeight: 400, overflow: 'auto' }}>
            {cartContent}
          </Paper>
        </Popover>
      )}
      
      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          anchor="right"
          open={drawerOpen}
          onClose={handleClose}
          PaperProps={{
            sx: { 
              width: '80%', 
              maxWidth: 350,
              paddingTop: '64px' // To account for AppBar height
            }
          }}
        >
          {cartContent}
        </Drawer>
      )}
    </>
  );
};

export default CartDropdown;
