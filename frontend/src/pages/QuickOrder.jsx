import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { useNavigate } from 'react-router-dom';
import api, { BASE_URL, coralService, categoryService, clientService, orderService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
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
  ExpandLess as ExpandLessIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import { PageTitle } from '../components/StyledComponents';

const QuickOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [corals, setCorals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(() => {
    // Initialize from localStorage if available
    const savedClient = localStorage.getItem('selectedClient');
    return savedClient || '';
  });
  const [clientDiscountRate, setClientDiscountRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const { orderQuantities, updateQuantity, clearCart, addToCart } = useCart();
  const [orderedCorals, setOrderedCorals] = useState([]);
  const showAdditionalDetails = import.meta.env.VITE_SHOW_ADDITIONAL_CORAL_DETAILS === 'true';
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedCoral, setSelectedCoral] = useState(null);
  const [layoutView, setLayoutView] = useState(() => {
    // Get saved layout preference from localStorage or default to 'list'
    const savedLayout = localStorage.getItem('quickOrderLayout');
    return savedLayout || 'grid';
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  // State to trigger lazy loading refresh when categories are expanded or filters change
  const [lazyLoadRefreshTrigger, setLazyLoadRefreshTrigger] = useState(0);

  // Save layout preference to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('quickOrderLayout', layoutView);
  }, [layoutView]);

  // Function to get client discount rate when admin selects a client
  useEffect(() => {
    if (isAdmin && selectedClient && clients.length > 0) {
      const client = clients.find(c => c.id === parseInt(selectedClient));
      if (client) {
        setClientDiscountRate(parseFloat(client.discountRate) || 0);
      } else {
        setClientDiscountRate(0);
      }
      
      // Save selected client to localStorage and dispatch custom event
      localStorage.setItem('selectedClient', selectedClient);
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('clientSelectionChanged', { 
        detail: { selectedClient } 
      }));
    } else if (isAdmin && !selectedClient) {
      // Clear localStorage when no client is selected
      localStorage.removeItem('selectedClient');
      // Dispatch a custom event to notify other components
      window.dispatchEvent(new CustomEvent('clientSelectionChanged', { 
        detail: { selectedClient: '' } 
      }));
    }
  }, [isAdmin, selectedClient, clients]);

  // Function to fetch corals with pagination
  const fetchCorals = useCallback(async (newOffset = 0, resetCorals = true) => {
    try {
      setLoadingMore(true);
      
      const params = {
        limit: 9,
        offset: newOffset,
        ...(selectedCategory && { categoryId: selectedCategory }),
        ...(debouncedSearchTerm && { search: debouncedSearchTerm })
      };
      
      const response = await coralService.getCorals(params);
      const newCorals = response.data;
      
      if (resetCorals) {
        setCorals(newCorals);
      } else {
        setCorals(prev => [...prev, ...newCorals]);
      }
      
      setOffset(newOffset + newCorals.length);
      setHasMore(newCorals.length === 9); // If we got fewer than 9, we've reached the end
    } catch (error) {
      console.error('Error fetching corals:', error);
      setError('Error loading corals. Please try again.');
    } finally {
      setLoadingMore(false);
    }
  }, [selectedCategory, debouncedSearchTerm]);

  // Initial data load
  useEffect(() => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories first
        const categoriesResponse = await categoryService.getAllCategories();
        setCategories(categoriesResponse.data);
        
        // Fetch initial corals with pagination
        await fetchCorals(0, true);
        
        // Fetch clients or client profile separately
        if (isAdmin) {
          try {
            const clientsResponse = await clientService.getAllClients();
            setClients(clientsResponse.data);
          } catch (error) {
            console.error('Error fetching clients:', error);
          }
        } else {
          try {
            // For regular clients, fetch their own client record to get discount rate
            const profileResponse = await api.get('/clients/profile');
            if (profileResponse.data) {
              setClientDiscountRate(parseFloat(profileResponse.data.discountRate) || 0);
            }
          } catch (error) {
            console.error('Error fetching client profile:', error);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user, isAdmin, fetchCorals]);

  // Create a debounced function to update the debouncedSearchTerm
  const debouncedSetSearch = useMemo(
    () => debounce((value) => {
      setDebouncedSearchTerm(value);
    }, 500), // 500ms delay
    []
  );

  // Update debouncedSearchTerm when searchTerm changes
  useEffect(() => {
    debouncedSetSearch(searchTerm);
    
    // Cleanup the debounce function on unmount
    return () => {
      debouncedSetSearch.cancel();
    };
  }, [searchTerm, debouncedSetSearch]);

  // Reset and refetch when category or debounced search changes
  useEffect(() => {
    if (!loading) {
      setOffset(0);
      setHasMore(true);
      fetchCorals(0, true);
    }
  }, [selectedCategory, debouncedSearchTerm, fetchCorals, loading]);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchCorals(offset, false);
        }
      },
      { threshold: 0.5 }
    );
    
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observer.disconnect();
      }
    };
  }, [offset, hasMore, loadingMore, loading, fetchCorals]);

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
    const newValue = Math.max(0, Math.min(value, corals.find(c => c.id === coralId)?.quantity || 0));
    const currentValue = orderQuantities[coralId] || 0;
    const coral = corals.find(c => c.id === coralId);
    
    if (!coral) return;
    
    // If changing from 0 to a positive number, use addToCart to ensure it's added to cartItems
    if (currentValue === 0 && newValue > 0) {
      addToCart(coral, newValue);
    } else {
      // Otherwise just update the quantity
      updateQuantity(coralId, newValue);
    }
    
    // Update orderedCorals when quantity changes
    if (newValue > 0) {
      // Add or update coral in orderedCorals
      setOrderedCorals(prev => {
        const existingIndex = prev.findIndex(c => c.id === coralId);
        if (existingIndex >= 0) {
          // Update existing coral
          const updated = [...prev];
          updated[existingIndex] = coral;
          return updated;
        } else {
          // Add new coral
          return [...prev, coral];
        }
      });
    } else if (newValue === 0) {
      // Remove coral from orderedCorals if quantity is 0
      setOrderedCorals(prev => prev.filter(c => c.id !== coralId));
    }
  };

  const clearOrder = () => {
    // Clear cart using context
    clearCart();
    // Clear ordered corals
    setOrderedCorals([]);
  };

  // Function to calculate discounted price
  const getDiscountedPrice = (originalPrice) => {
    if (!clientDiscountRate) return originalPrice;
    
    const discountedPrice = originalPrice * (1 - (clientDiscountRate / 100));
    return Math.round(discountedPrice * 100) / 100; // Round to 2 decimal places
  };

  // Check if the order button should be disabled
  const isOrderButtonDisabled = isAdmin && !selectedClient;

  const handleBulkOrder = async () => {
    const orderItems = Object.entries(orderQuantities)
      .filter(([_, quantity]) => quantity > 0)
      .map(([coralId, quantity]) => {
        const coral = corals.find(c => c.id === parseInt(coralId));
        const discountedPrice = getDiscountedPrice(coral.price);
        
        return {
          coralId: parseInt(coralId),
          quantity,
          priceAtOrder: discountedPrice
        };
      });

    if (orderItems.length === 0) {
      alert('Please add items to your order');
      return;
    }

    try {
      // Calculate total amount with discounts using all ordered corals
      const totalAmount = [...orderedCorals, ...corals].reduce((total, coral) => {
        const quantity = orderQuantities[coral.id] || 0;
        if (quantity === 0) return total;
        
        const discountedPrice = getDiscountedPrice(coral.price);
        return total + (discountedPrice * quantity);
      }, 0);

      // Validate that admin has selected a client
      if (isAdmin && !selectedClient) {
        alert('Please select a client to place an order for');
        return;
      }
      
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

  // Function to refresh lazy loading observers
  const refreshLazyLoading = () => {
    // Increment the trigger to cause a re-render and refresh of observers
    setLazyLoadRefreshTrigger(prev => prev + 1);
  };

  const toggleCategory = (categoryId) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
        // When expanding a category, trigger lazy loading refresh after a short delay
        // to allow the collapse animation to complete
        setTimeout(() => refreshLazyLoading(), 300);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Group corals by category
  const groupedCorals = categories.reduce((acc, category) => {
    acc[category.id] = corals
      .filter(coral => coral.categoryId === category.id)
      .sort((a, b) => a.speciesName.localeCompare(b.speciesName));
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
      // Refresh lazy loading when layout changes
      setTimeout(() => refreshLazyLoading(), 100);
    }
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    
    // Auto-expand categories with matching results
    if (value.trim() !== '') {
      const matchingCategories = new Set();
      
      // Find categories with matching corals
      categories.forEach(category => {
        const categoryCorals = groupedCorals[category.id] || [];
        const hasMatch = categoryCorals.some(coral => 
          coral.speciesName.toLowerCase().includes(value.toLowerCase()) ||
          coral.scientificName.toLowerCase().includes(value.toLowerCase()) ||
          coral.description.toLowerCase().includes(value.toLowerCase())
        );
        
        if (hasMatch) {
          matchingCategories.add(category.id);
        }
      });
      
      // Expand matching categories
      setCollapsedCategories(prev => {
        const newSet = new Set(prev);
        matchingCategories.forEach(id => {
          newSet.delete(id); // Remove from collapsed set to expand
        });
        return newSet;
      });
    }
    
    // Refresh lazy loading after search and category expansion
    setTimeout(() => refreshLazyLoading(), 300);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    // Refresh lazy loading after clearing search
    setTimeout(() => refreshLazyLoading(), 100);
  };

  // Filter corals based on search term
  const filteredGroupedCorals = {};
  categories.forEach(category => {
    const categoryCorals = groupedCorals[category.id] || [];
    
    if (searchTerm.trim() === '') {
      filteredGroupedCorals[category.id] = categoryCorals;
    } else {
      filteredGroupedCorals[category.id] = categoryCorals
        .filter(coral => 
          coral.speciesName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coral.scientificName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coral.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.speciesName.localeCompare(b.speciesName));
    }
  });

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mb: 3
      }}>
        <Typography variant="h4" component="h1" gutterBottom>Order Corals</Typography>
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

      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        flexWrap: 'wrap', 
        mb: 3 
      }}>
        <Chip
          label="All Categories"
          color={selectedCategory === null ? "primary" : "default"}
          onClick={() => {
            setSelectedCategory(null);
            // Refresh lazy loading after category filter change
            setTimeout(() => refreshLazyLoading(), 100);
          }}
          sx={{ 
            fontWeight: 'bold',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: 1
            },
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
        />
        {categories.filter(cat => cat.status !== 'INACTIVE').map(category => (
          <Chip
            key={category.id}
            label={category.name}
            color={selectedCategory === category.id ? "primary" : "default"}
            onClick={() => {
              setSelectedCategory(category.id);
              // Refresh lazy loading after category filter change
              setTimeout(() => refreshLazyLoading(), 100);
            }}
            sx={{ 
              fontWeight: 'bold',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 1
              },
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
          />
        ))}
      </Box>

      {/* Search Box */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search corals by name or description..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton 
                  onClick={clearSearch}
                  edge="end"
                  size="small"
                  aria-label="clear search"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* No results message when searching */}
      {searchTerm.trim() !== '' && 
        Object.values(filteredGroupedCorals).every(corals => corals.length === 0) && (
        <Box sx={{ 
          py: 4, 
          textAlign: 'center',
          backgroundColor: theme.palette.background.paper,
          borderRadius: 1,
          boxShadow: 1
        }}>
          <Typography variant="h6" color="text.secondary">
            No corals found matching "{searchTerm}"
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<ClearIcon />} 
            onClick={clearSearch}
            sx={{ mt: 2 }}
          >
            Clear Search
          </Button>
        </Box>
      )}

      {categories
        .filter(category => (selectedCategory === null || category.id === selectedCategory) && 
                           (filteredGroupedCorals[category.id]?.length > 0))
        .map(category => {
          const categoryCorals = filteredGroupedCorals[category.id] || [];
        
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
                              // Pass the refresh trigger to force observer refresh
                              key={`image-${coral.id}-${lazyLoadRefreshTrigger}`}
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
                              {clientDiscountRate > 0 ? (
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ textDecoration: 'line-through' }}>
                                    {config.defaultCurrency}{coral.price}
                                  </Typography>
                                  <Typography variant="h6" color="primary">
                                    {config.defaultCurrency}{getDiscountedPrice(coral.price).toFixed(2)}
                                    <Chip 
                                      size="small" 
                                      label={`-${clientDiscountRate}%`} 
                                      color="secondary"
                                      sx={{ ml: 1, height: 20 }}
                                    />
                                  </Typography>
                                </Box>
                              ) : (
                                <Typography variant="h6" color="primary">
                                  {config.defaultCurrency}{coral.price}
                                </Typography>
                              )}
                              
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center'
                              }}>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleQuantityChange(coral.id, (orderQuantities[coral.id] || 0) - 1)}
                                  disabled={stockStatus === 'OUT_OF_STOCK' || !orderQuantities[coral.id]}
                                  color="primary"
                                >
                                  <RemoveIcon />
                                </IconButton>
                                
                                <TextField
                                  type="number"
                                  variant="outlined"
                                  size="small"
                                  value={orderQuantities[coral.id] || 0}
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
                                  onClick={() => {
                                    const newValue = (orderQuantities[coral.id] || 0) + 1;
                                    if (newValue <= coral.quantity) {
                                      if (newValue === 1) {
                                        // If this is the first item, use addToCart to ensure it's added to cartItems
                                        addToCart(coral, 1);
                                      } else {
                                        // Otherwise just update the quantity
                                        handleQuantityChange(coral.id, newValue);
                                      }
                                    }
                                  }}
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

      {/* Order Button */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        my: 3 
      }}>
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleBulkOrder}
          disabled={isOrderButtonDisabled || Object.values(orderQuantities).every(qty => qty === 0)}
          startIcon={<ShoppingCartIcon />}
          sx={{ px: 4, py: 1 }}
        >
          Place Order
        </Button>
      </Box>

      {/* Infinite Scroll Observer */}
      <Box 
        ref={observerRef} 
        sx={{ 
          height: '50px', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          my: 3
        }}
      >
        {loadingMore && <CircularProgress size={30} />}
        {!hasMore && corals.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            No more items to load
          </Typography>
        )}
      </Box>

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
