import { Alert } from '@mui/material';

/**
 * A reusable component for displaying success or error messages
 * 
 * @param {Object} props
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.success] - Success message to display
 * @param {Object} [props.sx] - Additional MUI sx styles to apply
 */
const StatusMessage = ({ error, success, sx = {} }) => {
  if (error) {
    return <Alert severity="error" sx={{ mb: 2, ...sx }}>{error}</Alert>;
  }
  
  if (success) {
    return <Alert severity="success" sx={{ mb: 2, ...sx }}>{success}</Alert>;
  }
  
  return null;
};

export default StatusMessage;
