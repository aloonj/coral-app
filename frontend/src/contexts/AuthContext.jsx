import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext({
  user: null,
  login: () => {},
  logout: () => {},
  loading: true
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if localStorage is available
  const isStorageAvailable = () => {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    if (isStorageAvailable()) {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      if (storedUser && storedToken) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('Error parsing stored user:', error);
          // If there's an error parsing user data, clean up storage
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } else {
        // If either user or token is missing, clean up both
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    setUser(userData);
    if (isStorageAvailable()) {
      try {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        // If we can't save both, clean up to maintain consistency
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  };

  const logout = () => {
    setUser(null);
    if (isStorageAvailable()) {
      try {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } catch (error) {
        console.error('Error removing from localStorage:', error);
      }
    }
  };

  // Instead of returning null during loading, we return a loading indicator
  if (loading) {
    return (
      <AuthContext.Provider value={{ user: null, login, logout, loading }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
        }}>
          <div style={{
            padding: '20px',
            borderRadius: '8px',
            background: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            Loading...
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
