import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coralService, categoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  Button,
  Chip,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import {
  PageTitle,
  ActionButton
} from '../components/StyledComponents';

const StockLevels = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isAdmin = user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const hasAdminPrivileges = isAdmin || isSuperAdmin;
  
  const [corals, setCorals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Fetch all corals and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch categories
        const categoriesRes = await categoryService.getAllCategories(false);
        setCategories(categoriesRes.data);
        
        // Fetch all corals (no pagination for report)
        const params = {
          limit: 1000, // High limit to get all corals
          offset: 0,
          ...(selectedCategory && { categoryId: selectedCategory })
        };
        
        const coralsRes = await coralService.getCorals(params);
        
        // Sort corals by stock status and quantity
        const sortedCorals = coralsRes.data.sort((a, b) => {
          // First sort by status priority (OUT_OF_STOCK > LOW_STOCK > AVAILABLE)
          // This uses the status field which is set by the backend based on quantity and minimumStock
          const statusPriority = {
            'OUT_OF_STOCK': 0, // quantity === 0
            'LOW_STOCK': 1,    // quantity <= minimumStock
            'AVAILABLE': 2     // quantity > minimumStock
          };
          
          const statusDiff = statusPriority[a.status] - statusPriority[b.status];
          if (statusDiff !== 0) return statusDiff;
          
          // Then sort by quantity (ascending)
          return a.quantity - b.quantity;
        });
        
        setCorals(sortedCorals);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCategory]);

  const getStockStatusChip = (status) => {
    switch (status) {
      case 'OUT_OF_STOCK':
        return <Chip label="Out of Stock" color="error" size="small" />;
      case 'LOW_STOCK':
        return <Chip label="Low Stock" color="warning" size="small" />;
      case 'AVAILABLE':
        return <Chip label="In Stock" color="success" size="small" />;
      default:
        return <Chip label="Unknown" color="default" size="small" />;
    }
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

  // Get active categories for display
  const activeCategories = categories.filter(cat => cat.status !== 'INACTIVE');

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssessmentIcon fontSize="large" color="primary" />
          <Typography variant="h4" component="h1" gutterBottom>Stock Levels Report</Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/corals')}
        >
          Back to Corals
        </Button>
      </Box>

      {/* Category Filter */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth variant="outlined">
          <InputLabel id="category-select-label">Filter by Category</InputLabel>
          <Select
            labelId="category-select-label"
            id="category-select"
            value={selectedCategory === null ? 'all' : selectedCategory}
            onChange={(e) => {
              const value = e.target.value === 'all' ? null : e.target.value;
              setSelectedCategory(value);
            }}
            label="Filter by Category"
          >
            <MenuItem value="all">All Categories</MenuItem>
            {activeCategories.map(category => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Stock Level Summary */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 2, flex: 1, minWidth: '200px' }}>
          <Typography variant="h6" color="error" gutterBottom>Out of Stock</Typography>
          <Typography variant="h4">
            {corals.filter(coral => coral.status === 'OUT_OF_STOCK').length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: '200px' }}>
          <Typography variant="h6" color="warning.main" gutterBottom>Low Stock</Typography>
          <Typography variant="h4">
            {corals.filter(coral => coral.status === 'LOW_STOCK').length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: '200px' }}>
          <Typography variant="h6" color="success.main" gutterBottom>In Stock</Typography>
          <Typography variant="h4">
            {corals.filter(coral => coral.status === 'AVAILABLE').length}
          </Typography>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, minWidth: '200px' }}>
          <Typography variant="h6" color="primary" gutterBottom>Total Items</Typography>
          <Typography variant="h4">
            {corals.length}
          </Typography>
        </Paper>
      </Box>

      {/* Stock Level Table */}
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="stock levels table">
          <TableHead>
            <TableRow>
              <TableCell>Species Name</TableCell>
              <TableCell>Scientific Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="right">Current Stock</TableCell>
              <TableCell align="right">Minimum Stock</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {corals.map((coral) => {
              const category = categories.find(cat => cat.id === coral.categoryId);
              return (
                <TableRow
                  key={coral.id}
                  sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    backgroundColor: 
                      coral.status === 'OUT_OF_STOCK' ? 'error.lighter' :
                      coral.status === 'LOW_STOCK' ? 'warning.lighter' :
                      'inherit'
                  }}
                >
                  <TableCell component="th" scope="row">
                    {coral.speciesName}
                  </TableCell>
                  <TableCell>{coral.scientificName}</TableCell>
                  <TableCell>{category ? category.name : 'Unknown'}</TableCell>
                  <TableCell align="right">{config.defaultCurrency}{coral.price}</TableCell>
                  <TableCell align="right">{coral.quantity}</TableCell>
                  <TableCell align="right">{coral.minimumStock}</TableCell>
                  <TableCell>{getStockStatusChip(coral.status)}</TableCell>
                </TableRow>
              );
            })}
            {corals.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    No corals found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default StockLevels;
