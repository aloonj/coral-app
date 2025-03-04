import { useState, useEffect, useRef } from 'react';
import { BASE_URL } from '../../services/api';
import styles from './HeroGallery.module.css';

const HeroGallery = ({ images = [], interval = 10000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (images.length <= 1) return;
    
    const startTimer = () => {
      timerRef.current = setInterval(() => {
        if (!isPaused) {
          setIsTransitioning(true);
          setTimeout(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
            setIsTransitioning(false);
          }, 500); // Transition duration
        }
      }, interval);
    };
    
    startTimer();
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [images.length, interval, isPaused]);

  if (!images || images.length === 0) return null;

  const currentImage = images[currentIndex];

  const handleMouseEnter = () => {
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  return (
    <div 
      className={styles.heroGalleryContainer}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
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
