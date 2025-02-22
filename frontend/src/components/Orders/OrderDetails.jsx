import React from 'react';

const styles = {
  itemDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
    padding: '1rem 0',
  },
  itemCard: {
    padding: '1rem',
    backgroundColor: 'white',
    borderRadius: '0.375rem',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    border: '1px solid #E2E8F0'
  },
  itemTitle: {
    fontWeight: 'bold',
    color: '#2D3748',
    fontSize: '1rem',
    marginBottom: '0.5rem'
  },
  itemInfo: {
    color: '#4A5568',
    fontSize: '0.875rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  notes: {
    marginTop: '1rem',
    padding: '1rem',
    backgroundColor: '#EBF8FF',
    borderRadius: '0.375rem',
    border: '1px solid #BEE3F8',
    color: '#2C5282'
  }
};

const OrderDetails = ({ order }) => {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h3 style={{ 
        fontSize: '1.25rem', 
        fontWeight: 'bold', 
        marginBottom: '1.5rem',
        color: '#2D3748'
      }}>
        Order Details
      </h3>
      <div style={styles.itemDetails}>
        {order.items?.map((item) => (
          <div key={item.id} style={styles.itemCard}>
            <div style={styles.itemTitle}>
              {item?.speciesName || 'Unknown Species'}
            </div>
            <div style={styles.itemInfo}>
              <div>Quantity: {item?.OrderItem?.quantity || 0}</div>
              <div>Price per unit: {import.meta.env.VITE_DEFAULT_CURRENCY}{parseFloat(item?.OrderItem?.priceAtOrder || 0).toFixed(2)}</div>
              <div>Subtotal: {import.meta.env.VITE_DEFAULT_CURRENCY}{parseFloat(item?.OrderItem?.subtotal || 0).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
      {order.notes && (
        <div style={styles.notes}>
          <strong style={{ color: '#2C5282' }}>Notes:</strong> {order.notes}
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
