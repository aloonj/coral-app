import { useState, useEffect } from 'react';
import styles from './Corals.module.css';
import { useNavigate } from 'react-router-dom';
import { coralService, categoryService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';
import api, { BASE_URL } from '../services/api';
import ImageGallery from '../components/ImageGallery/ImageGallery';
import ImageModal from '../components/ImageGallery/ImageModal';

const Corals = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPERADMIN';
  const hasAdminPrivileges = isAdmin || isSuperAdmin;
  const [corals, setCorals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactiveCategories, setShowInactiveCategories] = useState(true); // Start with inactive visible for admin
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedCoral, setSelectedCoral] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const showAdditionalDetails = import.meta.env.VITE_SHOW_ADDITIONAL_CORAL_DETAILS === 'true';
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coralsRes, categoriesRes] = await Promise.all([
          coralService.getAllCorals(),
          categoryService.getAllCategories(showInactiveCategories),
        ]);
        setCorals(coralsRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showInactiveCategories]);

  const [categoryFormError, setCategoryFormError] = useState('');
  const [categoryError, setCategoryError] = useState('');

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setCategoryFormError('');

    try {
      if (editingCategory) {
        await categoryService.updateCategory(editingCategory.id, categoryForm);
      } else {
        await categoryService.createCategory(categoryForm);
      }
      const res = await categoryService.getAllCategories(showInactiveCategories);
      setCategories(res.data);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '' });
    } catch (error) {
      console.error('Error saving category:', error);
      setCategoryFormError(error.response?.data?.message || error.message || 'Error saving category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (window.confirm('Are you sure you want to delete this category? This will make the category inactive.')) {
      try {
        await categoryService.deleteCategory(categoryId);
        const res = await categoryService.getAllCategories(showInactiveCategories);
        setCategories(res.data);
        setCategoryError('');
      } catch (error) {
        console.error('Error deleting category:', error);
        setCategoryError(error.response?.data?.message || 'Error deleting category');
      }
    }
  };

  const handleRestoreCategory = async (categoryId) => {
    try {
      await categoryService.restoreCategory(categoryId);
      const res = await categoryService.getAllCategories(showInactiveCategories);
      setCategories(res.data);
      setCategoryError('');
    } catch (error) {
      console.error('Error restoring category:', error);
      setCategoryError(error.response?.data?.message || 'Error restoring category');
    }
  };

  const handleDeleteCoral = async (coralId) => {
    if (window.confirm('Are you sure you want to delete this coral?')) {
      try {
        await coralService.deleteCoral(coralId);
        const res = await coralService.getAllCorals();
        setCorals(res.data);
      } catch (error) {
        console.error('Error deleting coral:', error);
      }
    }
  };

  // Styles
  const containerStyle = {
    background: 'white',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    maxWidth: '1400px',
    margin: '0 auto',
    boxSizing: 'border-box',
  };

  const headerStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    color: '#2D3748',
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  };

  const thStyle = {
    padding: '1rem',
    textAlign: 'left',
    backgroundColor: '#F7FAFC',
    borderBottom: '2px solid #E2E8F0',
    color: '#4A5568',
    fontWeight: 'bold',
  };

  const tdStyle = {
    padding: '1rem',
    borderBottom: '1px solid #E2E8F0',
    verticalAlign: 'middle',
  };

  const categoryHeaderStyle = {
    padding: '1rem',
    background: 'linear-gradient(135deg, #2C5282 0%, #4299E1 100%)',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    textAlign: 'left',
    cursor: 'pointer',
    userSelect: 'none',
  };

  const getStockStatus = (coral) => {
    if (coral.quantity === 0) return 'OUT_OF_STOCK';
    if (coral.quantity <= coral.minimumStock) return 'LOW_STOCK';
    return 'AVAILABLE';
  };

  const cardStyle = (coral) => ({
    backgroundColor: 
      getStockStatus(coral) === 'OUT_OF_STOCK' ? '#FED7D7' :
      getStockStatus(coral) === 'LOW_STOCK' ? '#FEEBC8' : 
      'white'
  });

  const imageStyle = {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  };

  const cardContentStyle = {
    padding: '1rem',
  };

  const buttonStyle = {
    padding: '0.5rem 1rem',
    backgroundColor: '#319795',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  };

  const toggleCategory = (categoryId) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const modalStyle = {
    position: 'fixed',
    top: '64px', // Start from header height
    left: '50%',
    transform: 'translate(-50%, 10vh)', // Move down by 10vh from the top
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '0.5rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    zIndex: 9999,
    maxWidth: '600px',
    width: '90%',
    maxHeight: 'calc(90vh - 64px)', // Subtract header height from max height
    overflowY: 'auto',
    boxSizing: 'border-box',
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: '64px', // Start below header
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9998,
  };

  const formStyle = {
    display: 'grid',
    gridTemplateColumns: '150px 1fr',
    gap: '1rem',
    alignItems: 'start',
  };

  const labelStyle = {
    fontWeight: 'bold',
    color: '#4A5568',
    paddingTop: '0.5rem',
  };

  const inputStyle = {
    padding: '0.5rem',
    borderRadius: '0.375rem',
    border: '1px solid #CBD5E0',
  };

  const loadingStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    fontSize: '1.25rem',
    color: '#4A5568',
  };

  if (loading) {
    return <div style={loadingStyle}>Loading...</div>;
  }

  // Filter out corals with invalid categories
  const validCorals = corals.filter(coral => {
    const hasValidCategory = categories.some(cat => cat.id === coral.categoryId && cat.status !== 'INACTIVE');
    if (!hasValidCategory) {
      console.warn(`Coral ${coral.speciesName} has invalid or inactive category ID: ${coral.categoryId}`);
    }
    return hasValidCategory;
  });

  // Get active categories for display
  const activeCategories = categories.filter(cat => cat.status !== 'INACTIVE');

  return (
    <div className={styles.container}>
      {categoryError && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#FED7D7',
          color: '#C53030',
          borderRadius: '0.375rem'
        }}>
          {categoryError}
        </div>
      )}

      <div>
        <h1 className={styles.header}>Coral Management</h1>
        {hasAdminPrivileges && (
          <div>
            <button
              className={`${styles.button} ${styles.addButton}`}
              onClick={() => navigate('/corals/add')}
            >
              Add Coral
            </button>
            <button
              className={`${styles.button} ${styles.addButton}`}
              style={{marginLeft: '1rem', backgroundColor: '#805AD5'}}
              onClick={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '' });
                setShowCategoryModal(true);
              }}
            >
              Manage Categories
            </button>
          </div>
        )}
      </div>

      <div className={styles.categoryTabs}>
        <button
          style={{
            ...buttonStyle,
            backgroundColor: selectedCategory === null ? '#319795' : '#CBD5E0',
            padding: '0.25rem 0.75rem',
          }}
          onClick={() => setSelectedCategory(null)}
        >
          All Categories
        </button>
        {activeCategories.map(category => (
          <button
            key={category.id}
            style={{
              ...buttonStyle,
              backgroundColor: selectedCategory === category.id ? '#319795' : '#CBD5E0',
              padding: '0.25rem 0.75rem',
            }}
            onClick={() => setSelectedCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>

      {(selectedCategory ? activeCategories.filter(c => c.id === selectedCategory) : activeCategories).map(category => {
        // Get and sort corals for this category
        const categoryCorals = validCorals
          .filter(coral => coral.categoryId === category.id)
          .sort((a, b) => a.speciesName.localeCompare(b.speciesName));
        
        // Skip if category has no corals
        if (categoryCorals.length === 0) return null;

        return (
          <div key={category.id} style={{ marginBottom: '2rem' }}>
            <div 
              style={{
                ...categoryHeaderStyle,
                marginBottom: '1rem',
                padding: '1rem',
                background: 'linear-gradient(135deg, #2C5282 0%, #4299E1 100%)',
                borderRadius: '0.5rem',
              }}
              onClick={() => toggleCategory(category.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {collapsedCategories.has(category.id) ? '▶' : '▼'} {category.name}
                </div>
              </div>
            </div>

            {!collapsedCategories.has(category.id) && (
              <div className={styles.coralGrid}>
                {categoryCorals.map(coral => (
                  <div key={coral.id} className={styles.card} style={cardStyle(coral)}>
                    <div className={styles.imageContainer}>
                      <ImageGallery
                        images={[coral.imageUrl]}
                        alt={coral.speciesName}
                        className={styles.image}
                        onImageClick={() => {
                          setSelectedCoral(coral);
                          setShowImageModal(true);
                        }}
                      />
                    </div>
                    <div style={cardContentStyle}>
                      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.25rem' }}>{coral.speciesName}</h3>
                      <p style={{ margin: '0 0 0.5rem', color: '#718096', fontSize: '0.875rem' }}>
                        {coral.scientificName}
                      </p>
                      <p style={{ margin: '0 0 1rem', fontSize: '0.875rem' }}>
                        {coral.description}
                      </p>
                      {showAdditionalDetails && (
                        <>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Care Level:</strong> {coral.careLevel}
                          </div>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Growth Rate:</strong> {coral.growthRate}
                          </div>
                        </>
                      )}
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Category:</strong> {category.name}
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Price:</strong> {config.defaultCurrency}{coral.price}
                      </div>
                      <div style={{ 
                        marginBottom: '0.5rem',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        backgroundColor: 
                          getStockStatus(coral) === 'OUT_OF_STOCK' ? '#FED7D7' :
                          getStockStatus(coral) === 'LOW_STOCK' ? '#FEEBC8' : '#C6F6D5',
                        color:
                          getStockStatus(coral) === 'OUT_OF_STOCK' ? '#822727' :
                          getStockStatus(coral) === 'LOW_STOCK' ? '#744210' : '#22543D',
                      }}>
                        {coral.quantity} {
                          getStockStatus(coral) === 'OUT_OF_STOCK' ? '(Out of Stock)' :
                          getStockStatus(coral) === 'LOW_STOCK' ? '(Low Stock)' :
                          'in stock'
                        }
                      </div>
                      {hasAdminPrivileges && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button
                            style={{...buttonStyle, backgroundColor: '#4299E1', flex: 1}}
                            onClick={() => navigate(`/corals/${coral.id}/edit`)}
                          >
                            Edit
                          </button>
                          <button
                            style={{...buttonStyle, backgroundColor: '#F56565', flex: 1}}
                            onClick={() => handleDeleteCoral(coral.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Category Modal */}
      {showCategoryModal && (
        <>
          <div style={modalOverlayStyle} onClick={() => {
            setShowCategoryModal(false);
            setCategoryFormError('');
          }} />
          <div style={modalStyle}>
            <h2 style={{...headerStyle, fontSize: '1.5rem', marginBottom: '1rem'}}>
              Category Management
            </h2>
            
            {/* Category List */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Categories</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={showInactiveCategories}
                    onChange={(e) => setShowInactiveCategories(e.target.checked)}
                  />
                  Show Inactive Categories
                </label>
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {categories.map(category => (
                  <div key={category.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '0.5rem',
                    backgroundColor: '#F7FAFC',
                    borderRadius: '0.375rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>
                        {category.name}
                        {category.status === 'INACTIVE' && (
                          <span style={{ 
                            marginLeft: '0.5rem',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#FC8181',
                            color: 'white',
                            borderRadius: '0.25rem'
                          }}>
                            Inactive
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#718096' }}>{category.description}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        style={{...buttonStyle, backgroundColor: '#4299E1', padding: '0.25rem 0.5rem'}}
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryForm({
                            name: category.name,
                            description: category.description
                          });
                        }}
                      >
                        Edit
                      </button>
                      {category.status === 'INACTIVE' ? (
                        <button
                          style={{...buttonStyle, backgroundColor: '#48BB78', padding: '0.25rem 0.5rem'}}
                          onClick={() => handleRestoreCategory(category.id)}
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          style={{...buttonStyle, backgroundColor: '#F56565', padding: '0.25rem 0.5rem'}}
                          onClick={() => handleDeleteCategory(category.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Form */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button
                style={{...buttonStyle, backgroundColor: '#718096'}}
                onClick={() => {
                  setShowCategoryModal(false);
                  setCategoryFormError('');
                }}
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCategorySubmit} style={formStyle}>
              {categoryFormError && (
                <div style={{
                  gridColumn: '1 / -1',
                  padding: '0.75rem',
                  backgroundColor: '#FED7D7',
                  color: '#C53030',
                  borderRadius: '0.375rem',
                  marginBottom: '1rem'
                }}>
                  {categoryFormError}
                </div>
              )}
              <label style={labelStyle}>Name</label>
              <input
                style={inputStyle}
                type="text"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                required
              />
              <label style={labelStyle}>Description</label>
              <textarea
                style={{...inputStyle, minHeight: '100px'}}
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})}
                required
              />
              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <button style={buttonStyle} type="submit">
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Image Modal */}
      {showImageModal && selectedCoral && (
        <ImageModal
          images={[selectedCoral.imageUrl]}
          alt={selectedCoral.speciesName}
          onClose={() => {
            setShowImageModal(false);
            setSelectedCoral(null);
          }}
        />
      )}
    </div>
  );
};

export default Corals;
