# Material UI Styling System Implementation

This document provides guidance on how to use the Material UI styling system implemented in this application.

## Overview

We've implemented a comprehensive Material UI styling system to ensure consistent design across the application. This includes:

1. A centralized theme configuration
2. Reusable styled components
3. Guidelines for using MUI components and styling
4. Dark mode support with theme toggling

## Theme Configuration

The theme is defined in `src/theme/index.js` and includes:

- Color palette based on the application's existing colors
- Typography settings
- Component default styles
- Spacing and shape configurations

The theme is applied at the application root in `src/main.jsx` using the `ThemeProvider` component.

## Using the Theme

### 1. MUI Components

Use Material UI components instead of HTML elements whenever possible:

```jsx
// Instead of:
<div style={containerStyle}>
  <h1 style={headerStyle}>Dashboard</h1>
</div>

// Use:
<Container maxWidth="lg" sx={{ py: 3 }}>
  <Typography variant="h1">Dashboard</Typography>
</Container>
```

### 2. The `sx` Prop

Use the `sx` prop for custom styling that leverages the theme:

```jsx
<Box 
  sx={{ 
    p: 2, // Uses theme.spacing(2)
    bgcolor: 'background.paper', // Uses theme.palette.background.paper
    borderRadius: 1, // Uses theme.shape.borderRadius * 1
    boxShadow: 1, // Uses theme.shadows[1]
    color: 'text.primary' // Uses theme.palette.text.primary
  }}
>
  Content
</Box>
```

### 3. Responsive Design

Use the MUI Grid system for responsive layouts:

```jsx
<Grid container spacing={2}>
  <Grid item xs={12} sm={6} md={4} lg={3}>
    {/* Content that's full width on mobile, half on tablet, etc. */}
  </Grid>
</Grid>
```

### 4. Custom Styled Components

We've created reusable styled components in `src/components/StyledComponents.jsx`:

```jsx
import { PageTitle, ActionButton, StatusBadge } from '../components/StyledComponents';

// Usage:
<PageTitle>Dashboard</PageTitle>

<ActionButton color="primary">Save</ActionButton>

<StatusBadge status="PENDING">Pending</StatusBadge>
```

## Available Styled Components

- `CoralCard`: Card component for coral items with stock status styling
- `ActionButton`: Button with consistent styling
- `StatusBadge`: Badge for order status
- `SectionHeader`: Header for category sections
- `PageTitle`: Consistent page title styling
- `CardContent`: Wrapper for card content
- `FormField`: Form field with consistent styling
- `StatCard`: Card for dashboard statistics
- `PriceTag`: Styled price display
- `StockLevel`: Stock level indicator
- `ModalContainer`: Container for modal content

## Theme Values

### Colors

Access theme colors using the palette:

```jsx
// Primary colors
theme.palette.primary.main
theme.palette.primary.light
theme.palette.primary.dark

// Secondary colors
theme.palette.secondary.main

// Status colors
theme.palette.error.main
theme.palette.warning.main
theme.palette.info.main
theme.palette.success.main

// Text colors
theme.palette.text.primary
theme.palette.text.secondary
```

### Spacing

Use the theme spacing function:

```jsx
// In sx prop
sx={{ 
  mt: 2, // margin-top: theme.spacing(2)
  p: 3, // padding: theme.spacing(3)
  gap: 1 // gap: theme.spacing(1)
}}
```

### Typography

Use typography variants:

```jsx
<Typography variant="h1">Page Title</Typography>
<Typography variant="h2">Section Title</Typography>
<Typography variant="body1">Regular text</Typography>
<Typography variant="body2">Smaller text</Typography>
<Typography variant="subtitle1">Subtitle</Typography>
```

## Example: Refactored Component

See `src/pages/DashboardRefactored.jsx` for an example of a component that has been refactored to use the Material UI styling system.

## Best Practices

1. **Consistency**: Use the theme values for colors, spacing, and typography
2. **Component-Based**: Use MUI components instead of HTML elements
3. **Responsive Design**: Use the Grid system for layouts
4. **Theme Access**: Use the `useTheme` hook to access theme values in components
5. **Custom Components**: Create reusable styled components for repeated UI patterns
6. **Avoid Inline Styles**: Use the `sx` prop instead of inline styles
7. **Responsive Typography**: Use the typography variants for consistent text sizing

## Dark Mode Support

We've implemented a theme toggling system that allows users to switch between light and dark modes.

### How It Works

1. The `ThemeContext.jsx` file provides a context and provider for theme mode management
2. The current mode is stored in localStorage for persistence across sessions
3. The `ThemeToggle` component provides a UI for users to switch between modes

### Using Dark Mode in Your Components

#### 1. Access the Current Theme Mode

```jsx
import { useColorMode } from '../theme/ThemeContext';

const MyComponent = () => {
  const { mode, toggleColorMode } = useColorMode();
  
  return (
    <div>
      Current mode: {mode}
      <button onClick={toggleColorMode}>Toggle Theme</button>
    </div>
  );
};
```

#### 2. Add the Theme Toggle Button

```jsx
import ThemeToggle from '../components/ThemeToggle';

// In your component:
<ThemeToggle />
```

#### 3. Conditional Styling Based on Theme Mode

```jsx
import { useTheme } from '@mui/material';

const MyComponent = () => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        // This will automatically adapt to the current theme mode
        bgcolor: 'background.paper',
        color: 'text.primary',
        
        // You can also check the mode explicitly
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
};
```

### Best Practices for Dark Mode

1. **Use Theme Colors**: Always use theme palette colors instead of hardcoded values
2. **Test Both Modes**: Ensure your UI looks good in both light and dark modes
3. **Contrast**: Maintain sufficient contrast for accessibility in both modes
4. **Images**: Consider providing alternative images for dark mode if needed
5. **Shadows**: Adjust shadow intensity based on the theme mode

## Migration Strategy

When refactoring existing components:

1. Replace HTML elements with MUI components
2. Replace inline styles with the `sx` prop
3. Use theme values for colors, spacing, etc.
4. Use custom styled components where appropriate
5. Implement responsive design using the Grid system
6. Ensure components work well in both light and dark modes
