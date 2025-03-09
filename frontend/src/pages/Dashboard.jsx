import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { orderService, coralService } from '../services/api';
import styles from './Dashboard.module.css';
import { 
  Container, 
  Typography, 
  Grid, 
  Box, 
  Paper, 
  Button, 
  Chip,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Stack,
  Divider,
  useTheme
} from '@mui/material';
import HeroGallery from '../components/ImageGallery/HeroGallery';
import { 
  PageTitle, 
  StatCard, 
  StatusBadge 
} from '../components/StyledComponents';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

// Helper functions for order status transitions
const getNextStatus = (currentStatus) => {
  const statusFlow = {
    PENDING: 'CONFIRMED',
    CONFIRMED: 'PROCESSING',
    PROCESSING: 'READY_FOR_PICKUP',
    READY_FOR_PICKUP: 'COMPLETED'
  };
  return statusFlow[currentStatus];
};

const getPreviousStatus = (currentStatus) => {
  const statusFlow = {
    CONFIRMED: 'PENDING',
    PROCESSING: 'CONFIRMED',
    READY_FOR_PICKUP: 'PROCESSING',
    COMPLETED: 'READY_FOR_PICKUP'
  };
  return statusFlow[currentStatus];
};

const OrderStats = ({ orders, isAdmin, onStatusSelect, selectedStatus }) => {
  const theme = useTheme();
  
  const stats = {
    total: orders.filter(o => !o.archived && o.status !== 'CANCELLED' && o.status !== 'COMPLETED').length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    readyForPickup: orders.filter(o => o.status === 'READY_FOR_PICKUP').length
  };

  const statCards = [
    { 
      id: 'ALL', 
      title: 'Active Orders', 
      value: stats.total, 
      color: theme.palette.grey[500],
      borderColor: theme.palette.grey[500]
    },
    { 
      id: 'PENDING', 
      title: 'Pending', 
      value: stats.pending, 
      color: theme.palette.warning.main,
      borderColor: theme.palette.warning.main
    },
    { 
      id: 'CONFIRMED', 
      title: 'Confirmed', 
      value: stats.confirmed, 
      color: theme.palette.info.main,
      borderColor: theme.palette.info.main
    },
    { 
      id: 'PROCESSING', 
      title: 'Processing', 
      value: stats.processing, 
      color: theme.palette.primary.main,
      borderColor: theme.palette.primary.main
    },
    { 
      id: 'READY_FOR_PICKUP', 
      title: 'Ready for Pickup/Delivery', 
      value: stats.readyForPickup, 
      color: theme.palette.success.main,
      borderColor: theme.palette.success.main
    }
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 4 }}>
      {statCards.map(card => (
        <Grid item xs={6} sm={4} md={2.4} key={card.id}>
          <StatCard 
            active={selectedStatus === card.id}
            color={card.borderColor}
            onClick={() => onStatusSelect(card.id)}
          >
            <Typography 
              variant="subtitle1" 
              sx={{ 
                mb: 1, 
                fontWeight: 'bold',
                color: card.color
              }}
            >
              {card.title}
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold',
                color: theme.palette.text.primary
              }}
            >
              {card.value}
            </Typography>
          </StatCard>
        </Grid>
      ))}
    </Grid>
  );
};

