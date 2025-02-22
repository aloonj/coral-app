import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import StatusBadge from './StatusBadge';
import PaymentBadge from './PaymentBadge';
import OrderDetails from './OrderDetails';

const styles = {
  tableContainer: {
    width: '100%',
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    msOverflowStyle: '-ms-autohiding-scrollbar',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    backgroundColor: '#F7FAFC',
    borderBottom: '2px solid #E2E8F0',
    color: '#4A5568',
    fontWeight: 'bold',
  },
  td: {
    padding: '1rem',
    borderBottom: '1px solid #E2E8F0',
    verticalAlign: 'middle',
  },
  expandButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '4px',
    transition: 'background-color 0.2s',
    color: '#4A5568',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedRow: {
    backgroundColor: '#F7FAFC',
    borderBottom: '1px solid #E2E8F0',
  },
  actionButton: {
    border: '1px solid',
    borderRadius: '0.375rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'white'
  }
};

const getStatusButtonStyle = (status) => {
  const baseStyle = { ...styles.actionButton };
  
  const colors = {
    PENDING: {
      backgroundColor: '#FEFCE8',
      borderColor: '#CA8A04',
      color: '#854D0E',
      ':hover': {
        backgroundColor: '#FEF9C3'
      }
    },
    CONFIRMED: {
      backgroundColor: '#EBF8FF',
      borderColor: '#3182CE',
      color: '#2C5282',
      ':hover': {
        backgroundColor: '#BEE3F8'
      }
    },
    PROCESSING: {
      backgroundColor: '#E9D8FD',
      borderColor: '#805AD5',
      color: '#553C9A',
      ':hover': {
        backgroundColor: '#D6BCFA'
      }
    },
    READY_FOR_PICKUP: {
      backgroundColor: '#C6F6D5',
      borderColor: '#48BB78',
      color: '#276749',
      ':hover': {
        backgroundColor: '#9AE6B4'
      }
    },
    COMPLETED: {
      backgroundColor: '#E2E8F0',
      borderColor: '#4A5568',
      color: '#2D3748',
      ':hover': {
        backgroundColor: '#CBD5E0'
      }
    },
    CANCELLED: {
      backgroundColor: '#FED7D7',
      borderColor: '#E53E3E',
      color: '#C53030',
      ':hover': {
        backgroundColor: '#FEB2B2'
      }
    }
  };

  return { 
    ...baseStyle, 
    ...colors[status],
    ':hover': {
      opacity: '0.9',
      transform: 'translateY(-1px)'
    }
  };
};

const OrderTable = ({
  orders,
  expandedOrders,
  onToggleExpand,
  onStatusUpdate,
  onArchive,
  onDelete,
  onMarkPaid,
  showActions = true
}) => {
  const getNextStatuses = (currentStatus) => {
    const statusFlow = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['READY_FOR_PICKUP', 'CANCELLED'],
      READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [],
      CANCELLED: []
    };

    // Ensure we're returning valid next statuses
    const nextStatuses = statusFlow[currentStatus] || [];
    
    return nextStatuses;
  };

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{...styles.th, width: '100px'}}>Order #</th>
            <th style={{...styles.th, width: '180px'}}>Client</th>
            <th style={{...styles.th, width: '100px'}}>Date</th>
            <th style={{...styles.th, width: '120px'}}>Pickup Date</th>
            <th style={{...styles.th, width: '150px'}}>Items</th>
            <th style={{...styles.th, width: '100px'}}>Total</th>
            <th style={{...styles.th, width: '100px'}}>Payment</th>
            <th style={{...styles.th, width: '220px'}}>Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <React.Fragment key={order.id}>
              <tr>
                <td style={styles.td}>#{order.id}</td>
                <td style={styles.td}>{order.client?.name || 'Unknown Client'}</td>
                <td style={styles.td}>{formatDate(order.createdAt)}</td>
                <td style={styles.td}>{formatDate(order.preferredPickupDate)}</td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      style={styles.expandButton}
                      onClick={() => onToggleExpand(order.id)}
                    >
                      {expandedOrders.has(order.id) ? '▼' : '▶'}
                    </button>
                    {order.items?.reduce((total, item) => total + (item?.OrderItem?.quantity || 0), 0)} items
                  </div>
                </td>
                <td style={styles.td}>
                  {import.meta.env.VITE_DEFAULT_CURRENCY}{parseFloat(order.totalAmount || 0).toFixed(2)}
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <PaymentBadge paid={order.paid} />
                    {showActions && order.status !== 'CANCELLED' && onMarkPaid && !order.archived && (
                      order.paid ? (
                        <button
                          onClick={() => onMarkPaid(order.id, false)}
                          style={{
                            ...styles.actionButton,
                            backgroundColor: '#fef2f2',
                            borderColor: '#991b1b',
                            color: '#991b1b',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem'
                          }}
                        >
                          Mark as Unpaid
                        </button>
                      ) : (
                        <button
                          onClick={() => onMarkPaid(order.id, true)}
                          style={{
                            ...styles.actionButton,
                            backgroundColor: '#f0fdf4',
                            borderColor: '#166534',
                            color: '#166534',
                            fontSize: '0.75rem',
                            padding: '0.25rem 0.5rem'
                          }}
                        >
                          Mark as Paid
                        </button>
                      )
                    )}
                  </div>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <StatusBadge status={order.status} />
                    
                    {showActions && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {getNextStatuses(order.status).map(nextStatus => (
                          <button
                            key={nextStatus}
                            onClick={() => onStatusUpdate(order.id, order.status, nextStatus)}
                            style={getStatusButtonStyle(nextStatus)}
                            onMouseOver={(e) => {
                              e.currentTarget.style.opacity = '0.8';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                          >
                            {nextStatus === 'CANCELLED' ? 'Cancel Order' : 
                             'Mark as ' + nextStatus.replace(/_/g, ' ').split(' ').map(word => 
                               word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                             ).join(' ') + ' →'}
                          </button>
                        ))}

                        {order.status === 'CANCELLED' && onDelete && (
                          <button
                            onClick={() => onDelete(order.id)}
                            style={getStatusButtonStyle('CANCELLED')}
                            onMouseOver={(e) => {
                              e.currentTarget.style.opacity = '0.8';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            title="Delete Cancelled Order"
                          >
                            Delete
                          </button>
                        )}

                        {order.status === 'COMPLETED' && onArchive && (
                          <button
                            onClick={() => onArchive(order.id)}
                            style={{
                              ...getStatusButtonStyle('COMPLETED'),
                              backgroundColor: '#e0f2fe',
                              borderColor: '#0369a1',
                              color: '#0369a1',
                              width: 'fit-content',
                              minWidth: '120px'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.opacity = '0.8';
                              e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            title="Move Completed Order to Archived"
                          >
                            Move to Archived
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
              {expandedOrders.has(order.id) && (
                <tr>
                  <td colSpan="7" style={styles.expandedRow}>
                    <OrderDetails order={order} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderTable;
