import { Box } from '@mui/material';

/**
 * A consistent layout for action buttons
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - The buttons to display
 * @param {Object} [props.sx] - Additional MUI sx styles to apply
 * @param {string} [props.justifyContent="flex-start"] - How to justify the buttons
 * @param {number} [props.gap=1] - Gap between buttons
 */
const ActionButtonGroup = ({ 
  children, 
  sx = {}, 
  justifyContent = 'flex-start',
  gap = 1
}) => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap, 
      mt: 2,
      justifyContent,
      ...sx 
    }}
  >
    {children}
  </Box>
);

export default ActionButtonGroup;
