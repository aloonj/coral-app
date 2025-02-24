

import React, { useState, useEffect } from 'react';
import { formatDate } from '../utils/dateUtils';
import { orderService } from '../services/api';
import StatusBadge from '../components/Orders/StatusBadge';
import PaymentBadge from '../components/Orders/PaymentBadge';
import OrderDetails from '../components/Orders/OrderDetails';
import styles from './Orders.module.css';

const Orders = () => {
  const [orders, setOrders] = useState({
    active: [],
    completed: [],
    cancelled: [],
    archived: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [collapsedSections, setCollapsedSections] = useState(new Set(['completed', 'cancelled', 'archived']));
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    fetchOrders();

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await orderService.getAllOrders();
      const allOrders = response.data;
      setOrders({
        active: allOrders.filter(order => !order.archived && order.status !== 'CANCELLED' && order.status !== 'COMPLETED'),
        completed: allOrders.filter(order => !order.archived && order.status === 'COMPLETED'),
        cancelled: allOrders.filter(order => !order.archived && order.status === 'CANCELLED'),
        archived: allOrders.filter(order => order.archived)
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to fetch orders: ' + (err.response?.data?.message || err.message));
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleArchive = async (orderId) => {
    if (window.confirm('Are you sure you want to archive this order?')) {
      try {
        // Find the order to archive
        const orderToArchive = orders.completed.find(o => o.id === orderId);
        if (!orderToArchive) return;

        // Optimistically update the local state
        setOrders(prevOrders => ({
          ...prevOrders,
          completed: prevOrders.completed.filter(o => o.id !== orderId),
          archived: [...prevOrders.archived, { ...orderToArchive, archived: true }]
        }));

        // Make the API call
        await orderService.updateOrder(orderId, { archived: true });
      } catch (err) {
        console.error('Error archiving order:', err);
        setError('Failed to archive order: ' + (err.response?.data?.message || err.message));
        // If there was an error, fetch all orders to ensure consistency
        fetchOrders();
      }
    }
  };

  const handleStatusUpdate = async (orderId, currentStatus, newStatus) => {
    const statusMessages = {
      CONFIRMED: 'Are you sure you want to confirm this order?',
      PROCESSING: 'Are you sure you want to mark this order as processing?',
      READY_FOR_PICKUP: 'Are you sure you want to mark this order as ready for pickup/delivery?',
      COMPLETED: 'Are you sure you want to mark this order as completed?',
      CANCELLED: 'Are you sure you want to cancel this order? This action cannot be undone.',
      PENDING: 'Are you sure you want to move this order back to pending?',
    };

    // If moving backwards, use a different message format
    if (getPreviousStatus(currentStatus) === newStatus) {
      statusMessages[newStatus] = `Are you sure you want to move this order back to ${newStatus.toLowerCase().replace(/_/g, ' ')}?`;
    }

    if (window.confirm(statusMessages[newStatus])) {
      try {
        // Optimistically update the local state
        setOrders(prevOrders => {
          const updatedOrder = { ...prevOrders.active.find(o => o.id === orderId), status: newStatus };
          
          // Helper function to filter out the order from a section
          const removeFromSection = (section) => section.filter(o => o.id !== orderId);
          
          // Helper function to determine which section the order belongs in
          const getUpdatedSections = () => {
            if (newStatus === 'COMPLETED') {
              return {
                active: removeFromSection(prevOrders.active),
                completed: [...prevOrders.completed, updatedOrder],
                cancelled: prevOrders.cancelled,
                archived: prevOrders.archived
              };
            } else if (newStatus === 'CANCELLED') {
              return {
                active: removeFromSection(prevOrders.active),
                completed: removeFromSection(prevOrders.completed),
                cancelled: [...prevOrders.cancelled, updatedOrder],
                archived: prevOrders.archived
              };
            } else {
              return {
                active: prevOrders.active.map(o => o.id === orderId ? updatedOrder : o),
                completed: prevOrders.completed,
                cancelled: prevOrders.cancelled,
                archived: prevOrders.archived
              };
            }
          };

          return getUpdatedSections();
        });

        // Make the API call
        await orderService.updateOrder(orderId, { status: newStatus });
      } catch (err) {
        console.error('Error updating order status:', err);
        setError('Failed to update order status: ' + (err.response?.data?.message || err.message));
        // If there was an error, fetch all orders to ensure consistency
        fetchOrders();
      }
    }
  };

  const handleMarkPaid = async (orderId, paid = true) => {
    const action = paid ? 'paid' : 'unpaid';
    if (window.confirm(`Are you sure you want to mark this order as ${action}?`)) {
      try {
        // Optimistically update the local state
        setOrders(prevOrders => {
          const updateOrderInSection = section =>
            section.map(order =>
              order.id === orderId ? { ...order, paid } : order
            );

          return {
            active: updateOrderInSection(prevOrders.active),
            completed: updateOrderInSection(prevOrders.completed),
            cancelled: updateOrderInSection(prevOrders.cancelled),
            archived: prevOrders.archived
          };
        });

        // Make the API call
        await orderService.updateOrder(orderId, { paid });
      } catch (err) {
        console.error(`Error marking order as ${action}:`, err);
        setError(`Failed to mark order as ${action}: ` + (err.response?.data?.message || err.message));
        // If there was an error, fetch all orders to ensure consistency
        fetchOrders();
      }
    }
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('Are you sure you want to delete order? This action cannot be undone.')) {
      try {
        await orderService.deleteOrder(orderId);
        fetchOrders();
      } catch (err) {
        console.error('Error deleting order:', err);
        setError('Failed to delete order: ' + (err.response?.data?.message || err.message));
      }
    }
  };

  const toggleOrderExpansion = (orderId) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const getFilteredArchivedOrders = () => {
    if (timeFilter === 'all') return orders.archived;
    
    const now = new Date();
    const filterDate = new Date();
    
    switch(timeFilter) {
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        filterDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return orders.archived;
    }
    
    return orders.archived.filter(order => 
      new Date(order.createdAt) >= filterDate
    );
  };

  const getPreviousStatus = (currentStatus) => {
    const statusFlow = {
      CONFIRMED: 'PENDING',
      PROCESSING: 'CONFIRMED',
      READY_FOR_PICKUP: 'PROCESSING',
      COMPLETED: 'READY_FOR_PICKUP',
      PENDING: null,
      CANCELLED: null
    };
    return statusFlow[currentStatus] || null;
  };

  const getNextStatuses = (currentStatus) => {
    const statusFlow = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['READY_FOR_PICKUP', 'CANCELLED'],
      READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: []
    };
    return statusFlow[currentStatus] || [];
  };

  if (loading) return <div className={styles.container} style={{textAlign: 'center', padding: '2rem'}}>Loading orders...</div>;
  if (error) return <div className={styles.container} style={{textAlign: 'center', padding: '2rem', color: '#E53E3E'}}>{error}</div>;

  const renderOrderCard = (order, showActions = true) => (
    <div key={order.id} className={styles.orderCard}>
      <div className={styles.orderHeader}>
        <div>
          <div className={styles.orderNumber}>Order #{order.id}</div>
          <div className={styles.orderDate}>{formatDate(order.createdAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <PaymentBadge paid={order.paid} />
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className={styles.orderInfo}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Client</span>
          <span className={styles.infoValue}>{order.client?.name || 'Unknown Client'}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Pickup Date</span>
          <span className={styles.infoValue}>{formatDate(order.preferredPickupDate)}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Items</span>
          <span className={styles.infoValue}>
            <button
              className={styles.expandButton}
              onClick={() => toggleOrderExpansion(order.id)}
            >
              {expandedOrders.has(order.id) ? '▼' : '▶'}
              {order.items?.reduce((total, item) => total + (item?.OrderItem?.quantity || 0), 0)} items
            </button>
          </span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Total Amount</span>
          <span className={styles.infoValue}>{import.meta.env.VITE_DEFAULT_CURRENCY}{parseFloat(order.totalAmount || 0).toFixed(2)}</span>
        </div>
      </div>

      {expandedOrders.has(order.id) && (
        <OrderDetails order={order} />
      )}

      {showActions && !order.archived && (
        <div className={styles.orderActions}>
          {getPreviousStatus(order.status) && (
            <button
              onClick={() => handleStatusUpdate(order.id, order.status, getPreviousStatus(order.status))}
              className={`${styles.actionButton} ${styles.previous}`}
            >
              ← Back to {getPreviousStatus(order.status).replace(/_/g, ' ').split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ')}
            </button>
          )}
          {getNextStatuses(order.status).map(nextStatus => (
            <button
              key={nextStatus}
              onClick={() => handleStatusUpdate(order.id, order.status, nextStatus)}
              className={`${styles.actionButton} ${styles[nextStatus.toLowerCase()]}`}
            >
              {nextStatus === 'CANCELLED' ? 'Cancel Order' : 
               'Mark as ' + (nextStatus === 'READY_FOR_PICKUP' ? 'Ready for Pickup/Delivery' :
                 nextStatus.replace(/_/g, ' ').split(' ').map(word => 
                   word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                 ).join(' ')) + ' →'}
            </button>
          ))}

          {order.status === 'CANCELLED' && (
            <button
              onClick={() => handleDelete(order.id)}
              className={`${styles.actionButton} ${styles.cancelled}`}
            >
              Delete
            </button>
          )}

          {order.status !== 'CANCELLED' && !order.archived && (
            order.paid ? (
              <button
                onClick={() => handleMarkPaid(order.id, false)}
                className={`${styles.actionButton} ${styles.unpaid}`}
              >
                Mark as Unpaid
              </button>
            ) : (
              <button
                onClick={() => handleMarkPaid(order.id, true)}
                className={`${styles.actionButton} ${styles.paid}`}
              >
                Mark as Paid
              </button>
            )
          )}

          {order.status === 'COMPLETED' && order.paid && (
            <button
              onClick={() => handleArchive(order.id)}
              className={`${styles.actionButton} ${styles.archive}`}
            >
              Move to Archived
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Order Management</h1>

      <div>
        <div className={styles.sectionHeader} onClick={() => toggleSection('active')}>
          <div>
            {collapsedSections.has('active') ? '▶' : '▼'} Active Orders ({orders.active.length})
          </div>
        </div>
        {!collapsedSections.has('active') && (
          <div className={styles.orderGrid}>
            {orders.active.map(order => renderOrderCard(order, true))}
          </div>
        )}

        <div className={styles.sectionHeader} onClick={() => toggleSection('completed')}>
          <div>
            {collapsedSections.has('completed') ? '▶' : '▼'} Completed Orders ({orders.completed.length})
          </div>
        </div>
        {!collapsedSections.has('completed') && (
          <div className={styles.orderGrid}>
            {orders.completed.map(order => renderOrderCard(order, true))}
          </div>
        )}

        <div className={styles.sectionHeader} onClick={() => toggleSection('cancelled')}>
          <div>
            {collapsedSections.has('cancelled') ? '▶' : '▼'} Cancelled Orders ({orders.cancelled.length})
          </div>
        </div>
        {!collapsedSections.has('cancelled') && (
          <div className={styles.orderGrid}>
            {orders.cancelled.map(order => renderOrderCard(order, true))}
          </div>
        )}

        <div className={styles.sectionHeader} onClick={() => toggleSection('archived')}>
          <div>
            {collapsedSections.has('archived') ? '▶' : '▼'} Archived Orders ({getFilteredArchivedOrders().length})
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Are you sure you want to purge all archived orders? This action cannot be undone.')) {
                  orderService.purgeArchivedOrders()
                    .then(() => {
                      setOrders(prev => ({
                        ...prev,
                        archived: []
                      }));
                    })
                    .catch(err => {
                      console.error('Error purging archived orders:', err);
                      setError('Failed to purge archived orders: ' + (err.response?.data?.message || err.message));
                    });
                }
              }}
              className={`${styles.actionButton} ${styles.cancelled}`}
            >
              Purge All
            </button>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className={styles.filterSelect}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
            </select>
          </div>
        </div>
        {!collapsedSections.has('archived') && (
          <div className={styles.orderGrid}>
            {getFilteredArchivedOrders().map(order => renderOrderCard(order, false))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
