import { useState, useRef, useEffect } from 'react';
import placeholderImage from '../../assets/images/image-coming-soon.svg';
import { BASE_URL } from '../../services/api';

const ImageGallery = ({ 
  images = [], 
  alt = '', 
  style = {}, 
  onImageClick,
  showZoomIcon = true,
  enableDarkening = true,
  imageRef: externalImageRef
}) => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const internalImageRef = useRef(null);
  const imageContainerRef = useRef(null);
  
  // Use external ref if provided, otherwise use internal ref
  const imageRefToUse = externalImageRef || internalImageRef;
  
  // Find first non-null image URL
  const imageUrl = images.find(img => img !== null);
  
  // Only construct the full URL if the image is in view, otherwise use placeholder
  const displayUrl = isInView && imageUrl
    ? `${BASE_URL}/uploads/${
        imageUrl.startsWith('uncategorized/') 
          ? '' // Don't add corals/ prefix for uncategorized images
          : imageUrl.startsWith('corals/') 
            ? '' // Don't add corals/ prefix if it's already there
            : imageUrl.includes('/') 
              ? 'corals/' // Add corals/ prefix for category/filename paths
              : '' // Don't add prefix for root-level files
      }${imageUrl}`
    : placeholderImage;

  // Set up Intersection Observer to detect when image is in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsInView(true);
          // Once the image is in view, we can disconnect the observer
          observer.disconnect();
        }
      },
      { threshold: 0.1 } // Trigger when at least 10% of the image is visible
    );
    
    if (imageContainerRef.current) {
      observer.observe(imageContainerRef.current);
    }
    
    return () => {
      if (imageContainerRef.current) {
        observer.disconnect();
      }
    };
  }, []);

  const handleImageError = (e) => {
    e.target.src = placeholderImage;
    setIsLoaded(true); // Mark as loaded even if it's the fallback image
  };
  
  const handleImageLoad = () => {
    setIsLoaded(true);
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
      display: 'block',
      opacity: isLoaded ? 1 : 0.2, // Fade in when loaded
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
      ref={imageContainerRef}
      style={styles.container}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      onClick={() => onImageClick?.(images)}
    >
      <div style={styles.imageWrapper}>
        <img
          ref={imageRefToUse}
          src={displayUrl}
          alt={alt}
          style={styles.image}
          onError={handleImageError}
          onLoad={handleImageLoad}
          loading="lazy" // Add native lazy loading as a fallback
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