const ActiveOrdersGrid = ({ orders, onStatusUpdate, selectedStatus, newOrderId }) => {
  const theme = useTheme();
  
  const filteredOrders = orders.filter(order => {
    if (selectedStatus === 'ALL') {
      return !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(order.status);
    }
    return order.status === selectedStatus;
  });

  if (filteredOrders.length === 0) {
    return (
      <Paper 
        sx={{ 
          p: 3, 
          textAlign: 'center',
          borderRadius: 1,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Typography color="text.secondary">No active orders</Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2} sx={{ mt: 2 }}>
      {filteredOrders.map(order => (
        <Grid item xs={12} sm={6} md={4} key={order.id}>
          <Paper 
            className={order.id === newOrderId ? styles.newOrderHighlight : ''}
            sx={{
              p: 2,
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: 1
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2
            }}>
              <Typography variant="h6" color="text.primary">
                Order #{order.id}
              </Typography>
              <StatusBadge 
                label={order.status === 'READY_FOR_PICKUP' ? 'Ready for Pickup/Delivery' : order.status.replace('_', ' ')}
                status={order.status}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ my: 0.5 }}>
                <strong>Client:</strong> {order.client?.name || 'Unknown Client'}
              </Typography>
              <Typography variant="body2" sx={{ my: 0.5 }}>
                <strong>Pickup Date:</strong> {order.preferredPickupDate ? 
                  new Date(order.preferredPickupDate).toLocaleDateString() : 'Not specified'}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.primary">Items:</Typography>
              <List dense disablePadding sx={{ ml: 2 }}>
                {order.items?.map((item, index) => (
                  <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary={`${item.speciesName} x ${item.OrderItem?.quantity || 0}`}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Stack spacing={1}>
              {(() => {
                const nextStatus = getNextStatus(order.status);
                const previousStatus = getPreviousStatus(order.status);

                const getStatusColor = (status) => {
                  switch(status) {
                    case 'CONFIRMED': return theme.palette.info;
                    case 'PROCESSING': return theme.palette.primary;
                    case 'READY_FOR_PICKUP': return theme.palette.success;
                    case 'COMPLETED': return theme.palette.grey;
                    case 'PENDING': return theme.palette.warning;
                    default: return theme.palette.grey;
                  }
                };

                return (
                  <>
                    {previousStatus && (
                      <Button
                        variant="outlined"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => onStatusUpdate(order.id, order.status, previousStatus)}
                        sx={{
                          color: getStatusColor(previousStatus).main,
                          borderColor: getStatusColor(previousStatus).main,
                          '&:hover': {
                            backgroundColor: getStatusColor(previousStatus).light,
                            borderColor: getStatusColor(previousStatus).main,
                          }
                        }}
                      >
                        Back to {previousStatus.replace(/_/g, ' ').split(' ').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ')}
                      </Button>
                    )}
                    {nextStatus && (
                      <Button
                        variant="contained"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => onStatusUpdate(order.id, order.status, nextStatus)}
                        sx={{
                          backgroundColor: getStatusColor(nextStatus).main,
                          '&:hover': {
                            backgroundColor: getStatusColor(nextStatus).dark,
                          }
                        }}
                      >
                        Mark as {nextStatus === 'READY_FOR_PICKUP' ? 'Ready for Pickup/Delivery' :
                          nextStatus.replace(/_/g, ' ').split(' ').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ')}
                      </Button>
                    )}
                  </>
                );
              })()}
            </Stack>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [newOrderId, setNewOrderId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [corals, setCorals] = useState([]);
  const [coralsWithImages, setCoralsWithImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  useEffect(() => {
    // Set newOrderId from navigation state if present
    if (location.state?.newOrderId) {
      setNewOrderId(location.state.newOrderId);
      // Clear the state after a delay
      setTimeout(() => {
        setNewOrderId(null);
      }, 3000);
    }
  }, [location]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, coralsRes] = await Promise.all([
          isAdmin ? orderService.getAllOrders(false) : orderService.getMyOrders(false),
          coralService.getAllCorals()
        ]);

        setOrders(ordersRes.data);
        setCorals(coralsRes.data);
        
        // Filter corals that have images
        const coralsWithImgs = coralsRes.data.filter(coral => 
          coral.imageUrl && coral.imageUrl.trim() !== ''
        );
        setCoralsWithImages(coralsWithImgs);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin]);

  if (loading) {
    return (
      <Container maxWidth="lg" disableGutters sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" disableGutters sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
      </Typography>
      
      {/* Hero Gallery */}
      <HeroGallery images={coralsWithImages} interval={10000} />
      
      <OrderStats 
        orders={orders} 
        isAdmin={user.role === 'ADMIN'} 
        onStatusSelect={setSelectedStatus}
        selectedStatus={selectedStatus}
      />
      
      {isAdmin && (
        <>
          <Typography 
            variant="h2" 
            sx={{ 
              mt: 4, 
              mb: 2,
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}
          >
            Active Orders
          </Typography>
          <ActiveOrdersGrid 
            orders={orders}
            selectedStatus={selectedStatus}
            newOrderId={newOrderId}
            onStatusUpdate={async (orderId, currentStatus, newStatus) => {
              const statusMessages = {
                CONFIRMED: 'Are you sure you want to confirm this order?',
                PROCESSING: 'Are you sure you want to mark this order as processing?',
                READY_FOR_PICKUP: 'Are you sure you want to mark this order as ready for pickup/delivery?',
                COMPLETED: 'Are you sure you want to mark this order as completed?',
                PENDING: 'Are you sure you want to move this order back to pending?'
              };

              // If moving backwards, use a different message format
              if (getPreviousStatus(currentStatus) === newStatus) {
                statusMessages[newStatus] = `Are you sure you want to move this order back to ${newStatus.toLowerCase().replace(/_/g, ' ')}?`;
              }

              if (window.confirm(statusMessages[newStatus])) {
                try {
                  // Optimistically update the local state
                  setOrders(prevOrders => 
                    prevOrders.map(order => 
                      order.id === orderId 
                        ? { ...order, status: newStatus }
                        : order
                    )
                  );

                  // Make the API call
                  await orderService.updateOrder(orderId, { status: newStatus });
                } catch (error) {
                  console.error('Error updating order status:', error);
                  // If there was an error, fetch all orders to ensure consistency
                  const updatedOrders = await orderService.getAllOrders(false);
                  setOrders(updatedOrders.data);
                }
              }
            }}
          />
        </>
      )}
    </Container>
  );
};

export default Dashboard;
