import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coralService, categoryService, imageService, BASE_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';
import { useTheme } from '@mui/material/styles';
import ImageSelector from '../components/ImageGallery/ImageSelector';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Grid,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import {
  PageTitle,
  FormField,
  FormError,
  ActionButton
} from '../components/StyledComponents';

const AddCoral = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const theme = useTheme();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [showImageSelector, setShowImageSelector] = useState(false);
  const showAdditionalDetails = import.meta.env.VITE_SHOW_ADDITIONAL_CORAL_DETAILS === 'true';
  
  const [coralForm, setCoralForm] = useState({
    speciesName: '',
    scientificName: '',
    description: '',
    price: '',
    categoryId: '',
    quantity: '',
    minimumStock: '',
    image: null,
    imageUrl: null,
    ...(showAdditionalDetails && {
      careLevel: 'EASY',
      growthRate: 'MODERATE',
      lightingRequirements: '',
      waterFlow: 'MEDIUM'
    })
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
          navigate('/corals');
          return;
        }

        const categoriesRes = await categoryService.getAllCategories(false);
        setCategories(categoriesRes.data.filter(cat => cat.status !== 'INACTIVE'));
      } catch (error) {
        console.error('Error fetching categories:', error);
        setFormError(error.response?.data?.message || 'Error loading categories');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const coralData = new FormData();
      
      // Append all form fields
      coralData.append('speciesName', coralForm.speciesName);
      coralData.append('scientificName', coralForm.scientificName);
      coralData.append('description', coralForm.description);
      coralData.append('price', parseFloat(coralForm.price));
      coralData.append('categoryId', parseInt(coralForm.categoryId));
      coralData.append('quantity', parseInt(coralForm.quantity));
      coralData.append('minimumStock', parseInt(coralForm.minimumStock));
      
      if (showAdditionalDetails) {
        coralData.append('careLevel', coralForm.careLevel);
        coralData.append('growthRate', coralForm.growthRate);
        coralData.append('lightingRequirements', coralForm.lightingRequirements);
        coralData.append('waterFlow', coralForm.waterFlow);
      }
      
      // Handle image
      if (coralForm.image) {
        coralData.append('image', coralForm.image);
      } else if (coralForm.imageUrl) {
        coralData.append('imageUrl', coralForm.imageUrl);
      }

      await coralService.createCoral(coralData);
      navigate('/corals');
    } catch (error) {
      console.error('Error creating coral:', error);
      setFormError(error.response?.data?.message || error.message || 'Error creating coral');
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

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>Add New Coral</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          {formError && (
            <FormError severity="error" sx={{ mb: 2 }}>
              {formError}
            </FormError>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                Species Name
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <FormField
                fullWidth
                variant="outlined"
                size="small"
                value={coralForm.speciesName}
                onChange={(e) => setCoralForm({...coralForm, speciesName: e.target.value})}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                Scientific Name
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <FormField
                fullWidth
                variant="outlined"
                size="small"
                value={coralForm.scientificName}
                onChange={(e) => setCoralForm({...coralForm, scientificName: e.target.value})}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                Description
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <FormField
                fullWidth
                variant="outlined"
                multiline
                rows={4}
                value={coralForm.description}
                onChange={(e) => setCoralForm({...coralForm, description: e.target.value})}
                required
              />
            </Grid>

            {showAdditionalDetails && (
              <>
                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                    Care Level
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={coralForm.careLevel}
                      onChange={(e) => setCoralForm({...coralForm, careLevel: e.target.value})}
                    >
                      <MenuItem value="EASY">Easy Care</MenuItem>
                      <MenuItem value="MODERATE">Moderate Care</MenuItem>
                      <MenuItem value="EXPERT">Expert Care</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                    Growth Rate
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={coralForm.growthRate}
                      onChange={(e) => setCoralForm({...coralForm, growthRate: e.target.value})}
                    >
                      <MenuItem value="SLOW">Slow Growth</MenuItem>
                      <MenuItem value="MODERATE">Moderate Growth</MenuItem>
                      <MenuItem value="FAST">Fast Growth</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                    Lighting
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <FormField
                    fullWidth
                    variant="outlined"
                    size="small"
                    value={coralForm.lightingRequirements}
                    onChange={(e) => setCoralForm({...coralForm, lightingRequirements: e.target.value})}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                    Water Flow
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={8}>
                  <FormControl fullWidth size="small">
                    <Select
                      value={coralForm.waterFlow}
                      onChange={(e) => setCoralForm({...coralForm, waterFlow: e.target.value})}
                    >
                      <MenuItem value="LOW">Low Flow</MenuItem>
                      <MenuItem value="MEDIUM">Medium Flow</MenuItem>
                      <MenuItem value="HIGH">High Flow</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                Price ({config.defaultCurrency})
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <FormField
                fullWidth
                variant="outlined"
                size="small"
                type="number"
                step="0.01"
                value={coralForm.price}
                onChange={(e) => setCoralForm({...coralForm, price: e.target.value})}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                Image
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    component="label"
                    sx={{ flexGrow: 1 }}
                  >
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setCoralForm(prev => ({
                          ...prev, 
                          image: file,
                          imageUrl: null
                        }));
                      }}
                    />
                  </Button>
                  <Button
                    variant="contained"
                    color="info"
                    onClick={() => setShowImageSelector(true)}
                  >
                    Select Existing Image
                  </Button>
                </Box>
                
                {(coralForm.image || coralForm.imageUrl) && (
                  <Box sx={{ position: 'relative', width: 200, height: 200 }}>
                    <Box 
                      sx={{ 
                        width: '100%', 
                        height: '100%', 
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 1,
                        overflow: 'hidden'
                      }}
                    >
                      <img
                        src={coralForm.image 
                          ? URL.createObjectURL(coralForm.image)
                          : coralForm.imageUrl
                            ? `${BASE_URL}/uploads/${coralForm.imageUrl}`
                            : '/src/assets/images/image-coming-soon.svg'
                        }
                        alt="Coral preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: -10,
                        right: -10,
                        backgroundColor: theme.palette.error.main,
                        color: theme.palette.error.contrastText,
                        '&:hover': {
                          backgroundColor: theme.palette.error.dark,
                        }
                      }}
                      onClick={() => {
                        setCoralForm(prev => ({
                          ...prev,
                          image: null,
                          imageUrl: null
                        }));
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                Category
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <FormControl fullWidth size="small">
                <Select
                  value={coralForm.categoryId}
                  onChange={(e) => setCoralForm({...coralForm, categoryId: e.target.value})}
                  required
                  displayEmpty
                >
                  <MenuItem value="">Select Category</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                Quantity
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => setCoralForm(prev => ({
                    ...prev,
                    quantity: Math.max(0, parseInt(prev.quantity || 0) - 1).toString()
                  }))}
                >
                  <RemoveIcon />
                </IconButton>
                <TextField
                  variant="outlined"
                  size="small"
                  value={coralForm.quantity}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setCoralForm({...coralForm, quantity: value});
                    }
                  }}
                  required
                  sx={{ width: 80, textAlign: 'center' }}
                  inputProps={{ 
                    style: { textAlign: 'center' },
                    min: 0
                  }}
                />
                <IconButton
                  color="success"
                  size="small"
                  onClick={() => setCoralForm(prev => ({
                    ...prev,
                    quantity: (parseInt(prev.quantity || 0) + 1).toString()
                  }))}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                Min Stock
              </Typography>
            </Grid>
            <Grid item xs={12} sm={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  color="error"
                  size="small"
                  onClick={() => setCoralForm(prev => ({
                    ...prev,
                    minimumStock: Math.max(0, parseInt(prev.minimumStock || 0) - 1).toString()
                  }))}
                >
                  <RemoveIcon />
                </IconButton>
                <TextField
                  variant="outlined"
                  size="small"
                  value={coralForm.minimumStock}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      setCoralForm({...coralForm, minimumStock: value});
                    }
                  }}
                  required
                  sx={{ width: 80, textAlign: 'center' }}
                  inputProps={{ 
                    style: { textAlign: 'center' },
                    min: 0
                  }}
                />
                <IconButton
                  color="success"
                  size="small"
                  onClick={() => setCoralForm(prev => ({
                    ...prev,
                    minimumStock: (parseInt(prev.minimumStock || 0) + 1).toString()
                  }))}
                >
                  <AddIcon />
                </IconButton>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={() => navigate('/corals')}
                >
                  Cancel
                </Button>
                <ActionButton
                  variant="contained"
                  color="primary"
                  type="submit"
                >
                  Create Coral
                </ActionButton>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {showImageSelector && (
        <ImageSelector
          onSelect={(image) => {
            setCoralForm(prev => ({
              ...prev,
              image: null,
              imageUrl: image.relativePath
            }));
            setShowImageSelector(false);
          }}
          onClose={() => setShowImageSelector(false)}
          currentImage={coralForm.imageUrl}
        />
      )}
    </Container>
  );
};

export default AddCoral;
