import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { coralService, categoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';
import styles from './AddCoral.module.css';

const AddCoral = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState('');
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
      const coralData = {
        ...coralForm,
        price: parseFloat(coralForm.price),
        categoryId: parseInt(coralForm.categoryId),
        quantity: parseInt(coralForm.quantity),
        minimumStock: parseInt(coralForm.minimumStock)
      };

      await coralService.createCoral(coralData);
      navigate('/corals');
    } catch (error) {
      console.error('Error creating coral:', error);
      setFormError(error.response?.data?.message || error.message || 'Error creating coral');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Add New Coral</h1>

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
          <label className={styles.label}>Price ({config.defaultCurrency})</label>
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
          <div>
            <input
              className={styles.input}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                setCoralForm(prev => ({...prev, image: file}));
              }}
            />
            {coralForm.image && (
              <div className={styles.imagePreview}>
                <img
                  src={URL.createObjectURL(coralForm.image)}
                  alt="Coral preview"
                  onError={(e) => {
                    e.target.src = '/src/assets/images/image-coming-soon.svg';
                  }}
                />
              </div>
            )}
          </div>
        </div>

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
            Create Coral
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

export default AddCoral;
