import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { FaUserCircle, FaCog, FaShoppingCart, FaSignOutAlt, FaChartBar } from 'react-icons/fa';
import styles from './Layout.module.css';
import fraggleRockLogo from '../../assets/images/fr-logo.svg';

const Layout = ({ children }) => {
  const pageWrapperStyle = {
    position: 'relative',
    minHeight: '100vh',
  };

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navStyle = {
    background: 'linear-gradient(135deg, #20B2AA 0%, #008B8B 50%, #006666 100%)',
    color: 'white',
    padding: '0.75rem 0',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 8px 15px rgba(0,0,0,0.15)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.15)',
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
  };

  const navContentStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const logoStyle = {
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.3s ease',
  };

  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close admin menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const adminDropdown = document.querySelector(`.${styles.adminDropdown}`);
      if (adminDropdown && !adminDropdown.contains(event.target)) {
        setShowAdminMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle body overflow when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      // Calculate and set scrollbar width
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.setProperty('--scrollbar-width', '0px');
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.setProperty('--scrollbar-width', '0px');
    };
  }, [isMobileMenuOpen]);

  const navLinksStyle = {
    display: 'flex',
    gap: '1.5rem',
    alignItems: 'center',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: isMobile ? 'center' : 'flex-end',
    width: isMobile ? '100%' : 'auto',
  };


  const buttonStyle = {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'white',
    padding: '0.6rem 1.2rem',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: '500',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    fontSize: '0.9rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
  };

  const mainStyle = {
    minHeight: 'calc(100vh - 64px)',
    padding: '2rem 0',
    position: 'relative',
    zIndex: 1,
    background: 'linear-gradient(135deg, rgba(32, 178, 170, 0.1) 0%, rgba(0, 139, 139, 0.05) 100%)',
    boxShadow: 'inset 0 0 50px rgba(0,0,0,0.03)',
  };

  return (
    <div style={pageWrapperStyle}>
      <nav style={navStyle}>
        <div style={containerStyle}>
          <div style={navContentStyle}>
            <Link to="/" className={styles.logo} style={logoStyle}>
              <img 
                src={fraggleRockLogo} 
                alt="FraggleRock Logo" 
                style={{
                  height: '50px',
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))',
                  transition: 'transform 0.3s ease',
                  marginBottom: '-0.75rem'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              />
            </Link>
            <button 
              className={`${styles.burgerMenu} ${isMobileMenuOpen ? styles.open : ''}`} 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <span className={styles.burgerLine}></span>
              <span className={styles.burgerLine}></span>
              <span className={styles.burgerLine}></span>
            </button>

            <div 
              className={`${styles.navLinks} ${isMobileMenuOpen ? styles.open : ''}`}
              onClick={(e) => {
                // Only close if clicking a link, not the admin dropdown
                if (e.target.tagName === 'A' && !e.target.classList.contains(styles.adminButton)) {
                  setIsMobileMenuOpen(false);
                }
              }}
            >
              {user && (
                <>
                  <Link to="/dashboard" className={styles.link}>
                    <FaChartBar size={18} />
                    Dashboard
                  </Link>
                  <Link to="/quickorder" className={styles.link}>
                    <FaShoppingCart size={18} />
                    Order Corals
                  </Link>
                  {user.role === 'CLIENT' && (
                  <Link to="/client-orders" className={styles.link}>
                      Your Orders
                    </Link>
                  )}
                  <Link to="/profile" className={styles.link}>
                    <FaUserCircle size={18} />
                    Profile
                  </Link>
                  {(user.role === 'ADMIN' || user.role === 'SUPERADMIN') && (
                    <div className={styles.adminDropdown}>
                      <button 
                        className={`${styles.adminButton} ${showAdminMenu ? styles.open : ''}`}
                        onClick={() => setShowAdminMenu(!showAdminMenu)}
                        aria-expanded={showAdminMenu}
                      >
                        <FaCog size={20} />
                        <span>Admin</span>
                        <svg 
                          className={styles.chevron} 
                          width="12" 
                          height="12" 
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path 
                            d="M2 4L6 8L10 4" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round"
                          />
                        </svg>
                      </button>
                      <div 
                        className={`${styles.adminDropdownContent} ${showAdminMenu ? styles.show : ''}`}
                        onClick={(e) => {
                          // Only close menu on mobile when clicking a link
                          if (window.innerWidth <= 768 && e.target.tagName === 'A') {
                            setShowAdminMenu(false);
                            setIsMobileMenuOpen(false); // Also close the mobile menu
                          }
                        }}
                      >
                        <Link to="/corals" className={styles.dropdownLink}>
                          Stock Management
                        </Link>
                        <Link to="/orders" className={styles.dropdownLink}>
                          Order Management
                        </Link>
                        <Link to="/clients" className={styles.dropdownLink}>
                          Clients
                        </Link>
                        <Link to="/admin-users" className={styles.dropdownLink}>
                          Admin Users
                        </Link>
                        <Link to="/image-management" className={styles.dropdownLink}>
                          Image Management
                        </Link>
                        <Link to="/notifications" className={styles.dropdownLink}>
                          Notifications
                        </Link>
                        <Link to="/backups" className={styles.dropdownLink}>
                          Backups
                        </Link>
                      </div>
                    </div>
                  )}
                  <a href="#" onClick={handleLogout} className={styles.link}>
                    <FaSignOutAlt size={18} />
                    Logout
                  </a>
                </>
              )}
              {!user && (
                <Link to="/login" className={styles.link}>
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main style={mainStyle}>
        <div style={containerStyle}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
