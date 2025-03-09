import { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress, 
  Alert, 
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/api';
import { StatusBadge } from '../components/StyledComponents';

const OrderTable = ({ orders, title }) => {
  if (orders.length === 0) return null;
  
  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h2" sx={{ mb: 3 }}>
        {title}
      </Typography>
      <Grid container spacing={3}>
        {orders.map((order) => (
          <Grid item xs={12} sm={6} md={4} key={order.id}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s, boxShadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Order #{order.id}
                  </Typography>
                  <StatusBadge 
                    label={order.status} 
                    status={order.status} 
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" component="span" fontWeight="bold">
                    Date:{' '}
                  </Typography>
                  <Typography variant="body2" component="span">
                    {formatDate(order.createdAt)}
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" fontWeight="bold">
                    Items:
                  </Typography>
                  <List dense disablePadding sx={{ pl: 2 }}>
                    {order.items.map((coral, index) => (
                      <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                        <ListItemText 
                          primary={`${coral.speciesName} - Quantity: ${coral.OrderItem.quantity}`}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
                {order.notes && (
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight="bold">
                      Notes:
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {order.notes}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

const ClientOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { user } = useAuth();

  const filterOptions = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await orderService.getMyOrders();
        setOrders(response.data);
      } catch (err) {
        setError('Failed to fetch your orders. Please try again later.');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user.id]);

  const filteredOrders = orders.filter(order => 
    statusFilter === 'ALL' ? true : order.status === statusFilter
  );

  const completedOrders = filteredOrders.filter(order => order.status === 'COMPLETED');
  const activeOrders = filteredOrders.filter(order => order.status !== 'COMPLETED');

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  );
  
  if (error) return (
    <Box sx={{ p: 4 }}>
      <Alert severity="error">{error}</Alert>
    </Box>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h1">Your Orders</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="status-filter-label">Filter by status</InputLabel>
          <Select
            labelId="status-filter-label"
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by status"
            size="small"
          >
            {filterOptions.map(option => (
              <MenuItem key={option} value={option}>
                {option === 'ALL' ? 'All Orders' : option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            You haven't placed any orders yet.
          </Typography>
        </Box>
      ) : (
        <>
          <OrderTable orders={activeOrders} title="Active Orders" />
          <OrderTable orders={completedOrders} title="Completed Orders" />
        </>
      )}
    </Container>
  );
};

export default ClientOrders;
