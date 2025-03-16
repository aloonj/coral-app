import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { config } from '../../config';
import { 
  AppBar,
  Toolbar,
  Box,
  Container,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  useMediaQuery,
  useTheme,
  Badge,
  Tooltip,
  Snackbar,
  Alert
} from '@mui/material';
import { clientService } from '../../services/api';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ShoppingCart as ShoppingCartIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  ExpandLess,
  ExpandMore,
  Image as ImageIcon,
  Notifications as NotificationsIcon,
  Backup as BackupIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import ThemeToggle from '../ThemeToggle';
import CartDropdown from '../Cart/CartDropdown';
import fraggleRockLogo from '../../assets/images/fr-logo.svg';

/**
 * Enhanced Layout component with theme toggle functionality.
 * This is an example of how to integrate the ThemeToggle component
 * into the existing Layout.
 */
const LayoutWithThemeToggle = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [pendingRegistrations, setPendingRegistrations] = useState(0);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  // Auto-expand admin menu for desktop users with admin permissions
  useEffect(() => {
    if (!isMobile && isAdmin) {
      setAdminMenuOpen(true);
    }
  }, [isMobile, isAdmin]);

  // Create a reusable function for fetching pending counts
  const fetchPendingCounts = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      const [approvalsRes, registrationsRes] = await Promise.all([
        clientService.getPendingApprovalsCount(),
        clientService.getPendingRegistrationsCount()
      ]);
      
      const newApprovalsCount = approvalsRes.data.count;
      const newRegistrationsCount = registrationsRes.data.count;
      
      // Show toast notification if there are new pending approvals
      if (pendingApprovals > 0 && newApprovalsCount > pendingApprovals) {
        setToast({
          open: true,
          message: 'New client registration pending approval',
          severity: 'info'
        });
      }
      
      setPendingApprovals(newApprovalsCount);
      setPendingRegistrations(newRegistrationsCount);
    } catch (error) {
      console.error('Error fetching pending counts:', error);
    }
  }, [isAdmin, pendingApprovals]);

  // Fetch pending approvals count on component mount and when admin status changes
  useEffect(() => {
    if (isAdmin) {
      fetchPendingCounts();
      
      // Poll for updates every 5 minutes
      const interval = setInterval(fetchPendingCounts, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, fetchPendingCounts]);
  
  // Listen for client approval changes
  useEffect(() => {
    const handleClientApprovalChange = () => {
      fetchPendingCounts();
    };
    
    window.addEventListener('client-approval-changed', handleClientApprovalChange);
    
    return () => {
      window.removeEventListener('client-approval-changed', handleClientApprovalChange);
    };
  }, [fetchPendingCounts]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAdminMenuToggle = () => {
    setAdminMenuOpen(!adminMenuOpen);
  };

  // Close drawer when navigating
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  // Create separate drawer content for mobile and desktop to ensure proper rendering
  const drawerContent = (
    <Box sx={{ 
      width: 220, 
      overflowX: 'hidden',
      marginTop: 0
    }}>
      {user ? (
        <List sx={{ 
          padding: '16px 0'
        }}>
          {/* Dashboard menu item */}
          <ListItem 
            button 
            onClick={() => handleNavigation('/dashboard')}
            data-testid="dashboard-menu-item"
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItem>
          
          <ListItem button onClick={() => handleNavigation('/quickorder')}>
            <ListItemIcon>
              <ShoppingCartIcon />
            </ListItemIcon>
            <ListItemText primary="Order Corals" />
          </ListItem>
          
          {user?.role === 'CLIENT' && (
            <ListItem button onClick={() => handleNavigation('/client-orders')}>
              <ListItemIcon>
                <ReceiptIcon />
              </ListItemIcon>
              <ListItemText primary="Your Orders" />
            </ListItem>
          )}
          
          {/* Profile moved to top bar */}
          
          {isAdmin && (
            <>
              <ListItem button onClick={handleAdminMenuToggle}>
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Admin" />
                {adminMenuOpen ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              
              <Collapse in={adminMenuOpen} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  <ListItem 
                    button 
                    sx={{ pl: 4 }}
                    onClick={() => handleNavigation('/corals')}
                  >
                    <ListItemIcon>
                      <InventoryIcon />
                    </ListItemIcon>
                    <ListItemText primary="Stock" />
                  </ListItem>
                  
                  <ListItem 
                    button 
                    sx={{ pl: 4 }}
                    onClick={() => handleNavigation('/orders')}
                  >
                    <ListItemIcon>
                      <ReceiptIcon />
                    </ListItemIcon>
                    <ListItemText primary="Orders" />
                  </ListItem>
                  
                  <ListItem 
                    button 
                    sx={{ pl: 4 }}
                    onClick={() => handleNavigation('/clients')}
                  >
                    <ListItemIcon>
                      <Badge 
                        badgeContent={pendingApprovals} 
                        color="error"
                        invisible={pendingApprovals === 0}
                      >
                        <PeopleIcon />
                      </Badge>
                    </ListItemIcon>
                    <ListItemText primary="Clients" />
                  </ListItem>
                  
                  <ListItem 
                    button 
                    sx={{ pl: 4 }}
                    onClick={() => handleNavigation('/admin-users')}
                  >
                    <ListItemIcon>
                      <PersonIcon />
                    </ListItemIcon>
                    <ListItemText primary="Admin Users" />
                  </ListItem>
                  
                  <ListItem 
                    button 
                    sx={{ pl: 4 }}
                    onClick={() => handleNavigation('/image-management')}
                  >
                    <ListItemIcon>
                      <ImageIcon />
                    </ListItemIcon>
                    <ListItemText primary="Images" />
                  </ListItem>
                  
                  <ListItem 
                    button 
                    sx={{ pl: 4 }}
                    onClick={() => handleNavigation('/notifications')}
                  >
                    <ListItemIcon>
                      <NotificationsIcon />
                    </ListItemIcon>
                    <ListItemText primary="Notifications" />
                  </ListItem>
                  
                  <ListItem 
                    button 
                    sx={{ pl: 4 }}
                    onClick={() => handleNavigation('/backups')}
                  >
                    <ListItemIcon>
                      <BackupIcon />
                    </ListItemIcon>
                    <ListItemText primary="Backups" />
                  </ListItem>
                </List>
              </Collapse>
            </>
          )}
        </List>
      ) : (
        <List>
          <ListItem button onClick={() => handleNavigation('/login')}>
            <ListItemIcon>
              <PersonIcon />
            </ListItemIcon>
            <ListItemText primary="Login" />
          </ListItem>
        </List>
      )}
      
      {/* Removed logout from left menu */}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {user && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Box 
            component={Link} 
            to="/" 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              textDecoration: 'none',
              color: 'inherit'
            }}
          >
            <img 
              src={fraggleRockLogo} 
              alt="FraggleRock Logo" 
              style={{
                height: '50px',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))',
                transition: 'transform 0.3s ease',
              }}
            />
            {import.meta.env.DEV && (
              <Typography 
                variant="caption" 
                sx={{ 
                  ml: 1, 
                  backgroundColor: 'error.main', 
                  color: 'error.contrastText',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 'bold'
                }}
              >
                *test version*
              </Typography>
            )}
          </Box>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {/* Admin Pending Approvals Badge - visible on all devices for admins */}
          {isAdmin && pendingApprovals > 0 && (
            <Tooltip title={`${pendingApprovals} client${pendingApprovals !== 1 ? 's' : ''} pending approval`}>
              <IconButton
                color="inherit"
                onClick={() => handleNavigation('/clients?tab=pending')}
                aria-label="pending approvals"
                sx={{ mr: 1 }}
              >
                <Badge 
                  badgeContent={pendingApprovals} 
                  color="error"
                >
                  <PeopleIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          
          {/* Cart Dropdown */}
          {user && (
            <CartDropdown />
          )}
          
          {/* Theme Toggle Button */}
          <ThemeToggle />
          
          {!user ? (
            <Button 
              color="inherit" 
              component={Link} 
              to="/login"
              sx={{ ml: 2 }}
            >
              Login
            </Button>
          ) : (
            <>
              {/* Desktop view - show profile and logout icons */}
              <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                <IconButton
                  color="inherit"
                  component={Link}
                  to="/profile"
                  aria-label="profile"
                  title="Profile"
                  sx={{ mx: 1 }}
                >
                  <PersonIcon />
                </IconButton>
                
                <IconButton
                  color="inherit"
                  onClick={handleLogout}
                  aria-label="logout"
                  title="Logout"
                  sx={{ mx: 1 }}
                >
                  <LogoutIcon />
                </IconButton>
              </Box>
              
              {/* Mobile view - show profile and logout icons */}
              <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                <IconButton
                  color="inherit"
                  component={Link}
                  to="/profile"
                  aria-label="profile"
                  title="Profile"
                  sx={{ mr: 1 }}
                >
                  <PersonIcon />
                </IconButton>
                
                <IconButton
                  color="inherit"
                  onClick={handleLogout}
                  aria-label="logout"
                  title="Logout"
                >
                  <LogoutIcon />
                </IconButton>
              </Box>
            </>
          )}
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: 220 }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer - only show when user is logged in */}
        {user && (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile
            }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': { 
                width: 220, 
                overflowX: 'hidden',
                paddingTop: '80px', /* Ensure content starts below the app bar */
                '& .MuiList-root': {
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  padding: '1rem 0'
                },
                // Improve dark mode visibility
                ...(theme.palette.mode === 'dark' && {
                  backgroundColor: '#222222', // Slightly lighter than default dark background
                  '& .MuiListItemIcon-root': {
                    color: 'rgba(255,255,255,0.9)' // Brighter icons
                  },
                  '& .MuiListItemText-primary': {
                    color: '#FFFFFF', // Brighter text
                    fontWeight: 500
                  }
                })
              },
            }}
          >
            {drawerContent}
          </Drawer>
        )}
        
        {/* Desktop drawer - only show when user is logged in */}
        {user && (
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', md: 'block' },
              '& .MuiDrawer-paper': { 
                width: 220,
                boxSizing: 'border-box',
                position: 'fixed',
                height: 'calc(100vh - 64px)',
                top: '64px', // Ensure it's below the AppBar
                overflowX: 'hidden',
                borderRight: theme.palette.mode === 'dark' 
                  ? '1px solid rgba(255,255,255,0.08)' 
                  : '1px solid rgba(0,0,0,0.12)', // Better border in dark mode
                // Improve dark mode visibility
                ...(theme.palette.mode === 'dark' && {
                  backgroundColor: '#222222', // Slightly lighter than default dark background
                  '& .MuiListItemIcon-root': {
                    color: 'rgba(255,255,255,0.9)' // Brighter icons
                  },
                  '& .MuiListItemText-primary': {
                    color: '#FFFFFF', // Brighter text
                    fontWeight: 500
                  }
                })
              },
            }}
            open
          >
            {drawerContent}
          </Drawer>
        )}
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%', // Full width by default
          mt: '64px', // Toolbar height
          bgcolor: 'background.default',
          transition: 'margin-left 0.3s ease', // Smooth transition for margin changes
    // Only apply width adjustment when drawer is visible on desktop
    ...(user && {
      width: { xs: '100%', md: 'calc(100% - 220px)' }, // Full width on mobile, adjusted on desktop
    }),
          // Improve dark mode content readability
          ...(theme.palette.mode === 'dark' && {
            '& .MuiTypography-h1, & .MuiTypography-h2, & .MuiTypography-h3, & .MuiTypography-h4, & .MuiTypography-h5, & .MuiTypography-h6': {
              color: '#FFFFFF',
              textShadow: '0px 0px 1px rgba(255,255,255,0.1)'
            },
            '& .MuiCard-root': {
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,255,255,0.05)'
            },
            '& .MuiPaper-root': {
              backgroundImage: 'none'
            }
          })
        }}
      >
        <Container 
          maxWidth="xl" 
          disableGutters 
          sx={{ 
            py: 2,
            mx: 'auto', // Ensure container is centered
          }}
        >
          {children}
        </Container>
      </Box>
      
      {/* Toast Notification */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setToast({ ...toast, open: false })} 
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LayoutWithThemeToggle;
