import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Alert,
  Divider
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const OrderDetails = ({ order }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ py: 2 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        Order Details
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {order.items?.map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.id}>
            <Paper 
              sx={{ 
                p: 2, 
                height: '100%',
                borderRadius: 1,
                boxShadow: 1,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                {item?.speciesName || 'Unknown Species'}
              </Typography>
              <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                <Box sx={{ mb: 0.5 }}>
                  Quantity: {item?.OrderItem?.quantity || 0}
                </Box>
                <Box sx={{ mb: 0.5 }}>
                  Price per unit: {import.meta.env.VITE_DEFAULT_CURRENCY}{parseFloat(item?.OrderItem?.priceAtOrder || 0).toFixed(2)}
                  {((order.client?.discountRate > 0) || (order.archivedClientData?.discountRate > 0)) && (
                    <Typography component="span" sx={{ ml: 1, fontSize: '0.75rem', color: theme.palette.secondary.main }}>
                      (Discounted)
                    </Typography>
                  )}
                </Box>
                <Box sx={{ fontWeight: 'medium' }}>
                  Subtotal: {import.meta.env.VITE_DEFAULT_CURRENCY}{parseFloat(item?.OrderItem?.subtotal || 0).toFixed(2)}
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      {order.notes && (
        <Alert 
          severity="info" 
          sx={{ 
            mt: 2,
            '& .MuiAlert-message': {
              width: '100%'
            }
          }}
        >
          <Typography variant="subtitle2" component="div" sx={{ mb: 0.5 }}>
            Notes:
          </Typography>
          <Typography variant="body2">
            {order.notes}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default OrderDetails;
