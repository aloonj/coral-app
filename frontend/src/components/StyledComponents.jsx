import { styled } from '@mui/material/styles';
import { 
  Card, 
  Button, 
  Box, 
  Typography, 
  Chip,
  TextField,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';

// Card for coral items with stock status styling
export { Box };
export const CoralCard = styled(Card)(({ theme, stockStatus }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: 
    stockStatus === 'OUT_OF_STOCK' ? theme.palette.error.light :
    stockStatus === 'LOW_STOCK' ? theme.palette.warning.light : 
    theme.palette.background.paper,
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  }
}));

// Action button with consistent styling
export const ActionButton = styled(Button)(({ theme, color = 'primary' }) => ({
  borderRadius: theme.shape.borderRadius,
  textTransform: 'none',
  fontWeight: 500,
  boxShadow: theme.shadows[1],
  '&:hover': {
    boxShadow: theme.shadows[2],
  }
}));

// Status badge for orders
export const StatusBadge = styled(Chip)(({ theme, status }) => {
  const getStatusColor = () => {
    switch(status) {
      case 'PENDING': return {
        bg: theme.palette.warning.light,
        color: theme.palette.warning.dark
      };
      case 'CONFIRMED': return {
        bg: theme.palette.info.light,
        color: theme.palette.info.dark
      };
      case 'PROCESSING': return {
        bg: theme.palette.primary.light,
        color: theme.palette.primary.dark
      };
      case 'READY_FOR_PICKUP': return {
        bg: theme.palette.success.light,
        color: theme.palette.success.dark
      };
      case 'COMPLETED': return {
        bg: theme.palette.grey[200],
        color: theme.palette.grey[700]
      };
      case 'CANCELLED': return {
        bg: theme.palette.error.light,
        color: theme.palette.error.dark
      };
      default: return {
        bg: theme.palette.grey[200],
        color: theme.palette.text.primary
      };
    }
  };
  
  const { bg, color } = getStatusColor();
  
  return {
    backgroundColor: bg,
    color: color,
    fontWeight: 500,
    fontSize: '0.875rem',
  };
});

// Section header for category sections
export const SectionHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  background: 'linear-gradient(135deg, #2C5282 0%, #4299E1 100%)',
  color: 'white',
  fontWeight: 'bold',
  fontSize: '1.2rem',
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(2),
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  cursor: 'pointer',
  userSelect: 'none',
}));

// Page title with consistent styling
export const PageTitle = styled(Typography)(({ theme }) => ({
  fontSize: '2rem',
  fontWeight: 'bold',
  marginBottom: theme.spacing(3),
  color: theme.palette.text.primary,
}));

// Card content wrapper
export const CardContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  flexGrow: 1,
}));

// Form field with label
export const FormField = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
  },
}));

// Form container
export const FormContainer = styled(Box)(({ theme }) => ({
  maxWidth: '400px',
  width: '100%',
  margin: '0 auto',
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
}));

// Form error alert
export const FormError = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: '100%',
}));

// Submit button with loading state
export const SubmitButton = styled(Button)(({ theme, loading }) => ({
  width: '100%',
  padding: theme.spacing(1.2),
  position: 'relative',
  '& .MuiCircularProgress-root': {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: '-12px',
    marginLeft: '-12px',
  },
}));

// Loading spinner
export const LoadingSpinner = styled(CircularProgress)({
  color: 'inherit',
  size: 24,
});

// Dashboard stat card
export const StatCard = styled(Paper)(({ theme, active, color }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: active ? theme.palette.action.hover : theme.palette.background.paper,
  border: `1px solid ${color || theme.palette.divider}`,
  transition: 'transform 0.2s, box-shadow 0.2s',
  cursor: 'pointer',
  height: '100%',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[2],
  }
}));

// Price tag
export const PriceTag = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  color: theme.palette.primary.main,
  fontSize: '1.25rem',
}));

// Stock level indicator
export const StockLevel = styled(Box)(({ theme, status }) => {
  const getStatusColor = () => {
    switch(status) {
      case 'AVAILABLE': return {
        bg: theme.palette.success.light,
        color: theme.palette.success.dark
      };
      case 'LOW_STOCK': return {
        bg: theme.palette.warning.light,
        color: theme.palette.warning.dark
      };
      case 'OUT_OF_STOCK': return {
        bg: theme.palette.error.light,
        color: theme.palette.error.dark
      };
      default: return {
        bg: theme.palette.grey[200],
        color: theme.palette.text.primary
      };
    }
  };
  
  const { bg, color } = getStatusColor();
  
  return {
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: bg,
    color: color,
    fontWeight: 'bold',
    fontSize: '0.875rem',
    display: 'inline-block',
  };
});

// Modal container
export const ModalContainer = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '90%',
  maxWidth: 600,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[5],
  padding: theme.spacing(4),
  borderRadius: theme.shape.borderRadius,
  maxHeight: '90vh',
  overflow: 'auto',
}));
