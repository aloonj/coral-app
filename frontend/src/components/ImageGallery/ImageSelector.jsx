import { useState, useEffect } from 'react';
import { imageService } from '../../services/api';
import ImageGallery from './ImageGallery';
import styles from './ImageSelector.module.css';
import { FaFolder, FaFolderOpen, FaLevelUpAlt } from 'react-icons/fa';

const ImageSelector = ({ onSelect, onClose, currentImage }) => {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [currentPath, setCurrentPath] = useState(['uploads']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const handleFolderClick = (folderName) => {
    setCurrentPath([...currentPath, folderName]);
  };

  const handleBackClick = () => {
    if (currentPath.length > 1) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  const getCurrentLevel = () => {
    if (currentPath.length === 1) return 'root';
    if (currentPath.length === 2 && currentPath[1] === 'corals') return 'categories';
    return 'images';
  };

  const handleConfirmSelection = () => {
    if (selectedImage) {
      onSelect(selectedImage);
    }
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
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Select Image</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div className={styles.pathNavigation}>
          <button 
            onClick={handleBackClick} 
            className={styles.upDirButton} 
            disabled={currentPath.length === 1}
          >
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
            <h3 className={styles.categoryTitle}>
              {groupedImages[currentPath[currentPath.length - 1]]?.name || 
               currentPath[currentPath.length - 1].charAt(0).toUpperCase() + 
               currentPath[currentPath.length - 1].slice(1)}
            </h3>
            <div className={styles.imageGrid}>
              {groupedImages[currentPath[currentPath.length - 1]]?.images.map((image, index) => (
                <div 
                  key={index} 
                  className={`${styles.imageContainer} ${
                    selectedImage?.relativePath === image.relativePath ? styles.selected : ''
                  } ${currentImage === image.relativePath ? styles.current : ''}`}
                  onClick={() => handleImageClick(image)}
                >
                  <ImageGallery
                    images={[image.relativePath]}
                    alt={`${image.categoryName} image ${index + 1}`}
                    showZoomIcon={false}
                    enableDarkening={false}
                    style={{ height: '150px', width: '100%', objectFit: 'cover' }}
                  />
                  <div className={styles.imageInfo}>
                    <span className={styles.filename}>{image.filename}</span>
                    <div className={styles.imageMetadata}>
                      <span className={styles.uploadDate}>
                        {new Date(image.createdAt).toLocaleDateString()}
                      </span>
                      <span className={styles.fileInfo}>
                        {image.type.toUpperCase()} • {(image.size / 1024).toFixed(1)} KB
                      </span>
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

        <div className={styles.modalFooter}>
          <button 
            className={styles.cancelButton} 
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={styles.selectButton}
            onClick={handleConfirmSelection}
            disabled={!selectedImage}
          >
            Select Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageSelector;
