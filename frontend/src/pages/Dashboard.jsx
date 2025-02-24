import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { orderService, coralService } from '../services/api';
import styles from './Dashboard.module.css';

// Helper functions for order status transitions
const getNextStatus = (currentStatus) => {
  const statusFlow = {
    PENDING: 'CONFIRMED',
    CONFIRMED: 'PROCESSING',
    PROCESSING: 'READY_FOR_PICKUP',
    READY_FOR_PICKUP: 'COMPLETED'
  };
  return statusFlow[currentStatus];
};

const getPreviousStatus = (currentStatus) => {
  const statusFlow = {
    CONFIRMED: 'PENDING',
    PROCESSING: 'CONFIRMED',
    READY_FOR_PICKUP: 'PROCESSING',
    COMPLETED: 'READY_FOR_PICKUP'
  };
  return statusFlow[currentStatus];
};

const OrderStats = ({ orders, isAdmin, onStatusSelect, selectedStatus }) => {
  const stats = {
    total: orders.filter(o => !o.archived && o.status !== 'CANCELLED' && o.status !== 'COMPLETED').length,
    pending: orders.filter(o => o.status === 'PENDING').length,
    confirmed: orders.filter(o => o.status === 'CONFIRMED').length,
    processing: orders.filter(o => o.status === 'PROCESSING').length,
    readyForPickup: orders.filter(o => o.status === 'READY_FOR_PICKUP').length
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  };

  const cardStyle = (color, textColor) => ({
    padding: '0.75rem',
    borderRadius: '0.375rem',
    backgroundColor: 'white',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    height: '100%',
    border: `1px solid ${color}`,
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    }
  });

  const titleStyle = (color) => ({
    fontSize: '1.125rem',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: color,
    display: 'flex',
    alignItems: 'center',
    wordBreak: 'break-word',
    hyphens: 'auto'
  });

  const numberStyle = {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    margin: 0,
    color: '#2D3748'
  };

  return (
    <div style={gridStyle}>
      <div 
        style={{
          ...cardStyle('#4A5568', '#2D3748'),
          backgroundColor: selectedStatus === 'ALL' ? '#EDF2F7' : 'white'
        }} 
        onClick={() => onStatusSelect('ALL')}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }}
      >
        <div style={titleStyle('#4A5568')}>
          Active Orders
        </div>
        <div style={numberStyle}>{stats.total}</div>
      </div>
      <div 
        style={{
          ...cardStyle('#F6AD55', '#C05621'),
          backgroundColor: selectedStatus === 'PENDING' ? '#EDF2F7' : 'white'
        }}
        onClick={() => onStatusSelect('PENDING')}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }}
      >
        <div style={titleStyle('#C05621')}>
          Pending
        </div>
        <div style={numberStyle}>{stats.pending}</div>
      </div>
      <div 
        style={{
          ...cardStyle('#ED8936', '#9C4221'),
          backgroundColor: selectedStatus === 'CONFIRMED' ? '#EDF2F7' : 'white'
        }}
        onClick={() => onStatusSelect('CONFIRMED')}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }}
      >
        <div style={titleStyle('#9C4221')}>
          Confirmed
        </div>
        <div style={numberStyle}>{stats.confirmed}</div>
      </div>
      <div 
        style={{
          ...cardStyle('#4299E1', '#2B6CB0'),
          backgroundColor: selectedStatus === 'PROCESSING' ? '#EDF2F7' : 'white'
        }}
        onClick={() => onStatusSelect('PROCESSING')}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }}
      >
        <div style={titleStyle('#2B6CB0')}>
          Processing
        </div>
        <div style={numberStyle}>{stats.processing}</div>
      </div>
      <div 
        style={{
          ...cardStyle('#38B2AC', '#285E61'),
          backgroundColor: selectedStatus === 'READY_FOR_PICKUP' ? '#EDF2F7' : 'white'
        }}
        onClick={() => onStatusSelect('READY_FOR_PICKUP')}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }}
      >
        <div style={titleStyle('#285E61')}>
          Ready for Pickup/Delivery
        </div>
        <div style={numberStyle}>{stats.readyForPickup}</div>
      </div>
    </div>
  );
};

