import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';
import { Container, Box } from '@mui/material';
import { PageTitle } from '../components/StyledComponents';

const Register = () => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <PageTitle variant="h1" align="center" gutterBottom>
          Create an Account
        </PageTitle>
        <AuthForm mode="register" />
      </Box>
    </Container>
  );
};

export default Register;
