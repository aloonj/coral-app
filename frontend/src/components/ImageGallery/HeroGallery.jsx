import { useState, useEffect } from 'react';
import { BASE_URL } from '../../services/api';
import styles from './HeroGallery.module.css';

const HeroGallery = ({ images = [], interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (images.length <= 1) return;
    
    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
        setIsTransitioning(false);
      }, 500); // Transition duration
    }, interval);
    
    return () => clearInterval(timer);
  }, [images.length, interval]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div className={styles.heroGalleryContainer}>
      <div 
        className={`${styles.heroImage} ${isTransitioning ? styles.fadeOut : styles.fadeIn}`}
        style={{ 
          backgroundImage: `url(${BASE_URL}/uploads/${currentImage.imageUrl})` 
        }}
      >
        <div className={styles.overlay}>
          <h2 className={styles.coralName}>{currentImage.speciesName}</h2>
        </div>
      </div>
    </div>
  );
};

export default HeroGallery;
