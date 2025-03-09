

import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateUtils';
import { orderService } from '../services/api';
import { useTheme } from '@mui/material/styles';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  Chip,
  Collapse,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { StatusBadge } from '../components/StyledComponents';
import OrderDetails from '../components/Orders/OrderDetails';

const Orders = () => {
  const theme = useTheme();
  const [orders, setOrders] = useState({
    active: [],
    completed: [],
    cancelled: [],
    archived: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [collapsedSections, setCollapsedSections] = useState(new Set(['completed', 'cancelled', 'archived']));
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    fetchOrders();

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await orderService.getAllOrders();
      const allOrders = response.data;
      setOrders({
        active: allOrders.filter(order => !order.archived && order.status !== 'CANCELLED' && order.status !== 'COMPLETED'),
        completed: allOrders.filter(order => !order.archived && order.status === 'COMPLETED'),
        cancelled: allOrders.filter(order => !order.archived && order.status === 'CANCELLED'),
        archived: allOrders.filter(order => order.archived)
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleArchive = async (orderId) => {
    if (window.confirm('Are you sure you want to archive this order?')) {
      try {
        // Find the order to archive
        const orderToArchive = orders.completed.find(o => o.id === orderId);
        if (!orderToArchive) return;

        // Optimistically update the local state
        setOrders(prevOrders => ({
          ...prevOrders,
          completed: prevOrders.completed.filter(o => o.id !== orderId),
          archived: [...prevOrders.archived, { ...orderToArchive, archived: true }]
        }));

        // Make the API call
        await orderService.updateOrder(orderId, { archived: true });
      } catch (err) {
        console.error('Error archiving order:', err);
        setError('Failed to archive order: ' + (err.response?.data?.message || err.message));
        // If there was an error, fetch all orders to ensure consistency
        fetchOrders();
      }
    }
  };

  const handleStatusUpdate = async (orderId, currentStatus, newStatus) => {
    const statusMessages = {
      CONFIRMED: 'Are you sure you want to confirm this order?',
      PROCESSING: 'Are you sure you want to mark this order as processing?',
      READY_FOR_PICKUP: 'Are you sure you want to mark this order as ready for pickup/delivery?',
      COMPLETED: 'Are you sure you want to mark this order as completed?',
      CANCELLED: 'Are you sure you want to cancel this order? This action cannot be undone.',
      PENDING: 'Are you sure you want to move this order back to pending?',
    };

    // If moving backwards, use a different message format
    if (getPreviousStatus(currentStatus) === newStatus) {
      statusMessages[newStatus] = `Are you sure you want to move this order back to ${newStatus.toLowerCase().replace(/_/g, ' ')}?`;
    }

    if (window.confirm(statusMessages[newStatus])) {
      try {
        // Optimistically update the local state
        setOrders(prevOrders => {
          const updatedOrder = { ...prevOrders.active.find(o => o.id === orderId), status: newStatus };
          
          // Helper function to filter out the order from a section
          const removeFromSection = (section) => section.filter(o => o.id !== orderId);
          
          // Helper function to determine which section the order belongs in
          const getUpdatedSections = () => {
            if (newStatus === 'COMPLETED') {
              return {
                active: removeFromSection(prevOrders.active),
                completed: [...prevOrders.completed, updatedOrder],
                cancelled: prevOrders.cancelled,
                archived: prevOrders.archived
              };
            } else if (newStatus === 'CANCELLED') {
              return {
                active: removeFromSection(prevOrders.active),
                completed: removeFromSection(prevOrders.completed),
                cancelled: [...prevOrders.cancelled, updatedOrder],
                archived: prevOrders.archived
              };
            } else {
              return {
                active: prevOrders.active.map(o => o.id === orderId ? updatedOrder : o),
                completed: prevOrders.completed,
                cancelled: prevOrders.cancelled,
                archived: prevOrders.archived
              };
            }
          };

          return getUpdatedSections();
        });

        // Make the API call
        await orderService.updateOrder(orderId, { status: newStatus });
      } catch (err) {
        console.error('Error updating order status:', err);
        setError('Failed to update order status: ' + (err.response?.data?.message || err.message));
        // If there was an error, fetch all orders to ensure consistency
        fetchOrders();
      }
    }
  };

  const handleMarkPaid = async (orderId, paid = true) => {
    const action = paid ? 'paid' : 'unpaid';
    if (window.confirm(`Are you sure you want to mark this order as ${action}?`)) {
      try {
        // Optimistically update the local state
        setOrders(prevOrders => {
          const updateOrderInSection = section =>
            section.map(order =>
              order.id === orderId ? { ...order, paid } : order
            );

          return {
            active: updateOrderInSection(prevOrders.active),
            completed: updateOrderInSection(prevOrders.completed),
            cancelled: updateOrderInSection(prevOrders.cancelled),
            archived: prevOrders.archived
          };
        });

        // Make the API call
        await orderService.updateOrder(orderId, { paid });
      } catch (err) {
        console.error(`Error marking order as ${action}:`, err);
        setError(`Failed to mark order as ${action}: ` + (err.response?.data?.message || err.message));
        // If there was an error, fetch all orders to ensure consistency
        fetchOrders();
      }
    }
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('Are you sure you want to delete order? This action cannot be undone.')) {
      try {
        await orderService.deleteOrder(orderId);
        fetchOrders();
      } catch (err) {
        console.error('Error deleting order:', err);
        setError('Failed to delete order: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getFilteredArchivedOrders = () => {
    if (timeFilter === 'all') return orders.archived;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch(timeFilter) {
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return orders.archived;
    }
    
    return orders.archived.filter(order => 
      new Date(order.createdAt) >= filterDate
    );
  };

  const getPreviousStatus = (currentStatus) => {
    const statusFlow = {
      CONFIRMED: 'PENDING',
      PROCESSING: 'CONFIRMED',
      READY_FOR_PICKUP: 'PROCESSING',
      COMPLETED: 'READY_FOR_PICKUP',
      PENDING: null,
      CANCELLED: null
    };
    return statusFlow[currentStatus] || null;
  };

  const getNextStatuses = (currentStatus) => {
    const statusFlow = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['READY_FOR_PICKUP', 'CANCELLED'],
      READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: []
    };
    return statusFlow[currentStatus] || [];
  };

  if (loading) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh' 
        }}
      >
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      </Container>
    );
  }

  // Function to get color for status-based buttons
  const getStatusButtonColor = (status) => {
    const statusColors = {
      PENDING: {
        backgroundColor: '#FEFCE8',
        borderColor: '#CA8A04',
        color: '#854D0E'
      },
      CONFIRMED: {
        backgroundColor: '#EBF8FF',
        borderColor: '#3182CE',
        color: '#2C5282'
      },
      PROCESSING: {
        backgroundColor: '#E9D8FD',
        borderColor: '#805AD5',
        color: '#553C9A'
      },
      READY_FOR_PICKUP: {
        backgroundColor: '#C6F6D5',
        borderColor: '#48BB78',
        color: '#276749'
      },
      COMPLETED: {
        backgroundColor: '#E2E8F0',
        borderColor: '#4A5568',
        color: '#2D3748'
      },
      CANCELLED: {
        backgroundColor: '#FED7D7',
        borderColor: '#E53E3E',
        color: '#C53030'
      },
      PAID: {
        backgroundColor: '#F0FDF4',
        borderColor: '#166534',
        color: '#166534'
      },
      UNPAID: {
        backgroundColor: '#FEF2F2',
        borderColor: '#991B1B',
        color: '#991B1B'
      },
      ARCHIVE: {
        backgroundColor: '#e0f2fe',
        borderColor: '#0369a1',
        color: '#0369a1'
      }
    };
    
    return statusColors[status] || statusColors.COMPLETED;
  };

  const renderOrderCard = (order, showActions = true) => (
    <Paper 
      key={order.id} 
      sx={{ 
        p: 2, 
        mb: 2, 
        borderRadius: 2,
        boxShadow: 1
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        mb: 2,
        flexWrap: 'wrap',
        gap: 1
      }}>
        <Box>
          <Typography variant="h6" component="div">
            Order #{order.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDate(order.createdAt)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip 
            label={order.paid ? 'Paid' : 'Unpaid'}
            color={order.paid ? 'success' : 'error'}
            variant="outlined"
            size="small"
          />
          <StatusBadge status={order.status} />
        </Box>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" color="text.secondary">
            Client
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {order.client?.name || 'Unknown Client'}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" color="text.secondary">
            Pickup Date
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {formatDate(order.preferredPickupDate)}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" color="text.secondary">
            Items
          </Typography>
          <Button
            variant="text"
            color="primary"
            onClick={() => toggleOrderExpansion(order.id)}
            startIcon={expandedOrders.has(order.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ p: 0 }}
          >
            {order.items?.reduce((total, item) => total + (item?.OrderItem?.quantity || 0), 0)} items
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Typography variant="body2" color="text.secondary">
            Total Amount
          </Typography>
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {import.meta.env.VITE_DEFAULT_CURRENCY}{parseFloat(order.totalAmount || 0).toFixed(2)}
            </Typography>
            {order.client?.discountRate > 0 && (
              <Typography variant="caption" sx={{ display: 'block', color: theme.palette.secondary.main, fontWeight: 'bold' }}>
                ({order.client.discountRate}% discount applied)
              </Typography>
            )}
            {order.archivedClientData?.discountRate > 0 && (
              <Typography variant="caption" sx={{ display: 'block', color: theme.palette.secondary.main, fontWeight: 'bold' }}>
                ({order.archivedClientData.discountRate}% discount applied)
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>

      <Collapse in={expandedOrders.has(order.id)}>
        <Divider sx={{ mb: 2 }} />
        <OrderDetails order={order} />
      </Collapse>

      {showActions && !order.archived && (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: 1, 
          mt: 2,
          '& > button': {
            minWidth: { xs: '100%', sm: 'auto' }
          }
        }}>
          {getPreviousStatus(order.status) && (
            <Button
              variant="outlined"
              onClick={() => handleStatusUpdate(order.id, order.status, getPreviousStatus(order.status))}
              sx={{
                ...getStatusButtonColor(getPreviousStatus(order.status)),
                '&:hover': {
                  opacity: 0.9,
                  transform: 'translateY(-1px)'
                }
              }}
            >
              ← Back to {getPreviousStatus(order.status).replace(/_/g, ' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ')}
            </Button>
          )}
          
          {getNextStatuses(order.status).map(nextStatus => (
            <Button
              key={nextStatus}
              variant="outlined"
              onClick={() => handleStatusUpdate(order.id, order.status, nextStatus)}
              sx={{
                ...getStatusButtonColor(nextStatus),
                '&:hover': {
                  opacity: 0.9,
                  transform: 'translateY(-1px)'
                }
              }}
            >
              {nextStatus === 'CANCELLED' ? 'Cancel Order' : 
               'Mark as ' + (nextStatus === 'READY_FOR_PICKUP' ? 'Ready for Pickup/Delivery' :
                 nextStatus.replace(/_/g, ' ').split(' ').map(word => 
                   word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                 ).join(' ')) + ' →'}
            </Button>
          ))}

          {order.status === 'CANCELLED' && (
            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              onClick={() => handleDelete(order.id)}
              sx={{
                ...getStatusButtonColor('CANCELLED'),
                '&:hover': {
                  opacity: 0.9,
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Delete
            </Button>
          )}

          {order.status !== 'CANCELLED' && !order.archived && (
            order.paid ? (
              <Button
                variant="outlined"
                onClick={() => handleMarkPaid(order.id, false)}
                sx={{
                  ...getStatusButtonColor('UNPAID'),
                  '&:hover': {
                    opacity: 0.9,
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                Mark as Unpaid
              </Button>
            ) : (
              <Button
                variant="outlined"
                onClick={() => handleMarkPaid(order.id, true)}
                sx={{
                  ...getStatusButtonColor('PAID'),
                  '&:hover': {
                    opacity: 0.9,
                    transform: 'translateY(-1px)'
                  }
                }}
              >
                Mark as Paid
              </Button>
            )
          )}

          {order.status === 'COMPLETED' && order.paid && (
            <Button
              variant="outlined"
              onClick={() => handleArchive(order.id)}
              sx={{
                ...getStatusButtonColor('ARCHIVE'),
                '&:hover': {
                  opacity: 0.9,
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Move to Archived
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" fontWeight="bold" sx={{ mb: 3 }}>
        Order Management
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            background: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 1,
            '&:hover': {
              boxShadow: 3
            }
          }}
          onClick={() => toggleSection('active')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {collapsedSections.has('active') ? 
              <ExpandMoreIcon sx={{ mr: 1 }} /> : 
              <ExpandLessIcon sx={{ mr: 1 }} />
            }
            <Typography variant="h6">
              Active Orders ({orders.active.length})
            </Typography>
          </Box>
        </Paper>
        
        <Collapse in={!collapsedSections.has('active')}>
          <Box sx={{ px: 1 }}>
            {orders.active.map(order => renderOrderCard(order, true))}
            {orders.active.length === 0 && (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                No active orders
              </Typography>
            )}
          </Box>
        </Collapse>

        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            background: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 1,
            '&:hover': {
              boxShadow: 3
            }
          }}
          onClick={() => toggleSection('completed')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {collapsedSections.has('completed') ? 
              <ExpandMoreIcon sx={{ mr: 1 }} /> : 
              <ExpandLessIcon sx={{ mr: 1 }} />
            }
            <Typography variant="h6">
              Completed Orders ({orders.completed.length})
            </Typography>
          </Box>
        </Paper>
        
        <Collapse in={!collapsedSections.has('completed')}>
          <Box sx={{ px: 1 }}>
            {orders.completed.map(order => renderOrderCard(order, true))}
            {orders.completed.length === 0 && (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                No completed orders
              </Typography>
            )}
          </Box>
        </Collapse>

        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            background: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 1,
            '&:hover': {
              boxShadow: 3
            }
          }}
          onClick={() => toggleSection('cancelled')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {collapsedSections.has('cancelled') ? 
              <ExpandMoreIcon sx={{ mr: 1 }} /> : 
              <ExpandLessIcon sx={{ mr: 1 }} />
            }
            <Typography variant="h6">
              Cancelled Orders ({orders.cancelled.length})
            </Typography>
          </Box>
        </Paper>
        
        <Collapse in={!collapsedSections.has('cancelled')}>
          <Box sx={{ px: 1 }}>
            {orders.cancelled.map(order => renderOrderCard(order, true))}
            {orders.cancelled.length === 0 && (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                No cancelled orders
              </Typography>
            )}
          </Box>
        </Collapse>

        <Paper 
          sx={{ 
            p: 2, 
            mb: 2, 
            background: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 1,
            '&:hover': {
              boxShadow: 3
            }
          }}
          onClick={() => toggleSection('archived')}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {collapsedSections.has('archived') ? 
              <ExpandMoreIcon sx={{ mr: 1 }} /> : 
              <ExpandLessIcon sx={{ mr: 1 }} />
            }
            <Typography variant="h6">
              Archived Orders ({getFilteredArchivedOrders().length})
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to purge all archived orders? This action cannot be undone.')) {
                  orderService.purgeArchivedOrders()
                    .then(() => {
                      setOrders(prev => ({
                        ...prev,
                        archived: []
                      }));
                    })
                    .catch(err => {
                      console.error('Error purging archived orders:', err);
                      setError('Failed to purge archived orders: ' + (err.response?.data?.message || err.message));
                    });
                }
              }}
            >
              Purge All
            </Button>
            
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 120,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                  },
                },
                '& .MuiSelect-icon': {
                  color: 'white',
                }
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                variant="outlined"
                sx={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="week">Past Week</MenuItem>
                <MenuItem value="month">Past Month</MenuItem>
                <MenuItem value="year">Past Year</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>
        
        <Collapse in={!collapsedSections.has('archived')}>
          <Box sx={{ px: 1 }}>
            {getFilteredArchivedOrders().map(order => renderOrderCard(order, false))}
            {getFilteredArchivedOrders().length === 0 && (
              <Typography variant="body1" sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
                No archived orders for the selected time period
              </Typography>
            )}
          </Box>
        </Collapse>
      </Box>
    </Container>
  );
};

export default Orders;
