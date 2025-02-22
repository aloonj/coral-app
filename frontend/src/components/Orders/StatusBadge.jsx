import React from 'react';

const getStatusColor = (status) => {
  const colors = {
    PENDING: { bg: '#FEFCE8', text: '#854D0E', border: '#FEF08A' },
    CONFIRMED: { bg: '#EBF8FF', text: '#2C5282', border: '#BEE3F8' },
    PROCESSING: { bg: '#F3E8FF', text: '#553C9A', border: '#E9D8FD' },
    READY_FOR_PICKUP: { bg: '#F0FDF4', text: '#276749', border: '#C6F6D5' },
    COMPLETED: { bg: '#F8FAFC', text: '#2D3748', border: '#E2E8F0' },
    CANCELLED: { bg: '#FEF2F2', text: '#991B1B', border: '#FEE2E2' }
  };
  return colors[status] || { bg: '#F8FAFC', text: '#2D3748', border: '#E2E8F0' };
};

const formatStatus = (status) => {
  return status.replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const StatusBadge = ({ status }) => {
  const { bg, text, border } = getStatusColor(status);
  
  return (
    <span style={{
      backgroundColor: bg,
      color: text,
      padding: '0.375rem 0.75rem',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      display: 'inline-block',
      minWidth: '120px',
      textAlign: 'center',
      border: `1px solid ${border}`,
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    }}>
      {formatStatus(status)}
    </span>
  );
};

export default StatusBadge;
