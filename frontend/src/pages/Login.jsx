import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/Auth/AuthForm';

const Login = () => {
  const { user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem',
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '2rem',
    color: '#2D3748',
  };

  return (
    <div style={containerStyle}>
      <h1 style={titleStyle}>Login to Your Account</h1>
      <AuthForm mode="login" />
    </div>
  );
};

export default Login;
