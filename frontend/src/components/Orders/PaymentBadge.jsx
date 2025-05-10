import React from 'react';
import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const PaymentBadge = ({ invoiceStatus }) => {
  const theme = useTheme();

  return (
    <Chip
      label={invoiceStatus === 'INVOICED' ? 'Invoiced' : 'Not Invoiced'}
      color={invoiceStatus === 'INVOICED' ? 'success' : 'error'}
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
