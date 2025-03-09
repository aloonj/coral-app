import { Navigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';
import { Container, Box, Typography, Divider } from '@mui/material';
import { PageTitle, ActionButton, FormContainer } from '../components/StyledComponents';

const Register = () => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          py: 2,
          mt: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <FormContainer sx={{ width: '100%', maxWidth: '100%' }}>
          <PageTitle 
            variant="h1" 
            align="center" 
            gutterBottom
          >
            Create a Client Account
          </PageTitle>
          
          <Typography 
            variant="body1" 
            align="center" 
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Register as a client to place orders and track your purchases
          </Typography>
          
          <AuthForm mode="register" />
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            gap: 2
          }}>
            <Typography variant="body1" color="text.secondary">
              Already have an account?
            </Typography>
            <ActionButton
              component={RouterLink}
              to="/login"
              variant="outlined"
              color="primary"
              sx={{ width: '100%' }}
            >
              Login to Your Account
            </ActionButton>
          </Box>
        </FormContainer>
      </Box>
    </Container>
  );
};

export default Register;
