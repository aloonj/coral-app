import React from 'react';
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const PaymentBadge = ({ paid }) => {
  const theme = useTheme();
  
  return (
    <Chip
      label={paid ? 'Paid' : 'Unpaid'}
      color={paid ? 'success' : 'error'}
      variant="outlined"
      size="small"
      sx={{
        fontWeight: 500,
        minWidth: 80
      }}
    />
  );
};

export default PaymentBadge;
