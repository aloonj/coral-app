import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { coralService, categoryService, imageService, BASE_URL } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import ImageSelector from '../components/ImageGallery/ImageSelector';
import styles from './EditCoral.module.css';

const EditCoral = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const showAdditionalDetails = import.meta.env.VITE_SHOW_ADDITIONAL_CORAL_DETAILS === 'true';

  const initialFormState = {
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
  };

  const [coralForm, setCoralForm] = useState(initialFormState);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPERADMIN')) {
          navigate('/corals');
          return;
        }

        const [categoriesRes, coralRes] = await Promise.all([
          categoryService.getAllCategories(false),
          coralService.getCoral(id)
        ]);
        
        setCategories(categoriesRes.data.filter(cat => cat.status !== 'INACTIVE'));
        
        const formData = {
          ...initialFormState,
          speciesName: coralRes.data.speciesName || '',
          scientificName: coralRes.data.scientificName || '',
          description: coralRes.data.description || '',
          price: coralRes.data.price || '',
          categoryId: coralRes.data.categoryId || '',
          quantity: coralRes.data.quantity !== undefined ? coralRes.data.quantity : '',
          minimumStock: coralRes.data.minimumStock !== undefined ? coralRes.data.minimumStock : '',
          imageUrl: coralRes.data.imageUrl || null,
        };

        if (showAdditionalDetails) {
          formData.careLevel = coralRes.data.careLevel || 'EASY';
          formData.growthRate = coralRes.data.growthRate || 'MODERATE';
          formData.lightingRequirements = coralRes.data.lightingRequirements || '';
          formData.waterFlow = coralRes.data.waterFlow || 'MEDIUM';
        }

        setCoralForm(formData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setFormError(error.response?.data?.message || 'Error loading coral data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, navigate, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (isProcessingImage) {
      return;
    }

    try {
      const updatedData = new FormData();
      updatedData.append('speciesName', coralForm.speciesName);
      updatedData.append('scientificName', coralForm.scientificName);
      updatedData.append('description', coralForm.description);
      updatedData.append('price', parseFloat(coralForm.price));
      updatedData.append('categoryId', parseInt(coralForm.categoryId));
      updatedData.append('quantity', parseInt(coralForm.quantity));
      updatedData.append('minimumStock', parseInt(coralForm.minimumStock));

      if (coralForm.image) {
        updatedData.append('image', coralForm.image);
      } else if (coralForm.imageUrl) {
        updatedData.append('imageUrl', coralForm.imageUrl);
      } else {
        updatedData.append('imageUrl', 'null');
      }

      if (showAdditionalDetails) {
        updatedData.append('careLevel', coralForm.careLevel);
        updatedData.append('growthRate', coralForm.growthRate);
        updatedData.append('lightingRequirements', coralForm.lightingRequirements);
        updatedData.append('waterFlow', coralForm.waterFlow);
      }

      await coralService.updateCoral(id, updatedData);
      navigate('/corals');
    } catch (error) {
      console.error('Error saving coral:', error);
      setFormError(error.response?.data?.message || error.message || 'Error saving coral');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Edit Coral</h1>

      <form onSubmit={handleSubmit} className={styles.form}>
        {formError && (
          <div className={styles.error}>
            {formError}
          </div>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Species Name</label>
          <input
            className={styles.input}
            type="text"
            value={coralForm.speciesName}
            onChange={(e) => setCoralForm({...coralForm, speciesName: e.target.value})}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Scientific Name</label>
          <input
            className={styles.input}
            type="text"
            value={coralForm.scientificName}
            onChange={(e) => setCoralForm({...coralForm, scientificName: e.target.value})}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Description</label>
          <textarea
            className={styles.textarea}
            value={coralForm.description}
            onChange={(e) => setCoralForm({...coralForm, description: e.target.value})}
            required
          />
        </div>

        {showAdditionalDetails && (
          <>
            <div className={styles.formGroup}>
              <label className={styles.label}>Care Level</label>
              <select
                className={styles.select}
                value={coralForm.careLevel}
                onChange={(e) => setCoralForm({...coralForm, careLevel: e.target.value})}
              >
                <option value="EASY">Easy Care</option>
                <option value="MODERATE">Moderate Care</option>
                <option value="EXPERT">Expert Care</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Growth Rate</label>
              <select
                className={styles.select}
                value={coralForm.growthRate}
                onChange={(e) => setCoralForm({...coralForm, growthRate: e.target.value})}
              >
                <option value="SLOW">Slow Growth</option>
                <option value="MODERATE">Moderate Growth</option>
                <option value="FAST">Fast Growth</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Lighting</label>
              <input
                className={styles.input}
                type="text"
                value={coralForm.lightingRequirements}
                onChange={(e) => setCoralForm({...coralForm, lightingRequirements: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Water Flow</label>
              <select
                className={styles.select}
                value={coralForm.waterFlow}
                onChange={(e) => setCoralForm({...coralForm, waterFlow: e.target.value})}
              >
                <option value="LOW">Low Flow</option>
                <option value="MEDIUM">Medium Flow</option>
                <option value="HIGH">High Flow</option>
              </select>
            </div>
          </>
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Price</label>
          <input
            className={styles.input}
            type="number"
            step="0.01"
            value={coralForm.price}
            onChange={(e) => setCoralForm({...coralForm, price: e.target.value})}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Image</label>
          <div className={styles.imageContainer}>
            <div className={styles.imageInputGroup}>
              <input
                className={styles.imageInput}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  setCoralForm(prev => ({
                    ...prev, 
                    image: file,
                    imageUrl: null
                  }));
                }}
              />
              <button
                type="button"
                className={styles.selectImageButton}
                onClick={() => setShowImageSelector(true)}
              >
                Select Existing Image
              </button>
            </div>
            {(coralForm.image || coralForm.imageUrl) && (
              <div style={{ position: 'relative' }}>
                <div className={styles.imagePreview}>
                  <img
                    src={coralForm.image 
                      ? URL.createObjectURL(coralForm.image)
                      : coralForm.imageUrl
                        ? `${BASE_URL}/uploads/${coralForm.imageUrl}`
                        : '/src/assets/images/image-coming-soon.svg'
                    }
                    alt="Coral preview"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCoralForm(prev => ({
                      ...prev,
                      image: null,
                      imageUrl: null
                    }));
                  }}
                  className={styles.removeImageButton}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        {showImageSelector && (
          <ImageSelector
            onSelect={async (image) => {
              try {
                setIsProcessingImage(true);
                
                if (image.category === 'uncategorized') {
                  const categoryName = categories.find(cat => cat.id === parseInt(coralForm.categoryId))?.name;
                  if (!categoryName) {
                    setFormError('Please select a category before choosing an uncategorized image');
                    return;
                  }
                  const targetCategory = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
                  const response = await imageService.categorizeImage(
                    image.category,
                    image.filename,
                    targetCategory
                  );
                  
                  await new Promise(resolve => {
                    setCoralForm(prev => {
                      const newState = {
                        ...prev,
                        image: null,
                        imageUrl: response.data.newPath
                      };
                      resolve(newState);
                      return newState;
                    });
                  });
                } else {
                  await new Promise(resolve => {
                    setCoralForm(prev => {
                      const newState = {
                        ...prev,
                        image: null,
                        imageUrl: image.relativePath
                      };
                      resolve(newState);
                      return newState;
                    });
                  });
                }
                
                setShowImageSelector(false);
              } catch (error) {
                console.error('Error categorizing image:', error);
                setFormError(error.response?.data?.message || 'Error selecting image');
              } finally {
                setIsProcessingImage(false);
              }
            }}
            onClose={() => setShowImageSelector(false)}
            currentImage={coralForm.imageUrl}
          />
        )}

        <div className={styles.formGroup}>
          <label className={styles.label}>Category</label>
          <select
            className={styles.select}
            value={coralForm.categoryId}
            onChange={(e) => setCoralForm({...coralForm, categoryId: e.target.value})}
            required
          >
            <option value="">Select Category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Quantity</label>
          <div className={styles.quantityControl}>
            <button
              type="button"
              className={styles.decrementButton}
              onClick={() => setCoralForm(prev => ({
                ...prev,
                quantity: Math.max(0, parseInt(prev.quantity || 0) - 1).toString()
              }))}
            >
              -
            </button>
            <input
              className={styles.quantityInput}
              type="text"
              value={coralForm.quantity}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  setCoralForm({...coralForm, quantity: value});
                }
              }}
              required
            />
            <button
              type="button"
              className={styles.incrementButton}
              onClick={() => setCoralForm(prev => ({
                ...prev,
                quantity: (parseInt(prev.quantity || 0) + 1).toString()
              }))}
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Min Stock</label>
          <div className={styles.quantityControl}>
            <button
              type="button"
              className={styles.decrementButton}
              onClick={() => setCoralForm(prev => ({
                ...prev,
                minimumStock: Math.max(0, parseInt(prev.minimumStock || 0) - 1).toString()
              }))}
            >
              -
            </button>
            <input
              className={styles.quantityInput}
              type="text"
              value={coralForm.minimumStock}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  setCoralForm({...coralForm, minimumStock: value});
                }
              }}
              required
            />
            <button
              type="button"
              className={styles.incrementButton}
              onClick={() => setCoralForm(prev => ({
                ...prev,
                minimumStock: (parseInt(prev.minimumStock || 0) + 1).toString()
              }))}
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button className={styles.submitButton} type="submit">
            Update Coral
          </button>
          <button 
            className={styles.cancelButton}
            type="button"
            onClick={() => navigate('/corals')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditCoral;
