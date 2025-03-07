import { useState, useEffect, useRef } from 'react';
import { imageService } from '../services/api';
import ImageGallery from '../components/ImageGallery/ImageGallery';
import styles from './ImageManagement.module.css';
import { FaFolder, FaFolderOpen, FaLevelUpAlt, FaUpload, FaWrench } from 'react-icons/fa';

const ImageManagement = () => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentPath, setCurrentPath] = useState(['uploads']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixResults, setFixResults] = useState(null);
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

  const handleUncategorizeImage = async (image) => {
    if (window.confirm('Are you sure you want to uncategorize this image?')) {
      try {
        await imageService.uncategorizeImage(image.category, image.filename);
        // Refresh images to show updated state
        await fetchImages();
      } catch (err) {
        setError('Failed to uncategorize image');
      }
    }
  };

  const handleDeleteImage = async (image) => {
    if (window.confirm('Are you sure you want to delete this image?')) {
      try {
        await imageService.deleteImage(image.category, image.filename);
        setImages(images.filter(img => 
          !(img.category === image.category && img.filename === image.filename)
        ));
      } catch (err) {
        setError('Failed to delete image');
      }
    }
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
      await imageService.uploadImages(files, 'uncategorized');
      // Refresh the image list
      await fetchImages();
      event.target.value = ''; // Reset file input
      // Navigate to uncategorized folder
      setCurrentPath(['uploads', 'uncategorized']);
    } catch (err) {
      setError('Failed to upload images. ' + (err.response?.data?.message || err.message));
    } finally {
      setUploading(false);
    }
  };

  /**
   * TEMPORARY FUNCTION: Handle fixing uncategorized images that are in use by corals
   * This function will be removed once all existing images are properly categorized.
   */
  const handleFixUncategorizedImages = async () => {
    if (window.confirm('This will move all uncategorized images that are in use by corals to their appropriate category folders. Continue?')) {
      setFixing(true);
      setError(null);
      setFixResults(null);
      
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

  if (loading) return <div className={styles.loading}>Loading images...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Image Management</h1>
      <div className={styles.pathNavigation}>
        <div className={styles.navigationControls}>
          <button onClick={handleBackClick} className={styles.upDirButton} disabled={currentPath.length === 1}>
            <FaLevelUpAlt /> Up a Directory
          </button>
          <div className={styles.breadcrumbs}>
            {currentPath.map((path, index) => (
              <span key={index}>
                {index > 0 && <span className={styles.separator}>/</span>}
                {path}
              </span>
            ))}
          </div>
        </div>
        {(currentPath.length === 1 || currentPath[currentPath.length - 1] === 'uncategorized') && (
          <div className={styles.uploadButtonContainer}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
            />
            <button 
              onClick={handleUpload} 
              className={styles.uploadButton}
              disabled={uploading}
            >
              <FaUpload /> {uploading ? 'Uploading...' : 'bulk upload images'}
            </button>
            
            {/* TEMPORARY BUTTON: For fixing uncategorized images that are in use by corals */}
            <button 
              onClick={handleFixUncategorizedImages} 
              className={`${styles.uploadButton} ${styles.fixButton}`}
              disabled={fixing}
            >
              <FaWrench /> {fixing ? 'Fixing...' : 'Fix Uncategorized Images'}
            </button>
          </div>
        )}
        
        {/* TEMPORARY SECTION: Display results of the fix operation */}
        {fixResults && (
          <div className={styles.fixResults}>
            <h3>Fix Results</h3>
            <p>Total images processed: {fixResults.total}</p>
            <p>Successfully moved: {fixResults.success}</p>
            <p>Failed: {fixResults.failed}</p>
            {fixResults.failed > 0 && (
              <details>
                <summary>View Details</summary>
                <ul>
                  {fixResults.details.filter(d => d.status === 'failed').map((detail, idx) => (
                    <li key={idx}>
                      Failed to move image for coral "{detail.coralName}" (ID: {detail.coralId}): {detail.error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>

      {getCurrentLevel() === 'root' && (
        <div className={styles.folderGrid}>
          <div 
            className={styles.folderContainer}
            onClick={() => handleFolderClick('corals')}
          >
            <FaFolder className={styles.folderIcon} />
            <span className={styles.folderName}>corals</span>
          </div>
          <div 
            className={styles.folderContainer}
            onClick={() => handleFolderClick('uncategorized')}
          >
            <FaFolder className={styles.folderIcon} />
            <span className={styles.folderName}>uncategorized</span>
          </div>
        </div>
      )}

      {getCurrentLevel() === 'categories' && (
        <div className={styles.folderGrid}>
          {Object.entries(groupedImages)
            .filter(([category]) => category !== 'uncategorized')
            .map(([category, { name, images: categoryImages }]) => (
            <div 
              key={category} 
              className={styles.folderContainer}
              onClick={() => handleFolderClick(category)}
            >
              <FaFolder className={styles.folderIcon} />
              <span className={styles.folderName}>{name}</span>
              <span className={styles.imageCount}>
                {categoryImages.length} image{categoryImages.length !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      {getCurrentLevel() === 'images' && (
        <div className={styles.categorySection}>
          <h2 className={styles.categoryTitle}>
            {groupedImages[currentPath[currentPath.length - 1]]?.name || 
             currentPath[currentPath.length - 1].charAt(0).toUpperCase() + 
             currentPath[currentPath.length - 1].slice(1)}
          </h2>
          <div className={styles.imageGrid}>
            {groupedImages[currentPath[currentPath.length - 1]]?.images.map((image, index) => (
              <div key={index} className={styles.imageContainer}>
                <ImageGallery
                  images={[image.relativePath]}
                  alt={`${groupedImages[currentPath[currentPath.length - 1]]?.name || 'Uncategorized'} image ${index + 1}`}
                  onImageClick={() => handleImageClick(image.relativePath)}
                  showZoomIcon={false}
                  enableDarkening={false}
                  style={{ height: '200px', width: '100%', objectFit: 'cover' }}
                />
                <div className={`${styles.imageInfo} ${image.inUse ? styles.inUseInfo : ''}`}>
                  <div className={`${styles.imageDetails} ${image.inUse ? styles.inUseDetails : ''}`}>
                    <span className={styles.filename}>{image.filename}</span>
                  <div className={styles.imageMetadata}>
                    <span className={styles.uploadDate}>
                      {new Date(image.createdAt).toLocaleDateString()}
                    </span>
                    <span className={image.inUse ? styles.inUse : styles.notInUse}>
                      {image.inUse ? 'In use' : 'Not in use'}
                    </span>
                    <span className={styles.fileInfo}>
                      {image.type.toUpperCase()} <span className={styles.bullet}>•</span> {(image.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  </div>
                  <div className={styles.imageActions}>
                    {!image.inUse && image.category !== 'uncategorized' && (
                      <button 
                        onClick={() => handleUncategorizeImage(image)}
                        className={styles.uncategorizeButton}
                      >
                        Uncategorize
                      </button>
                    )}
                    <button 
                      onClick={() => handleDeleteImage(image)}
                      className={styles.deleteButton}
                      disabled={image.inUse}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && getCurrentLevel() === 'images' && (
        <div className={styles.noImages}>
          No images found
        </div>
      )}
    </div>
  );
};

export default ImageManagement;
