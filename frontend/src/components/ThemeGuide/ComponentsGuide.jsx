import { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid, 
  Divider, 
  Button,
  IconButton,
  TextField,
  Chip,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import InfoIcon from '@mui/icons-material/Info';
import StarIcon from '@mui/icons-material/Star';
import { 
  CoralCard, 
  ActionButton, 
  StatusBadge, 
  SectionHeader, 
  PageTitle, 
  CardContent as StyledCardContent, 
  FormField, 
  StatCard, 
  PriceTag, 
  StockLevel, 
  ModalContainer 
} from '../StyledComponents';

/**
 * ComponentsGuide Component
 * 
 * Showcases the styled components available in the theme,
 * including both MUI components and custom styled components.
 */
const ComponentsGuide = () => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [expanded, setExpanded] = useState('panel1');

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleAccordionChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  // Code example component
  const CodeExample = ({ code }) => (
    <Box 
      sx={{ 
        p: 1.5, 
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        borderRadius: 1,
        fontFamily: 'monospace',
        fontSize: '0.875rem',
        overflow: 'auto',
        mt: 1
      }}
    >
      {code}
    </Box>
  );

  // Component example with code
  const ComponentExample = ({ title, description, children, code }) => (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 3, 
        borderRadius: 1,
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      <Typography variant="h4" gutterBottom>{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>
      )}
      
      <Box 
        sx={{ 
          p: 2, 
          my: 2, 
          border: `1px dashed ${theme.palette.divider}`,
          borderRadius: 1,
          bgcolor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)'
        }}
      >
        {children}
      </Box>
      
      {code && <CodeExample code={code} />}
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h2" gutterBottom>Components</Typography>
      <Typography variant="body1" paragraph>
        The application uses Material UI components with custom styling defined in the theme.
        This guide showcases the available components and how to use them.
      </Typography>

      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="MUI Components" />
        <Tab label="Custom Styled Components" />
      </Tabs>

      {tabValue === 0 && (
        <Box>
          <Typography variant="h3" gutterBottom>MUI Components</Typography>
          <Typography variant="body1" paragraph>
            These are standard Material UI components with theme customizations applied.
          </Typography>

          <ComponentExample 
            title="Buttons" 
            description="Buttons with different variants and colors."
            code={`<Button variant="contained">Primary</Button>
<Button variant="contained" color="secondary">Secondary</Button>
<Button variant="outlined">Outlined</Button>
<Button variant="text">Text</Button>
<IconButton><AddIcon /></IconButton>`}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Button variant="contained">Primary</Button>
              <Button variant="contained" color="secondary">Secondary</Button>
              <Button variant="outlined">Outlined</Button>
              <Button variant="text">Text</Button>
              <IconButton aria-label="add">
                <AddIcon />
              </IconButton>
            </Box>
          </ComponentExample>

          <ComponentExample 
            title="Cards" 
            description="Cards for displaying content and actions."
            code={`<Card sx={{ maxWidth: 345 }}>
  <CardMedia
    component="img"
    height="140"
    image="https://via.placeholder.com/345x140"
    alt="Sample image"
  />
  <CardContent>
    <Typography gutterBottom variant="h5" component="div">
      Card Title
    </Typography>
    <Typography variant="body2" color="text.secondary">
      Card content description that can span multiple lines.
    </Typography>
  </CardContent>
  <CardActions>
    <Button size="small">Action 1</Button>
    <Button size="small">Action 2</Button>
  </CardActions>
</Card>`}
          >
            <Card sx={{ maxWidth: 345 }}>
              <CardMedia
                component="div"
                sx={{ 
                  height: 140, 
                  bgcolor: theme.palette.primary.light,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Typography variant="body2" color="white">
                  Sample Image Placeholder
                </Typography>
              </CardMedia>
              <CardContent>
                <Typography gutterBottom variant="h5" component="div">
                  Card Title
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Card content description that can span multiple lines.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small">Action 1</Button>
                <Button size="small">Action 2</Button>
              </CardActions>
            </Card>
          </ComponentExample>

          <ComponentExample 
            title="Text Fields" 
            description="Input fields for collecting user data."
            code={`<TextField label="Standard" />
<TextField label="Outlined" variant="outlined" />
<TextField label="Filled" variant="filled" />
<TextField label="With helper text" helperText="Helper text" />
<TextField label="With error" error helperText="Error message" />`}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 300 }}>
              <TextField label="Standard" />
              <TextField label="Outlined" variant="outlined" />
              <TextField label="Filled" variant="filled" />
              <TextField label="With helper text" helperText="Helper text" />
              <TextField label="With error" error helperText="Error message" />
            </Box>
          </ComponentExample>

          <ComponentExample 
            title="Chips" 
            description="Compact elements that represent an input, attribute, or action."
            code={`<Chip label="Basic" />
<Chip label="Clickable" onClick={() => {}} />
<Chip label="Deletable" onDelete={() => {}} />
<Chip label="Primary" color="primary" />
<Chip label="Secondary" color="secondary" />
<Chip label="Success" color="success" />
<Chip label="Error" color="error" />
<Chip label="Warning" color="warning" />
<Chip label="Info" color="info" />`}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <Chip label="Basic" />
              <Chip label="Clickable" onClick={() => {}} />
              <Chip label="Deletable" onDelete={() => {}} />
              <Chip label="Primary" color="primary" />
              <Chip label="Secondary" color="secondary" />
              <Chip label="Success" color="success" />
              <Chip label="Error" color="error" />
              <Chip label="Warning" color="warning" />
              <Chip label="Info" color="info" />
            </Box>
          </ComponentExample>

          <ComponentExample 
            title="Alerts" 
            description="Alerts display short, important messages."
            code={`<Alert severity="error">This is an error alert</Alert>
<Alert severity="warning">This is a warning alert</Alert>
<Alert severity="info">This is an info alert</Alert>
<Alert severity="success">This is a success alert</Alert>`}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="error">This is an error alert</Alert>
              <Alert severity="warning">This is a warning alert</Alert>
              <Alert severity="info">This is an info alert</Alert>
              <Alert severity="success">This is a success alert</Alert>
            </Box>
          </ComponentExample>

          <ComponentExample 
            title="Accordion" 
            description="Expandable panels for organizing content."
            code={`<Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography>Accordion 1</Typography>
  </AccordionSummary>
  <AccordionDetails>
    <Typography>
      Content for accordion panel 1.
    </Typography>
  </AccordionDetails>
</Accordion>`}
          >
            <Box sx={{ width: '100%' }}>
              <Accordion expanded={expanded === 'panel1'} onChange={handleAccordionChange('panel1')}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Accordion 1</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Content for accordion panel 1. You can put any content here, including other components.
                  </Typography>
                </AccordionDetails>
              </Accordion>
              <Accordion expanded={expanded === 'panel2'} onChange={handleAccordionChange('panel2')}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Accordion 2</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography>
                    Content for accordion panel 2. This panel is initially collapsed.
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Box>
          </ComponentExample>

          <ComponentExample 
            title="Lists" 
            description="Lists for displaying multiple items in a vertical arrangement."
            code={`<List>
  <ListItem>
    <ListItemIcon><StarIcon /></ListItemIcon>
    <ListItemText primary="List Item 1" secondary="Secondary text" />
  </ListItem>
  <ListItem>
    <ListItemIcon><InfoIcon /></ListItemIcon>
    <ListItemText primary="List Item 2" secondary="Secondary text" />
  </ListItem>
</List>`}
          >
            <List sx={{ width: '100%', maxWidth: 360, bgcolor: 'background.paper' }}>
              <ListItem>
                <ListItemIcon><StarIcon /></ListItemIcon>
                <ListItemText primary="List Item 1" secondary="Secondary text" />
              </ListItem>
              <ListItem>
                <ListItemIcon><InfoIcon /></ListItemIcon>
                <ListItemText primary="List Item 2" secondary="Secondary text" />
              </ListItem>
              <ListItem>
                <ListItemIcon><EditIcon /></ListItemIcon>
                <ListItemText primary="List Item 3" secondary="Secondary text" />
              </ListItem>
            </List>
          </ComponentExample>
        </Box>
      )}

      {tabValue === 1 && (
        <Box>
          <Typography variant="h3" gutterBottom>Custom Styled Components</Typography>
          <Typography variant="body1" paragraph>
            These are custom styled components defined in <code>StyledComponents.jsx</code> that provide consistent styling for common UI patterns.
          </Typography>

          <ComponentExample 
            title="CoralCard" 
            description="Card component for coral items with stock status styling."
            code={`import { CoralCard } from '../components/StyledComponents';

// Usage:
<CoralCard stockStatus="AVAILABLE">
  <CardContent>
    <Typography variant="h5">Coral Name</Typography>
    <Typography variant="body2">Coral description</Typography>
  </CardContent>
</CoralCard>`}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <CoralCard stockStatus="AVAILABLE">
                  <CardContent>
                    <Typography variant="h5">Available Coral</Typography>
                    <Typography variant="body2">This coral is in stock</Typography>
                  </CardContent>
                </CoralCard>
              </Grid>
              <Grid item xs={12} sm={4}>
                <CoralCard stockStatus="LOW_STOCK">
                  <CardContent>
                    <Typography variant="h5">Low Stock Coral</Typography>
                    <Typography variant="body2">This coral is running low</Typography>
                  </CardContent>
                </CoralCard>
              </Grid>
              <Grid item xs={12} sm={4}>
                <CoralCard stockStatus="OUT_OF_STOCK">
                  <CardContent>
                    <Typography variant="h5">Out of Stock</Typography>
                    <Typography variant="body2">This coral is unavailable</Typography>
                  </CardContent>
                </CoralCard>
              </Grid>
            </Grid>
          </ComponentExample>

          <ComponentExample 
            title="ActionButton" 
            description="Button with consistent styling for actions."
            code={`import { ActionButton } from '../components/StyledComponents';

// Usage:
<ActionButton>Default</ActionButton>
<ActionButton color="secondary">Secondary</ActionButton>
<ActionButton color="error">Delete</ActionButton>`}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <ActionButton>Default</ActionButton>
              <ActionButton color="secondary">Secondary</ActionButton>
              <ActionButton color="error">Delete</ActionButton>
              <ActionButton color="info" startIcon={<EditIcon />}>Edit</ActionButton>
              <ActionButton color="success" startIcon={<AddIcon />}>Add New</ActionButton>
            </Box>
          </ComponentExample>

          <ComponentExample 
            title="StatusBadge" 
            description="Badge for order status with appropriate colors."
            code={`import { StatusBadge } from '../components/StyledComponents';

// Usage:
<StatusBadge status="PENDING" label="Pending" />
<StatusBadge status="CONFIRMED" label="Confirmed" />
<StatusBadge status="PROCESSING" label="Processing" />
<StatusBadge status="READY_FOR_PICKUP" label="Ready for Pickup" />
<StatusBadge status="COMPLETED" label="Completed" />
<StatusBadge status="CANCELLED" label="Cancelled" />`}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              <StatusBadge status="PENDING" label="Pending" />
              <StatusBadge status="CONFIRMED" label="Confirmed" />
              <StatusBadge status="PROCESSING" label="Processing" />
              <StatusBadge status="READY_FOR_PICKUP" label="Ready for Pickup" />
              <StatusBadge status="COMPLETED" label="Completed" />
              <StatusBadge status="CANCELLED" label="Cancelled" />
            </Box>
          </ComponentExample>

          <ComponentExample 
            title="SectionHeader" 
            description="Header for category sections with consistent styling."
            code={`import { SectionHeader } from '../components/StyledComponents';

// Usage:
<SectionHeader>
  <Typography>Section Title</Typography>
  <Button size="small" variant="contained">Action</Button>
</SectionHeader>`}
          >
            <SectionHeader>
              <Typography>Section Title</Typography>
              <Button size="small" variant="contained">Action</Button>
            </SectionHeader>
          </ComponentExample>

          <ComponentExample 
            title="PageTitle" 
            description="Consistent page title styling."
            code={`import { PageTitle } from '../components/StyledComponents';

// Usage:
<PageTitle>Dashboard</PageTitle>`}
          >
            <PageTitle>Dashboard</PageTitle>
          </ComponentExample>

          <ComponentExample 
            title="StockLevel" 
            description="Stock level indicator with appropriate colors."
            code={`import { StockLevel } from '../components/StyledComponents';

// Usage:
<StockLevel status="AVAILABLE">In Stock</StockLevel>
<StockLevel status="LOW_STOCK">Low Stock</StockLevel>
<StockLevel status="OUT_OF_STOCK">Out of Stock</StockLevel>`}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <StockLevel status="AVAILABLE">In Stock</StockLevel>
              <StockLevel status="LOW_STOCK">Low Stock</StockLevel>
              <StockLevel status="OUT_OF_STOCK">Out of Stock</StockLevel>
            </Box>
          </ComponentExample>

          <ComponentExample 
            title="PriceTag" 
            description="Styled price display."
            code={`import { PriceTag } from '../components/StyledComponents';

// Usage:
<PriceTag>$49.99</PriceTag>`}
          >
            <PriceTag>$49.99</PriceTag>
          </ComponentExample>

          <ComponentExample 
            title="StatCard" 
            description="Card for dashboard statistics."
            code={`import { StatCard } from '../components/StyledComponents';

// Usage:
<StatCard active={true} color={theme.palette.primary.main}>
  <Typography variant="subtitle1">Active Orders</Typography>
  <Typography variant="h4">24</Typography>
</StatCard>`}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <StatCard active={true} color={theme.palette.primary.main}>
                  <Typography variant="subtitle1">Active Orders</Typography>
                  <Typography variant="h4">24</Typography>
                </StatCard>
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard color={theme.palette.warning.main}>
                  <Typography variant="subtitle1">Pending</Typography>
                  <Typography variant="h4">12</Typography>
                </StatCard>
              </Grid>
              <Grid item xs={12} sm={4}>
                <StatCard color={theme.palette.success.main}>
                  <Typography variant="subtitle1">Completed</Typography>
                  <Typography variant="h4">36</Typography>
                </StatCard>
              </Grid>
            </Grid>
          </ComponentExample>
        </Box>
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h3" gutterBottom>Dark Mode Adaptation</Typography>
        <Typography variant="body1" paragraph>
          All components automatically adapt to dark mode when the theme is toggled.
          Use the theme toggle in the header to see how components look in dark mode.
        </Typography>
        <Paper sx={{ p: 2, borderRadius: 1, bgcolor: 'background.paper' }}>
          <Typography variant="subtitle1" gutterBottom>Conditional styling based on theme mode:</Typography>
          <CodeExample code={`import { useTheme } from '@mui/material/styles';

const MyComponent = () => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        
        // Conditional styling based on theme mode
        ...(theme.palette.mode === 'dark' ? {
          borderColor: 'rgba(255, 255, 255, 0.1)',
        } : {
          borderColor: 'rgba(0, 0, 0, 0.1)',
        }),
      }}
    >
      Content
    </Box>
  );
};`} />
        </Paper>
      </Box>
    </Box>
  );
};

export default ComponentsGuide;
