import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { BASE_URL, coralService, categoryService, clientService, orderService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { config } from '../config';
import ImageGallery from '../components/ImageGallery/ImageGallery';
import ImageModal from '../components/ImageGallery/ImageModal';
import styles from './QuickOrder.module.css';

const QuickOrder = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [corals, setCorals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());
  const [orderQuantities, setOrderQuantities] = useState({});
  const showAdditionalDetails = import.meta.env.VITE_SHOW_ADDITIONAL_CORAL_DETAILS === 'true';
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedCoral, setSelectedCoral] = useState(null);

  const loadingStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '50vh',
    fontSize: '1.25rem',
    color: '#4A5568',
  };

  useEffect(() => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const fetchData = async () => {
      try {
        const promises = [coralService.getAllCorals(), categoryService.getAllCategories()];
        
        // Only fetch clients if user is admin/superadmin
        if (isAdmin) {
          promises.push(clientService.getAllClients());
        }
        
        const responses = await Promise.all(promises);
        const coralData = responses[0].data;
        const categoryData = responses[1].data;
        
        setCorals(coralData);
        setCategories(categoryData);
        
        if (isAdmin && responses[2]) {
          setClients(responses[2].data);
        }
        
        // Initialize order quantities
        const initialQuantities = {};
        coralData.forEach(coral => {
          initialQuantities[coral.id] = 0;
        });
        setOrderQuantities(initialQuantities);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Error loading data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Early return for loading and error states
  if (!user) {
    return <div style={loadingStyle}>Redirecting to login...</div>;
  }

  if (loading) {
    return <div style={loadingStyle}>Loading...</div>;
  }

  if (error) {
    return <div style={{...loadingStyle, color: '#E53E3E'}}>{error}</div>;
  }

  const handleQuantityChange = (coralId, value) => {
    setOrderQuantities(prev => ({
      ...prev,
      [coralId]: Math.max(0, Math.min(value, corals.find(c => c.id === coralId)?.quantity || 0))
    }));
  };

  const clearOrder = () => {
    // Reset all quantities to 0
    const resetQuantities = {};
    corals.forEach(coral => {
      resetQuantities[coral.id] = 0;
    });
    setOrderQuantities(resetQuantities);
  };

  const handleBulkOrder = async () => {
    const orderItems = Object.entries(orderQuantities)
      .filter(([_, quantity]) => quantity > 0)
      .map(([coralId, quantity]) => ({
        coralId: parseInt(coralId),
        quantity
      }));

    if (orderItems.length === 0) {
      alert('Please add items to your order');
      return;
    }

    try {
      // Calculate total amount
      const totalAmount = corals.reduce((total, coral) => {
        return total + (coral.price * (orderQuantities[coral.id] || 0));
      }, 0);

      const orderData = {
        items: orderItems,
        totalAmount,
        ...(isAdmin && selectedClient && { clientId: parseInt(selectedClient, 10) })
      };

      const response = await orderService.createOrder(orderData);
      const newOrderId = response.data.id;
      
      // Navigate to dashboard with the new order ID
      navigate('/dashboard', { state: { newOrderId } });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to submit order. Please try again.';
      alert(errorMessage);
      console.error('Order submission error:', err);
    }
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

  // Group corals by category
  const groupedCorals = categories.reduce((acc, category) => {
    acc[category.id] = corals.filter(coral => coral.categoryId === category.id);
    return acc;
  }, {});

  // Styles
  const containerStyle = {
    padding: '1rem',
    maxWidth: '1400px',
    margin: '0 auto',
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
    backgroundColor: '#EBF8FF',
    color: '#2C5282',
    fontWeight: 'bold',
    fontSize: '1.2rem',
    textAlign: 'left',
  };

  const thumbnailStyle = {
    width: '120px',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '4px',
    cursor: 'pointer',
    margin: 0,
    display: 'block',
  };

  const quantityControlStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
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

  const disabledButtonStyle = {
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  const quantityButtonStyle = {
    ...buttonStyle,
    padding: '0.25rem 0.5rem',
    backgroundColor: '#4A5568',
  };

  const quantityInputStyle = {
    width: '60px',
    padding: '0.25rem',
    textAlign: 'center',
    border: '1px solid #CBD5E0',
    borderRadius: '0.25rem',
  };

  const headerStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    color: '#2D3748',
  };

  const getStockStatus = (coral) => {
    if (coral.quantity === 0) return 'OUT_OF_STOCK';
    if (coral.quantity <= coral.minimumStock) return 'LOW_STOCK';
    return 'AVAILABLE';
  };

  const stockLevelStyle = (status) => ({
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.875rem',
    fontWeight: 'bold',
    backgroundColor: status === 'AVAILABLE' ? '#C6F6D5' : 
                    status === 'LOW_STOCK' ? '#FEEBC8' : '#FED7D7',
    color: status === 'AVAILABLE' ? '#22543D' :
           status === 'LOW_STOCK' ? '#744210' : '#822727',
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Order Corals</h1>

      {isAdmin && (
        <div className={styles.clientSelector}>
          <label>
            Order on behalf of:
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              required
            >
              <option value="">Select a client...</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className={styles.coralGrid}>
        {categories.map(category => {
          const categoryCorals = groupedCorals[category.id] || [];
          
          if (categoryCorals.length === 0) return null;
          
          const categoryTotal = categoryCorals.reduce((total, coral) => 
            total + (orderQuantities[coral.id] || 0), 0);

          return [
            <div
              key={`category-${category.id}`}
              className={styles.categoryHeader}
              onClick={() => toggleCategory(category.id)}
            >
              <div>
                {collapsedCategories.has(category.id) ? '▶' : '▼'} {category.name}
              </div>
              <div>
                {categoryTotal > 0 && `${categoryTotal} ordered`}
              </div>
            </div>,
            ...(!collapsedCategories.has(category.id) ? categoryCorals.map(coral => (
              <div key={coral.id} className={styles.coralCard}>
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
                <div className={styles.cardContent}>
                  <div className={styles.cardMainContent}>
                    <div className={styles.coralName}>{coral.speciesName}</div>
                    <div className={styles.scientificName}>{coral.scientificName}</div>
                    <div className={styles.description}>{coral.description}</div>
                  </div>
                  <div className={styles.cardSideContent}>
                    <div className={`${styles.stockLevel} ${
                      getStockStatus(coral) === 'AVAILABLE' ? styles.available :
                      getStockStatus(coral) === 'LOW_STOCK' ? styles.lowStock :
                      styles.outOfStock
                    }`}>
                      {getStockStatus(coral) === 'OUT_OF_STOCK' ? 'Out of stock' :
                       getStockStatus(coral) === 'LOW_STOCK' ? `${coral.quantity} in stock (Low Stock)` :
                       `${coral.quantity} in stock`}
                    </div>
                    <div className={styles.price}>{config.defaultCurrency}{coral.price}</div>
                    <div className={styles.quantityControl}>
                      <button
                        className={styles.quantityButton}
                        onClick={() => handleQuantityChange(coral.id, orderQuantities[coral.id] - 1)}
                        disabled={getStockStatus(coral) === 'OUT_OF_STOCK' || orderQuantities[coral.id] === 0}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        className={styles.quantityInput}
                        value={orderQuantities[coral.id]}
                        onChange={(e) => handleQuantityChange(coral.id, parseInt(e.target.value) || 0)}
                        min="0"
                        max={coral.quantity}
                        disabled={getStockStatus(coral) === 'OUT_OF_STOCK'}
                      />
                      <button
                        className={styles.quantityButton}
                        onClick={() => handleQuantityChange(coral.id, orderQuantities[coral.id] + 1)}
                        disabled={getStockStatus(coral) === 'OUT_OF_STOCK' || orderQuantities[coral.id] >= coral.quantity}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )) : [])
          ];
        }).filter(Boolean).flat()}
      </div>

      {/* Order Summary */}
      {Object.values(orderQuantities).some(q => q > 0) && (
        <div className={styles.orderSummary}>
          <div className={styles.orderSummaryContent}>
            <div className={styles.orderTotal}>
              Total Items: {Object.values(orderQuantities).reduce((a, b) => a + b, 0)}
              <br />
              Total Price: {config.defaultCurrency}
              {corals.reduce((total, coral) => {
                return total + (coral.price * (orderQuantities[coral.id] || 0));
              }, 0).toFixed(2)}
            </div>
            <div className={styles.orderButtons}>
              <button
                className={styles.clearOrderButton}
                onClick={clearOrder}
              >
                Clear Order
              </button>
              <button
                className={styles.placeOrderButton}
                onClick={handleBulkOrder}
                disabled={isAdmin && !selectedClient}
                title={isAdmin && !selectedClient ? 'Please select a client before placing the order' : ''}
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
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

export default QuickOrder;
