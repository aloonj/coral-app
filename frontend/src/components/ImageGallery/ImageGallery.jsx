import { useState } from 'react';
import placeholderImage from '../../assets/images/image-coming-soon.svg';
import { BASE_URL } from '../../services/api';

const ImageGallery = ({ 
  images = [], 
  alt = '', 
  style = {}, 
  onImageClick,
  showZoomIcon = true,
  enableDarkening = true,
  imageRef
}) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Find first non-null image URL, prepend BASE_URL if it exists, or use placeholder
  const displayUrl = images.find(img => img !== null) 
    ? `${BASE_URL}/uploads/${
        images.find(img => img !== null).startsWith('uncategorized/') 
          ? '' // Don't add corals/ prefix for uncategorized images
          : images.find(img => img !== null).startsWith('corals/') 
            ? '' // Don't add corals/ prefix if it's already there
            : images.find(img => img !== null).includes('/') 
              ? 'corals/' // Add corals/ prefix for category/filename paths
              : '' // Don't add prefix for root-level files
      }${images.find(img => img !== null)}`
    : placeholderImage;

  const handleImageError = (e) => {
    e.target.src = placeholderImage;
  };

  const styles = {
    container: {
      position: 'relative',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      ...style
    },
    imageWrapper: {
      position: 'relative',
      width: '100%',
      height: '100%',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: style.objectFit || 'contain',
      transition: 'all 0.3s ease-in-out',
      display: 'block'
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: showOverlay && enableDarkening ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background-color 0.3s ease-in-out',
      opacity: showOverlay ? 1 : 0
    },
    zoomIcon: {
      color: 'white',
      fontSize: '24px',
      opacity: showOverlay && showZoomIcon ? 0.8 : 0,
      transform: showOverlay && showZoomIcon ? 'scale(1)' : 'scale(0.8)',
      transition: 'all 0.3s ease-in-out'
    }
  };

  return (
    <div 
      style={styles.container}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      onClick={() => onImageClick?.(images)}
    >
      <div style={styles.imageWrapper}>
        <img
          ref={imageRef}
          src={displayUrl}
          alt={alt}
          style={styles.image}
          onError={handleImageError}
        />
      </div>
      <div style={styles.overlay}>
        <div style={styles.zoomIcon}>
          {showZoomIcon && '🔍'}
        </div>
      </div>
    </div>
  );
};

export default ImageGallery;
