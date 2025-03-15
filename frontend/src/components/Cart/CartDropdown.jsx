import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Close as CloseIcon
} from '@mui/icons-material';
import { useCart } from '../../contexts/CartContext';
import { config } from '../../config';

const CartDropdown = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { cartItems, orderQuantities, removeFromCart, clearCart, totalItems, totalPrice } = useCart();
  const [anchorEl, setAnchorEl] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
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
  
  const handleCheckout = () => {
    navigate('/quickorder');
    handleClose();
  };
  
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
                      <Typography component="span" variant="body2">
                        {orderQuantities[item.id]} × {config.defaultCurrency}{item.price}
                      </Typography>
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
              >
                Checkout
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
      >
        <Badge badgeContent={totalItems} color="secondary">
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
