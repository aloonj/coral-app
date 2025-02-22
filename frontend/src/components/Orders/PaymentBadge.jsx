import React from 'react';

const PaymentBadge = ({ paid }) => {
  const style = paid ? {
    backgroundColor: '#F0FDF4',
    color: '#276749',
    border: '1px solid #C6F6D5'
  } : {
    backgroundColor: '#FEF2F2',
    color: '#991B1B',
    border: '1px solid #FEE2E2'
  };
  
  return (
    <span style={{
      ...style,
      padding: '0.375rem 0.75rem',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      display: 'inline-block',
      minWidth: '80px',
      textAlign: 'center',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    }}>
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  );
};

export default PaymentBadge;
