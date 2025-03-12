import { useState, useEffect } from 'react';
import ImageGallery from './ImageGallery';

const ImageModal = ({ images = [], alt = '', onClose }) => {

  const modalOverlayStyle = {
    position: 'fixed',
    top: '64px', // Start below header
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
  };

  const modalContentStyle = {
    position: 'relative',
    width: '90%',
    maxWidth: '1200px',
    height: '80vh',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    overflow: 'hidden',
    cursor: 'default',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9999,
    fontSize: '18px',
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div 
        style={modalContentStyle} 
        onClick={(e) => e.stopPropagation()}
      >
        <button style={closeButtonStyle} onClick={onClose} aria-label="Close modal">
          ×
        </button>
        <div style={{ 
          position: 'relative', 
          width: '95%', 
          height: '95%', 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          overflow: 'hidden'
        }}>
          <ImageGallery
            images={images}
            alt={alt}
            style={{ width: '100%', height: '100%' }}
            showControls={true}
            showZoomIcon={false}
            enableDarkening={false}
            enableZoom={false}
            // Force the image to load immediately when modal opens
            key={`modal-image-${Date.now()}`}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageModal;
