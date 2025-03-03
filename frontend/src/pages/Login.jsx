import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';
import { Container, Box, Typography } from '@mui/material';
import { PageTitle } from '../components/StyledComponents';

const Login = () => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ 
        py: 4, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        width: '100%'
      }}>
        <PageTitle variant="h1" align="center" gutterBottom>
          Login to Your Account
        </PageTitle>
        <Box sx={{ width: '100%', maxWidth: '400px' }}>
          <AuthForm mode="login" />
        </Box>
      </Box>
    </Container>
  );
};

export default Login;