const ActiveOrdersGrid = ({ orders, onStatusUpdate, selectedStatus, newOrderId }) => {
  const filteredOrders = orders.filter(order => {
    if (selectedStatus === 'ALL') {
      return !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(order.status);
    }
    return order.status === selectedStatus;
  });

  if (filteredOrders.length === 0) {
    return (
      <div style={{ 
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: 'white',
        borderRadius: '0.375rem',
        border: '1px solid #E2E8F0'
      }}>
        <p style={{ color: '#4A5568', margin: 0 }}>No active orders</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1rem',
      marginTop: '2rem'
    }}>
      {filteredOrders.map(order => (
        <div 
          key={order.id} 
          className={order.id === newOrderId ? styles.newOrderHighlight : ''}
          style={{
            backgroundColor: 'white',
            borderRadius: '0.375rem',
            border: '1px solid #E2E8F0',
            padding: '1rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h3 style={{ margin: 0, color: '#2D3748' }}>Order #{order.id}</h3>
            <span style={{
              backgroundColor: order.status === 'READY_FOR_PICKUP' ? '#dcfce7' :
                            order.status === 'PENDING' ? '#FEF3C7' :
                            order.status === 'CONFIRMED' ? '#DBEAFE' :
                            order.status === 'PROCESSING' ? '#E0E7FF' : '#F3F4F6',
              color: order.status === 'READY_FOR_PICKUP' ? '#166534' :
                     order.status === 'PENDING' ? '#92400E' :
                     order.status === 'CONFIRMED' ? '#1E40AF' :
                     order.status === 'PROCESSING' ? '#3730A3' : '#374151',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.875rem'
            }}>
              {order.status === 'READY_FOR_PICKUP' ? 'Ready for Pickup/Delivery' : order.status.replace('_', ' ')}
            </span>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0.25rem 0', color: '#4A5568' }}>
              <strong>Client:</strong> {order.client?.name || 'Unknown Client'}
            </p>
            <p style={{ margin: '0.25rem 0', color: '#4A5568' }}>
              <strong>Pickup Date:</strong> {order.preferredPickupDate ? 
                new Date(order.preferredPickupDate).toLocaleDateString() : 'Not specified'}
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong style={{ color: '#2D3748' }}>Items:</strong>
            <ul style={{ 
              margin: '0.5rem 0',
              paddingLeft: '1.5rem',
              color: '#4A5568'
            }}>
              {order.items?.map((item, index) => (
                <li key={index}>
                  {item.speciesName} x {item.OrderItem?.quantity || 0}
                </li>
              ))}
            </ul>
          </div>

          {(() => {
            const nextStatus = getNextStatus(order.status);
            const previousStatus = getPreviousStatus(order.status);

            const statusColors = {
              CONFIRMED: { bg: '#dbeafe', text: '#1e40af', border: '#1e40af' },
              PROCESSING: { bg: '#f3e8ff', text: '#6b21a8', border: '#6b21a8' },
              READY_FOR_PICKUP: { bg: '#dcfce7', text: '#166534', border: '#166534' },
              COMPLETED: { bg: '#f3f4f6', text: '#1f2937', border: '#1f2937' },
              PENDING: { bg: '#fee2e2', text: '#991b1b', border: '#991b1b' }
            };

            return (
              <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                {previousStatus && (
                  <button
                    onClick={() => onStatusUpdate(order.id, order.status, previousStatus)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      backgroundColor: statusColors[previousStatus].bg,
                      color: statusColors[previousStatus].text,
                      border: `1px solid ${statusColors[previousStatus].border}`,
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.opacity = '0.8';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    ← Back to {previousStatus.replace(/_/g, ' ').split(' ').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ')}
                  </button>
                )}
                {nextStatus && (
                  <button
                    onClick={() => onStatusUpdate(order.id, order.status, nextStatus)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      backgroundColor: statusColors[nextStatus].bg,
                      color: statusColors[nextStatus].text,
                      border: `1px solid ${statusColors[nextStatus].border}`,
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.opacity = '0.8';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Mark as {nextStatus === 'READY_FOR_PICKUP' ? 'Ready for Pickup/Delivery' :
                      nextStatus.replace(/_/g, ' ').split(' ').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      ).join(' ')} →
                  </button>
                )}
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [newOrderId, setNewOrderId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [corals, setCorals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  useEffect(() => {
    // Set newOrderId from navigation state if present
    if (location.state?.newOrderId) {
      setNewOrderId(location.state.newOrderId);
      // Clear the state after a delay
      setTimeout(() => {
        setNewOrderId(null);
      }, 3000);
    }
  }, [location]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, coralsRes] = await Promise.all([
          isAdmin ? orderService.getAllOrders(false) : orderService.getMyOrders(false),
          coralService.getAllCorals()
        ]);

        setOrders(ordersRes.data);
        setCorals(coralsRes.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const containerStyle = {
    padding: '1rem',
    maxWidth: '1400px',
    margin: '0 auto'
  };

  const headerStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1.5rem',
    color: '#2D3748'
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', color: '#4A5568' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>
        {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
      </h1>
      
      <OrderStats 
        orders={orders} 
        isAdmin={user.role === 'ADMIN'} 
        onStatusSelect={setSelectedStatus}
        selectedStatus={selectedStatus}
      />
      
      {isAdmin && (
        <>
          <h2 style={{ 
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginTop: '2rem',
            marginBottom: '1rem',
            color: '#2D3748'
          }}>
            Active Orders
          </h2>
          <ActiveOrdersGrid 
            orders={orders}
            selectedStatus={selectedStatus}
            newOrderId={newOrderId}
            onStatusUpdate={async (orderId, currentStatus, newStatus) => {
              const statusMessages = {
                CONFIRMED: 'Are you sure you want to confirm this order?',
                PROCESSING: 'Are you sure you want to mark this order as processing?',
                READY_FOR_PICKUP: 'Are you sure you want to mark this order as ready for pickup/delivery?',
                COMPLETED: 'Are you sure you want to mark this order as completed?',
                PENDING: 'Are you sure you want to move this order back to pending?'
              };

              // If moving backwards, use a different message format
              if (getPreviousStatus(currentStatus) === newStatus) {
                statusMessages[newStatus] = `Are you sure you want to move this order back to ${newStatus.toLowerCase().replace(/_/g, ' ')}?`;
              }

              if (window.confirm(statusMessages[newStatus])) {
                try {
                  // Optimistically update the local state
                  setOrders(prevOrders => 
                    prevOrders.map(order => 
                      order.id === orderId 
                        ? { ...order, status: newStatus }
                        : order
                    )
                  );

                  // Make the API call
                  await orderService.updateOrder(orderId, { status: newStatus });
                } catch (error) {
                  console.error('Error updating order status:', error);
                  // If there was an error, fetch all orders to ensure consistency
                  const updatedOrders = await orderService.getAllOrders(false);
                  setOrders(updatedOrders.data);
                }
              }
            }}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
