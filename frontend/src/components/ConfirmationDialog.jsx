import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Button 
} from '@mui/material';

/**
 * A reusable confirmation dialog component that replaces window.confirm
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {string} props.title - The dialog title
 * @param {string} props.message - The dialog message
 * @param {Function} props.onConfirm - Function to call when the user confirms
 * @param {Function} props.onCancel - Function to call when the user cancels
 * @param {string} [props.confirmText="Confirm"] - Text for the confirm button
 * @param {string} [props.cancelText="Cancel"] - Text for the cancel button
 * @param {string} [props.confirmColor="primary"] - Color for the confirm button
 */
const ConfirmationDialog = ({ 
  open, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmColor = "primary"
}) => (
  <Dialog open={open} onClose={onCancel}>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions>
      <Button onClick={onCancel} color="inherit">{cancelText}</Button>
      <Button 
        onClick={onConfirm} 
        color={confirmColor} 
        variant="contained" 
        autoFocus
      >
        {confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmationDialog;
