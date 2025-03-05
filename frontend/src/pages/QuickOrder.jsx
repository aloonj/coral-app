import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { BASE_URL, coralService, categoryService, clientService, orderService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';
import ImageGallery from '../components/ImageGallery/ImageGallery';
import ImageModal from '../components/ImageGallery/ImageModal';
import { useTheme } from '@mui/material/styles';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Chip,
  IconButton,
  CircularProgress,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  FormHelperText,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  InputAdornment,
  Collapse
} from '@mui/material';
import { 
  ViewList as ViewListIcon,
  ViewModule as ViewModuleIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { PageTitle } from '../components/StyledComponents';

const QuickOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [corals, setCorals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [orderQuantities, setOrderQuantities] = useState({});
  const showAdditionalDetails = import.meta.env.VITE_SHOW_ADDITIONAL_CORAL_DETAILS === 'true';
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedCoral, setSelectedCoral] = useState(null);
  const [layoutView, setLayoutView] = useState(() => {
    // Get saved layout preference from localStorage or default to 'list'
    const savedLayout = localStorage.getItem('quickOrderLayout');
    return savedLayout || 'list';
  });

  // Save layout preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('quickOrderLayout', layoutView);
  }, [layoutView]);

  useEffect(() => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const fetchData = async () => {
      try {
        const promises = [coralService.getAllCorals(), categoryService.getAllCategories()];
        
        // Only fetch clients if user is admin/superadmin
        if (isAdmin) {
          promises.push(clientService.getAllClients());
        }
        
        const responses = await Promise.all(promises);
        const coralData = responses[0].data;
        const categoryData = responses[1].data;
        
        setCorals(coralData);
        setCategories(categoryData);
        
        if (isAdmin && responses[2]) {
          setClients(responses[2].data);
        }
        
        // Initialize order quantities
        const initialQuantities = {};
        coralData.forEach(coral => {
          initialQuantities[coral.id] = 0;
        });
        setOrderQuantities(initialQuantities);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isAdmin]);

  // Early return for loading and error states
  if (!user) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh' 
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Redirecting to login...
        </Typography>
      </Box>
    );
  }

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
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh' 
        }}
      >
        <Typography variant="h6" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  const handleQuantityChange = (coralId, value) => {
    setOrderQuantities(prev => ({
      ...prev,
      [coralId]: Math.max(0, Math.min(value, corals.find(c => c.id === coralId)?.quantity || 0))
    }));
  };

  const clearOrder = () => {
    // Reset all quantities to 0
    const resetQuantities = {};
    corals.forEach(coral => {
      resetQuantities[coral.id] = 0;
    });
    setOrderQuantities(resetQuantities);
  };

  const handleBulkOrder = async () => {
    const orderItems = Object.entries(orderQuantities)
      .filter(([_, quantity]) => quantity > 0)
      .map(([coralId, quantity]) => ({
        coralId: parseInt(coralId),
        quantity
      }));

    if (orderItems.length === 0) {
      alert('Please add items to your order');
      return;
    }

    try {
      // Calculate total amount
      const totalAmount = corals.reduce((total, coral) => {
        return total + (coral.price * (orderQuantities[coral.id] || 0));
      }, 0);

      const orderData = {
        items: orderItems,
        totalAmount,
        ...(isAdmin && selectedClient && { clientId: parseInt(selectedClient, 10) })
      };

      const response = await orderService.createOrder(orderData);
      const newOrderId = response.data.id;
      
      // Navigate to dashboard with the new order ID
      navigate('/dashboard', { state: { newOrderId } });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to submit order. Please try again.';
      alert(errorMessage);
      console.error('Order submission error:', err);
    }
  };

  const toggleCategory = (categoryId) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Group corals by category
  const groupedCorals = categories.reduce((acc, category) => {
    acc[category.id] = corals.filter(coral => coral.categoryId === category.id);
    return acc;
  }, {});

  const getStockStatus = (coral) => {
    if (coral.quantity === 0) return 'OUT_OF_STOCK';
    if (coral.quantity <= coral.minimumStock) return 'LOW_STOCK';
    return 'AVAILABLE';
  };

  const getStockChipProps = (status) => {
    switch(status) {
      case 'AVAILABLE':
        return {
          label: 'In Stock',
          color: 'success',
          variant: 'filled'
        };
      case 'LOW_STOCK':
        return {
          label: 'Low Stock',
          color: 'warning',
          variant: 'filled'
        };
      case 'OUT_OF_STOCK':
        return {
          label: 'Out of Stock',
          color: 'error',
          variant: 'filled'
        };
      default:
        return {
          label: 'Unknown',
          color: 'default',
          variant: 'outlined'
        };
    }
  };

  const handleLayoutChange = (event, newLayout) => {
    if (newLayout !== null) {
      setLayoutView(newLayout);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <PageTitle variant="h1">Order Corals</PageTitle>
        <ToggleButtonGroup
          value={layoutView}
          exclusive
          onChange={handleLayoutChange}
          aria-label="view layout"
          size="small"
        >
          <ToggleButton value="list" aria-label="list view">
            <ViewListIcon />
          </ToggleButton>
          <ToggleButton value="grid" aria-label="grid view">
            <ViewModuleIcon />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {isAdmin && (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth variant="outlined">
            <InputLabel id="client-select-label">Order on behalf of</InputLabel>
            <Select
              labelId="client-select-label"
              id="client-select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              label="Order on behalf of"
            >
              <MenuItem value="">
                <em>Select a client...</em>
              </MenuItem>
              {clients.map(client => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {categories.map(category => {
        const categoryCorals = groupedCorals[category.id] || [];
        
        if (categoryCorals.length === 0) return null;
        
        const categoryTotal = categoryCorals.reduce((total, coral) => 
          total + (orderQuantities[coral.id] || 0), 0);

        return (
          <Box key={`category-${category.id}`} sx={{ mb: 3 }}>
            <Paper 
              sx={{ 
                p: 2, 
                mb: 2,
                background: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                cursor: 'pointer',
                '&:hover': {
                  boxShadow: 3
                }
              }}
              onClick={() => toggleCategory(category.id)}
            >
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {collapsedCategories.has(category.id) ? 
                    <ExpandMoreIcon sx={{ mr: 1 }} /> : 
                    <ExpandLessIcon sx={{ mr: 1 }} />
                  }
                  <Typography variant="h6" component="div">
                    {category.name}
                  </Typography>
                </Box>
                {categoryTotal > 0 && (
                  <Chip 
                    label={`${categoryTotal} ordered`} 
                    color="secondary"
                    size="small"
                  />
                )}
              </Box>
            </Paper>
            
            <Collapse in={!collapsedCategories.has(category.id)}>
              <Grid container spacing={2}>
                {categoryCorals.map(coral => {
                  const stockStatus = getStockStatus(coral);
                  const stockChipProps = getStockChipProps(stockStatus);
                  
                  return (
                    <Grid 
                      item 
                      key={coral.id} 
                      xs={12} 
                      md={layoutView === 'grid' ? 4 : 12}
                    >
                      <Card 
                        sx={{ 
                          display: 'flex',
                          flexDirection: layoutView === 'grid' ? 'column' : 'row',
                          height: '100%'
                        }}
                      >
                        <Box 
                          sx={{ 
                            width: layoutView === 'grid' ? '100%' : 300,
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <CardMedia
                            component="div"
                            sx={{ 
                              height: 200,
                              cursor: 'pointer',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                transition: 'transform 0.3s ease'
                              }
                            }}
                            onClick={() => {
                              setSelectedCoral(coral);
                              setShowImageModal(true);
                            }}
                          >
                            <ImageGallery
                              images={[coral.imageUrl]}
                              alt={coral.speciesName}
                              style={{ 
                                width: '100%', 
                                height: '100%', 
                                objectFit: 'cover' 
                              }}
                            />
                          </CardMedia>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          flexGrow: 1
                        }}>
                          <CardContent sx={{ flexGrow: 1 }}>
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              mb: 1
                            }}>
                              <Box>
                                <Typography variant="h6" component="div">
                                  {coral.speciesName}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  {coral.scientificName}
                                </Typography>
                              </Box>
                              <Chip 
                                {...stockChipProps}
                                size="small"
                              />
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {coral.description}
                            </Typography>
                            
                            <Box sx={{ 
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              mt: 2
                            }}>
                              <Typography variant="h6" color="primary">
                                {config.defaultCurrency}{coral.price}
                              </Typography>
                              
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center'
                              }}>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleQuantityChange(coral.id, orderQuantities[coral.id] - 1)}
                                  disabled={stockStatus === 'OUT_OF_STOCK' || orderQuantities[coral.id] === 0}
                                  color="primary"
                                >
                                  <RemoveIcon />
                                </IconButton>
                                
                                <TextField
                                  type="number"
                                  variant="outlined"
                                  size="small"
                                  value={orderQuantities[coral.id]}
                                  onChange={(e) => handleQuantityChange(coral.id, parseInt(e.target.value) || 0)}
                                  inputProps={{ 
                                    min: 0, 
                                    max: coral.quantity,
                                    style: { textAlign: 'center' }
                                  }}
                                  disabled={stockStatus === 'OUT_OF_STOCK'}
                                  sx={{ width: 60, mx: 1 }}
                                />
                                
                                <IconButton 
                                  size="small"
                                  onClick={() => handleQuantityChange(coral.id, orderQuantities[coral.id] + 1)}
                                  disabled={stockStatus === 'OUT_OF_STOCK' || orderQuantities[coral.id] >= coral.quantity}
                                  color="primary"
                                >
                                  <AddIcon />
                                </IconButton>
                              </Box>
                            </Box>
                            
                            {stockStatus !== 'OUT_OF_STOCK' && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 1 }}>
                                {coral.quantity} available
                              </Typography>
                            )}
                          </CardContent>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </Collapse>
          </Box>
        );
      })}

      {/* Order Summary */}
      {Object.values(orderQuantities).some(q => q > 0) && (
        <Paper 
          elevation={3}
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 10,
            p: 2,
            backgroundColor: theme.palette.background.paper
          }}
        >
          <Container maxWidth="lg">
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: { xs: 'wrap', sm: 'nowrap' },
              gap: 2
            }}>
              <Box>
                <Typography variant="body1">
                  <strong>Total Items:</strong> {Object.values(orderQuantities).reduce((a, b) => a + b, 0)}
                </Typography>
                <Typography variant="body1">
                  <strong>Total Price:</strong> {config.defaultCurrency}
                  {corals.reduce((total, coral) => {
                    return total + (coral.price * (orderQuantities[coral.id] || 0));
                  }, 0).toFixed(2)}
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                width: { xs: '100%', sm: 'auto' }
              }}>
                <Button 
                  variant="outlined" 
                  color="error"
                  onClick={clearOrder}
                  fullWidth={true}
                >
                  Clear Order
                </Button>
                <Button 
                  variant="contained" 
                  color="success"
                  onClick={handleBulkOrder}
                  disabled={isAdmin && !selectedClient}
                  fullWidth={true}
                >
                  Place Order
                </Button>
              </Box>
            </Box>
          </Container>
        </Paper>
      )}

      {/* Image Modal */}
      {showImageModal && selectedCoral && (
        <ImageModal
          images={[selectedCoral.imageUrl]}
          alt={selectedCoral.speciesName}
          onClose={() => {
            setShowImageModal(false);
            setSelectedCoral(null);
          }}
        />
      )}
    </Container>
  );
};

export default QuickOrder;
