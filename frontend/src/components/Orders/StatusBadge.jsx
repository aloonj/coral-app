import React from 'react';
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const formatStatus = (status) => {
  if (status === 'READY_FOR_PICKUP') {
    return 'Ready for Pickup/Delivery';
  }
  return status.replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const getStatusColor = (status) => {
  switch(status) {
    case 'PENDING': return 'warning';
    case 'CONFIRMED': return 'info';
    case 'PROCESSING': return 'primary';
    case 'READY_FOR_PICKUP': return 'success';
    case 'COMPLETED': return 'default';
    case 'CANCELLED': return 'error';
    default: return 'default';
  }
};

const StatusBadge = ({ status }) => {
  const theme = useTheme();
  
  return (
    <Chip
      label={formatStatus(status)}
      color={getStatusColor(status)}
      variant="outlined"
      size="small"
      sx={{
        fontWeight: 500,
        minWidth: 120
      }}
    />
  );
};

export default StatusBadge;
