import { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardMedia, 
  CardContent, 
  CardActions, 
  Button, 
  IconButton, 
  Breadcrumbs, 
  Link, 
  Chip, 
  LinearProgress,
  Paper,
  Divider,
  ImageList,
  ImageListItem,
  Stack
} from '@mui/material';
import { 
  Folder as FolderIcon, 
  FolderOpen as FolderOpenIcon, 
  ArrowUpward as ArrowUpwardIcon, 
  Upload as UploadIcon, 
  Build as BuildIcon,
  NavigateNext as NavigateNextIcon
} from '@mui/icons-material';
import { imageService } from '../services/api';
import ImageGallery from '../components/ImageGallery/ImageGallery';
import ConfirmationDialog from '../components/ConfirmationDialog';
import StatusMessage from '../components/StatusMessage';
import ActionButtonGroup from '../components/ActionButtonGroup';

const ImageManagement = () => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentPath, setCurrentPath] = useState(['uploads']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fixing, setFixing] = useState(false);
  const [fixResults, setFixResults] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await imageService.getAllImages();
      setImages(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load images');
      setLoading(false);
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const handleUncategorizeImage = (image) => {
    setConfirmDialog({
      open: true,
      title: 'Uncategorize Image',
      message: 'Are you sure you want to uncategorize this image?',
      onConfirm: async () => {
        try {
          await imageService.uncategorizeImage(image.category, image.filename);
          // Refresh images to show updated state
          await fetchImages();
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (err) {
          setError('Failed to uncategorize image');
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      }
    });
  };

  const handleDeleteImage = (image) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Image',
      message: 'Are you sure you want to delete this image?',
      confirmColor: 'error',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await imageService.deleteImage(image.category, image.filename);
          setImages(images.filter(img => 
            !(img.category === image.category && img.filename === image.filename)
          ));
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (err) {
          setError('Failed to delete image');
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      }
    });
  };

  const handleFolderClick = (folderName) => {
    setCurrentPath([...currentPath, folderName]);
  };

  const handleBackClick = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const handleUpload = async () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    // Validate number of files
    if (files.length > 20) {
      setError('Maximum 20 files can be uploaded at once');
      setUploading(false);
      event.target.value = '';
      return;
    }

    // Validate file sizes
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    const oversizedFiles = files.filter(file => file.size > MAX_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`${oversizedFiles.length} file(s) exceed the 5MB size limit:\n${
        oversizedFiles.map(f => `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB)`).join('\n')
      }`);
      setUploading(false);
      event.target.value = '';
      return;
    }

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + 5;
          return newProgress >= 100 ? 99 : newProgress;
        });
      }, 200);

      await imageService.uploadImages(files, 'uncategorized');
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Refresh the image list
      await fetchImages();
      event.target.value = ''; // Reset file input
      
      // Navigate to uncategorized folder
      setCurrentPath(['uploads', 'uncategorized']);
      
      // Reset upload state after a short delay
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (err) {
      setError('Failed to upload images. ' + (err.response?.data?.message || err.message));
      setUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * TEMPORARY FUNCTION: Handle fixing uncategorized images that are in use by corals
   * This function will be removed once all existing images are properly categorized.
   */
  const handleFixUncategorizedImages = () => {
    setConfirmDialog({
      open: true,
      title: 'Fix Uncategorized Images',
      message: 'This will move all uncategorized images that are in use by corals to their appropriate category folders. Continue?',
      onConfirm: async () => {
        setFixing(true);
        setError(null);
        setFixResults(null);
        setConfirmDialog({ ...confirmDialog, open: false });
        
        try {
          const response = await imageService.fixUncategorizedImages();
          setFixResults(response.data);
          // Refresh images to show updated state
          await fetchImages();
        } catch (err) {
          setError('Failed to fix uncategorized images: ' + (err.response?.data?.message || err.message));
        } finally {
          setFixing(false);
        }
      }
    });
  };

  const getCurrentLevel = () => {
    if (currentPath.length === 1) return 'root';
    if (currentPath.length === 2 && currentPath[1] === 'corals') return 'categories';
    return 'images';
  };

  // Group images by category
  const groupedImages = images.reduce((acc, image) => {
    if (!acc[image.category]) {
      acc[image.category] = {
        name: image.categoryName,
        images: []
      };
    }
    acc[image.category].images.push(image);
    return acc;
  }, {});

  const handleBreadcrumbClick = (index) => {
    setCurrentPath(currentPath.slice(0, index + 1));
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <LinearProgress />
          <Typography variant="h5" sx={{ mt: 2 }}>Loading images...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Image Management
      </Typography>

      {error && <StatusMessage error={error} />}

      <Paper sx={{ p: 2, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowUpwardIcon />}
            onClick={handleBackClick}
            disabled={currentPath.length === 1}
            sx={{ mr: 2 }}
          >
            Up a Directory
          </Button>
          
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="folder navigation"
          >
            {currentPath.map((path, index) => (
              <Link
                key={index}
                color="inherit"
                component="button"
                variant="body2"
                onClick={() => handleBreadcrumbClick(index)}
                underline={index === currentPath.length - 1 ? 'none' : 'hover'}
                sx={{ 
                  fontWeight: index === currentPath.length - 1 ? 'bold' : 'normal',
                  cursor: 'pointer'
                }}
              >
                {path}
              </Link>
            ))}
          </Breadcrumbs>
        </Box>

        {(currentPath.length === 1 || currentPath[currentPath.length - 1] === 'uncategorized') && (
          <>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
              />
              <Button 
                variant="contained" 
                color="success"
                startIcon={<UploadIcon />}
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Bulk Upload Images'}
              </Button>
              
              {/* TEMPORARY BUTTON: For fixing uncategorized images that are in use by corals */}
              <Button 
                variant="contained" 
                color="warning"
                startIcon={<BuildIcon />}
                onClick={handleFixUncategorizedImages}
                disabled={fixing}
              >
                {fixing ? 'Fixing...' : 'Fix Uncategorized Images'}
              </Button>
            </Box>
            
            {uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="determinate" value={uploadProgress} />
                <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                  Uploading... {uploadProgress}%
                </Typography>
              </Box>
            )}
          </>
        )}
        
        {/* TEMPORARY SECTION: Display results of the fix operation */}
        {fixResults && (
          <Paper sx={{ mt: 3, p: 2, borderLeft: '4px solid #4caf50' }}>
            <Typography variant="h6">Fix Results</Typography>
            <Typography variant="body2">Total images processed: {fixResults.total}</Typography>
            <Typography variant="body2">Successfully moved: {fixResults.success}</Typography>
            <Typography variant="body2">Failed: {fixResults.failed}</Typography>
            {fixResults.failed > 0 && (
              <Box component="details" sx={{ mt: 1 }}>
                <Box component="summary" sx={{ cursor: 'pointer', color: 'primary.main', fontWeight: 500 }}>
                  View Details
                </Box>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  {fixResults.details.filter(d => d.status === 'failed').map((detail, idx) => (
                    <Box component="li" key={idx} sx={{ color: 'error.main', fontSize: '0.875rem', mb: 0.5 }}>
                      Failed to move image for coral "{detail.coralName}" (ID: {detail.coralId}): {detail.error}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Paper>
        )}
      </Paper>

      {getCurrentLevel() === 'root' && (
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => handleFolderClick('corals')}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <FolderIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" component="div">
                  corals
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3}>
            <Card 
              sx={{ 
                height: '100%', 
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
              onClick={() => handleFolderClick('uncategorized')}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <FolderIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" component="div">
                  uncategorized
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {getCurrentLevel() === 'categories' && (
        <Grid container spacing={3}>
          {Object.entries(groupedImages)
            .filter(([category]) => category !== 'uncategorized')
            .map(([category, { name, images: categoryImages }]) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={category}>
              <Card 
                sx={{ 
                  height: '100%', 
                  cursor: 'pointer',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleFolderClick(category)}
              >
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <FolderIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" component="div">
                    {name}
                  </Typography>
                  <Chip 
                    label={`${categoryImages.length} image${categoryImages.length !== 1 ? 's' : ''}`}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {getCurrentLevel() === 'images' && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            {groupedImages[currentPath[currentPath.length - 1]]?.name || 
             currentPath[currentPath.length - 1].charAt(0).toUpperCase() + 
             currentPath[currentPath.length - 1].slice(1)}
          </Typography>
          
          {groupedImages[currentPath[currentPath.length - 1]]?.images.length > 0 ? (
            <ImageList 
              cols={4} 
              gap={24}
              sx={{ 
                gridTemplateColumns: {
                  xs: 'repeat(1, 1fr)',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                  lg: 'repeat(4, 1fr)'
                }
              }}
            >
              {groupedImages[currentPath[currentPath.length - 1]]?.images.map((image, index) => (
                <ImageListItem key={index}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ height: 200, position: 'relative' }}>
                      <ImageGallery
                        images={[image.relativePath]}
                        alt={`${groupedImages[currentPath[currentPath.length - 1]]?.name || 'Uncategorized'} image ${index + 1}`}
                        onImageClick={() => handleImageClick(image.relativePath)}
                        showZoomIcon={false}
                        enableDarkening={false}
                        style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                      />
                    </Box>
                    <CardContent sx={{ bgcolor: 'grey.50', flexGrow: 1, p: 2 }}>
                      <Typography variant="subtitle2" noWrap title={image.filename}>
                        {image.filename}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(image.createdAt).toLocaleDateString()}
                        </Typography>
                        <Chip 
                          label={image.inUse ? 'In use' : 'Not in use'} 
                          size="small"
                          color={image.inUse ? 'primary' : 'default'}
                          variant={image.inUse ? 'filled' : 'outlined'}
                          sx={{ height: 20, '& .MuiChip-label': { px: 1, py: 0 } }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {image.type.toUpperCase()} • {(image.size / 1024).toFixed(1)} KB
                        </Typography>
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ p: 1, pt: 0 }}>
                      <ActionButtonGroup justifyContent="space-between" sx={{ width: '100%', mt: 0 }}>
                        {!image.inUse && image.category !== 'uncategorized' && (
                          <Button 
                            size="small" 
                            variant="outlined"
                            color="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUncategorizeImage(image);
                            }}
                          >
                            Uncategorize
                          </Button>
                        )}
                        <Button 
                          size="small" 
                          variant="outlined"
                          color="error"
                          disabled={image.inUse}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(image);
                          }}
                          sx={{ ml: 'auto' }}
                        >
                          Delete
                        </Button>
                      </ActionButtonGroup>
                    </CardActions>
                  </Card>
                </ImageListItem>
              ))}
            </ImageList>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
              <Typography variant="h6" color="text.secondary">
                No images found
              </Typography>
            </Paper>
          )}
        </Box>
      )}

      <ConfirmationDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
        confirmText={confirmDialog.confirmText || "Confirm"}
        confirmColor={confirmDialog.confirmColor || "primary"}
      />
    </Container>
  );
};

export default ImageManagement;
