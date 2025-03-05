import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';
import { Container, Box, Paper, useTheme } from '@mui/material';
import { PageTitle } from '../components/StyledComponents';
import { useColorMode } from '../theme/ThemeContext';

const Register = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const { mode } = useColorMode();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          py: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          minHeight: 'calc(100vh - 64px)', // Account for potential header
          justifyContent: 'center',
        }}
      >
        <Paper
          elevation={6}
          sx={{
            width: '100%',
            p: 4,
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.background.paper,
            transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
            '&:hover': {
              transform: 'translateY(-5px)',
              boxShadow: theme.shadows[10],
            },
            ...(mode === 'dark' && {
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }),
          }}
        >
          <PageTitle 
            variant="h1" 
            align="center" 
            gutterBottom
            sx={{
              fontSize: { xs: '1.75rem', sm: '2rem' },
              mb: 3,
              color: theme.palette.mode === 'dark' ? '#FFFFFF' : theme.palette.text.primary,
              fontWeight: 700,
            }}
          >
            Create an Account
          </PageTitle>
          
          <AuthForm mode="register" />
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
