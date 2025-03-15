import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { useNavigate } from 'react-router-dom';
import { coralService, categoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '../theme/ThemeContext';
import ImageGallery from '../components/ImageGallery/ImageGallery';
import ImageModal from '../components/ImageGallery/ImageModal';
import {
  Box,
  Typography,
  Button,
  Chip,
  Grid,
  Checkbox,
  FormControlLabel,
  TextField,
  Divider,
  Alert,
  IconButton,
  Modal,
  Container,
  Paper,
  Card,
  CardContent as MuiCardContent,
  CardMedia,
  Collapse,
  CircularProgress,
  Stack,
  Tabs,
  Tab,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Category as CategoryIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import {
  PageTitle,
  ActionButton,
  CoralCard,
  CardContent,
  SectionHeader,
  FormField,
  FormError,
  PriceTag,
  StockLevel,
  ModalContainer
} from '../components/StyledComponents';

const Corals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useColorMode();
  const isAdmin = user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const hasAdminPrivileges = isAdmin || isSuperAdmin;
  const [corals, setCorals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const [showInactiveCategories, setShowInactiveCategories] = useState(true); // Start with inactive visible for admin
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedCoral, setSelectedCoral] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const showAdditionalDetails = import.meta.env.VITE_SHOW_ADDITIONAL_CORAL_DETAILS === 'true';
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState(null);
  // Stock filter state removed as it's being moved elsewhere
  const [categoryFormError, setCategoryFormError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Function to fetch corals with pagination
  const fetchCorals = useCallback(async (newOffset = 0, resetCorals = true) => {
    try {
      setLoadingMore(true);
      
      const params = {
        limit: 9,
        offset: newOffset,
        ...(selectedCategory && { categoryId: selectedCategory }),
        // Stock filter parameter removed as it's being moved elsewhere
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
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories first
        const categoriesRes = await categoryService.getAllCategories(showInactiveCategories);
        setCategories(categoriesRes.data);
        
        // Fetch initial corals with pagination
        await fetchCorals(0, true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [showInactiveCategories, fetchCorals]);

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

  // Reset and refetch when category or search term changes
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

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setCategoryFormError('');

    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, categoryForm);
      } else {
        await categoryService.createCategory(categoryForm);
      }
      const res = await categoryService.getAllCategories(showInactiveCategories);
      setCategories(res.data);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving category:', error);
      setCategoryFormError(error.response?.data?.message || error.message || 'Error saving category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This will make the category inactive.')) {
      try {
        await categoryService.deleteCategory(categoryId);
        const res = await categoryService.getAllCategories(showInactiveCategories);
        setCategories(res.data);
        setCategoryError('');
      } catch (error) {
        console.error('Error deleting category:', error);
        setCategoryError(error.response?.data?.message || 'Error deleting category');
      }
    }
  };

  const handleRestoreCategory = async (categoryId) => {
    try {
      await categoryService.restoreCategory(categoryId);
      const res = await categoryService.getAllCategories(showInactiveCategories);
      setCategories(res.data);
      setCategoryError('');
    } catch (error) {
      console.error('Error restoring category:', error);
      setCategoryError(error.response?.data?.message || 'Error restoring category');
    }
  };

  const handleDeleteCoral = async (coralId) => {
    if (window.confirm('Are you sure you want to delete this coral?')) {
      try {
        await coralService.deleteCoral(coralId);
        // Refresh corals after deletion
        fetchCorals(0, true);
      } catch (error) {
        console.error('Error deleting coral:', error);
      }
    }
  };

  const getStockStatus = (coral) => {
    if (coral.quantity === 0) return 'OUT_OF_STOCK';
    if (coral.quantity <= coral.minimumStock) return 'LOW_STOCK';
    return 'AVAILABLE';
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

  // Filter out corals with invalid categories
  const validCorals = corals.filter(coral => {
    const hasValidCategory = categories.some(cat => cat.id === coral.categoryId && cat.status !== 'INACTIVE');
    if (!hasValidCategory) {
      console.warn(`Coral ${coral.speciesName} has invalid or inactive category ID: ${coral.categoryId}`);
    }
    return hasValidCategory;
  });

  // Get active categories for display
  const activeCategories = categories.filter(cat => cat.status !== 'INACTIVE');

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {categoryError && (
        <FormError severity="error" sx={{ mb: 2 }}>
          {categoryError}
        </FormError>
      )}

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 2 }}>Coral Management</Typography>
        {hasAdminPrivileges && (
          <Stack spacing={2} direction={{ xs: 'column', md: 'row' }} sx={{ width: '100%' }}>
            <ActionButton
              variant="contained"
              color="success"
              startIcon={<AddIcon />}
              onClick={() => navigate('/corals/add')}
              sx={{ 
                py: 1.5,
                fontSize: '1rem',
                width: { xs: '100%', md: 'auto' }
              }}
            >
              Add Coral
            </ActionButton>
            <ActionButton
              variant="contained"
              color="info"
              startIcon={<CategoryIcon />}
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '' });
                setShowCategoryModal(true);
              }}
              sx={{ 
                py: 1.5,
                fontSize: '1rem',
                width: { xs: '100%', md: 'auto' }
              }}
            >
              Manage Categories
            </ActionButton>
          </Stack>
        )}
      </Box>

      {/* Search Box */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search corals by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton 
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearchTerm('');
                  }}
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

      {/* Stock Filter Chips removed as they're being moved elsewhere */}

      {/* No results message when searching */}
      {searchTerm.trim() !== '' && corals.length === 0 && (
        <Box sx={{ 
          py: 4, 
          textAlign: 'center',
          backgroundColor: theme.palette.background.paper,
          borderRadius: 1,
          boxShadow: 1,
          mb: 3
        }}>
          <Typography variant="h6" color="text.secondary">
            No corals found matching "{searchTerm}"
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<ClearIcon />} 
            onClick={() => {
              setSearchTerm('');
              setDebouncedSearchTerm('');
            }}
            sx={{ mt: 2 }}
          >
            Clear Search
          </Button>
        </Box>
      )}

      {/* Category Tabs */}
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={selectedCategory}
          onChange={(e, newValue) => setSelectedCategory(newValue)}
          aria-label="category tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTabs-flexContainer': {
              flexWrap: 'wrap',
            },
            '& .MuiTab-root': {
              fontWeight: 'bold',
              my: 0.5,
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              }
            }
          }}
        >
          <Tab label="All Categories" value={null} />
          {activeCategories.map(category => (
            <Tab 
              key={category.id} 
              label={category.name} 
              value={category.id} 
            />
          ))}
        </Tabs>
      </Box>

      {/* Display corals based on selected category */}
      <Grid container spacing={2}>
        {validCorals.map(coral => {
          // Skip corals that don't match the selected category
          if (selectedCategory && coral.categoryId !== selectedCategory) return null;
          
          const stockStatus = getStockStatus(coral);
          const category = categories.find(cat => cat.id === coral.categoryId);
          
          return (
            <Grid item xs={12} sm={6} md={4} key={coral.id}>
              <Card sx={{ 
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
              }}>
                <Box 
                  sx={{ 
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
                
                <MuiCardContent sx={{ flexGrow: 1 }}>
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
                      label={stockStatus === 'OUT_OF_STOCK' ? 'Out of Stock' :
                            stockStatus === 'LOW_STOCK' ? 'Low Stock' :
                            'In Stock'}
                      color={stockStatus === 'OUT_OF_STOCK' ? 'error' :
                            stockStatus === 'LOW_STOCK' ? 'warning' :
                            'success'}
                      variant="filled"
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {coral.description}
                  </Typography>
                  
                  {showAdditionalDetails && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ mb: 1 }}>
                        <Typography component="span" variant="body2" fontWeight="bold">
                          Care Level:
                        </Typography>{' '}
                        <Typography component="span" variant="body2">
                          {coral.careLevel}
                        </Typography>
                      </Box>
                      <Box sx={{ mb: 1 }}>
                        <Typography component="span" variant="body2" fontWeight="bold">
                          Growth Rate:
                        </Typography>{' '}
                        <Typography component="span" variant="body2">
                          {coral.growthRate}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  <Box sx={{ mb: 1 }}>
                    <Typography component="span" variant="body2" fontWeight="bold">
                      Category:
                    </Typography>{' '}
                    <Typography component="span" variant="body2">
                      {category.name}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mt: 2
                  }}>
                    <PriceTag variant="h6" color="primary">
                      {config.defaultCurrency}{coral.price}
                    </PriceTag>
                    
                    <Typography variant="caption" color="text.secondary">
                      {coral.quantity} in stock
                    </Typography>
                  </Box>
                  
                  {hasAdminPrivileges && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                      <ActionButton
                        variant="contained"
                        color="info"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/corals/${coral.id}/edit`)}
                        fullWidth
                      >
                        Edit
                      </ActionButton>
                      <ActionButton
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteCoral(coral.id)}
                        fullWidth
                      >
                        Delete
                      </ActionButton>
                    </Box>
                  )}
                </MuiCardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

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

      {/* Category Modal */}
      <Modal
        open={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          setCategoryFormError('');
        }}
        aria-labelledby="category-modal-title"
      >
        <ModalContainer>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" id="category-modal-title">
              Category Management
            </Typography>
            <IconButton 
              onClick={() => {
                setShowCategoryModal(false);
                setCategoryFormError('');
              }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          {/* Category List */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 2 
            }}>
              <Typography variant="h6">Categories</Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showInactiveCategories}
                    onChange={(e) => setShowInactiveCategories(e.target.checked)}
                    color="primary"
                  />
                }
                label="Show Inactive Categories"
              />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {categories.map(category => (
                <Box 
                  key={category.id} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    p: 1.5,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    boxShadow: 1
                  }}
                >
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {category.name}
                      </Typography>
                      {category.status === 'INACTIVE' && (
                        <Chip 
                          label="Inactive" 
                          size="small" 
                          color="error" 
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {category.description}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <ActionButton
                      variant="contained"
                      color="info"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryForm({
                          name: category.name,
                          description: category.description
                        });
                      }}
                    >
                      Edit
                    </ActionButton>
                    {category.status === 'INACTIVE' ? (
                      <ActionButton
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<RestoreIcon />}
                        onClick={() => handleRestoreCategory(category.id)}
                      >
                        Restore
                      </ActionButton>
                    ) : (
                      <ActionButton
                        variant="contained"
                        color="error"
                        size="small"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        Delete
                      </ActionButton>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Category Form */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            {editingCategory ? 'Edit Category' : 'Add New Category'}
          </Typography>
          
          {categoryFormError && (
            <FormError severity="error" sx={{ mb: 2 }}>
              {categoryFormError}
            </FormError>
          )}
          
          <Box component="form" onSubmit={handleCategorySubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormField
              label="Name"
              fullWidth
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
              required
            />
            <FormField
              label="Description"
              fullWidth
              multiline
              rows={4}
              value={categoryForm.description}
              onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
              required
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryFormError('');
                }}
              >
                Cancel
              </Button>
              <ActionButton
                variant="contained"
                color="primary"
                type="submit"
              >
                {editingCategory ? 'Update Category' : 'Add Category'}
              </ActionButton>
            </Box>
          </Box>
        </ModalContainer>
      </Modal>

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

export default Corals;
