import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/api';
import styles from './ClientOrders.module.css';

const statusColors = {
  PENDING: { bg: '#fff3cd', text: '#856404' },
  CONFIRMED: { bg: '#d1e7dd', text: '#0f5132' },
  COMPLETED: { bg: '#cfe2ff', text: '#084298' },
  CANCELLED: { bg: '#f8d7da', text: '#842029' }
};

const OrderTable = ({ orders, title }) => {
  if (orders.length === 0) return null;
  
  return (
    <div className={styles['order-section']}>
      <h2>{title}</h2>
      <div className={styles['orders-grid']}>
        {orders.map((order) => (
          <div key={order.id} className={styles['order-card']}>
            <div className={styles['order-header']}>
              <div className={styles['order-number']}>
                <strong>Order #{order.id}</strong>
              </div>
              <div className={styles['status-badge']} style={{
                backgroundColor: statusColors[order.status]?.bg,
                color: statusColors[order.status]?.text,
              }}>
                {order.status}
              </div>
            </div>
            <div className={styles['order-date']}>
              <strong>Date: </strong>
              {new Date(order.createdAt).toLocaleDateString()}
            </div>
            <div className={styles['order-items']}>
              <strong>Items:</strong>
              <ul>
                {order.items.map((coral, index) => (
                  <li key={index}>
                    {coral.speciesName} - Quantity: {coral.OrderItem.quantity}
                  </li>
                ))}
              </ul>
            </div>
            {order.notes && (
              <div className={styles['order-notes']}>
                <strong>Notes:</strong>
                <p>{order.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ClientOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { user } = useAuth();

  const filterOptions = ['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await orderService.getMyOrders();
        setOrders(response.data);
      } catch (err) {
        setError('Failed to fetch your orders. Please try again later.');
        console.error('Error fetching orders:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user.id]);

  const filteredOrders = orders.filter(order => 
    statusFilter === 'ALL' ? true : order.status === statusFilter
  );

  const completedOrders = filteredOrders.filter(order => order.status === 'COMPLETED');
  const activeOrders = filteredOrders.filter(order => order.status !== 'COMPLETED');

  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles['orders-container']}>
      <div className={styles['orders-header']}>
        <h1>Your Orders</h1>
        <div className={styles['filter-section']}>
          <label htmlFor="status-filter">Filter by status: </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles['status-select']}
          >
            {filterOptions.map(option => (
              <option key={option} value={option}>
                {option === 'ALL' ? 'All Orders' : option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {orders.length === 0 ? (
        <p className={styles['no-orders']}>You haven't placed any orders yet.</p>
      ) : (
        <>
          <OrderTable orders={activeOrders} title="Active Orders" />
          <OrderTable orders={completedOrders} title="Completed Orders" />
        </>
      )}

    </div>
  );
};

export default ClientOrders;
