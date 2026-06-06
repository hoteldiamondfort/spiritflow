'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: any;
}

export default function DashboardLayout({ children, user: initialUser }: DashboardLayoutProps) {
  const [user, setUser] = useState<any>(initialUser);
  const [menuOpen, setMenuOpen] = useState(true);
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [loading, setLoading] = useState(!initialUser);
  const router = useRouter();

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    setLoading(false);

    const handleResize = () => {
      if (window.innerWidth < 768) {
        setMenuOpen(false);
      } else {
        setMenuOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [initialUser, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleLogoClick = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return <div style={styles.loadingContainer}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button onClick={handleLogoClick} style={styles.logoBtn}>
            <h1 style={styles.logo}>
              SPIRIT FLOW
              <span style={styles.underscoreBlue}>_</span>
            </h1>
          </button>
          <button 
            onClick={handleLogout} 
            style={styles.logoutBtn} 
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'} 
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}
          >
            LOGOUT
          </button>
        </div>
      </header>

      <div style={styles.mainContent}>
        <aside style={{...styles.sidebar, width: menuOpen ? '280px' : '70px'}}>
          <button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuToggle}>
            {menuOpen ? '◀◀' : '▶▶'}
          </button>

          <nav style={styles.nav}>
            <div style={styles.menuSection}>
              <button 
                onClick={() => setProfileExpanded(!profileExpanded)} 
                style={{...styles.sectionHeader, display: 'flex', justifyContent: menuOpen ? 'space-between' : 'center'}}
              >
                <span style={{display: menuOpen ? 'inline' : 'none'}}>PROFILE MANAGEMENT</span>
                <span style={{fontSize: '12px', transition: 'transform 0.3s', transform: profileExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'}}>▼</span>
              </button>

              {profileExpanded && (
                <ul style={styles.menuList}>
                  <li style={styles.menuItem}>
                    <a href="#" style={styles.menuLink} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      <span>🏦</span>
                      {menuOpen && <span>BANK PROFILE</span>}
                    </a>
                  </li>
                  <li style={styles.menuItem}>
                    <a href="#" style={styles.menuLink} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      <span>👤</span>
                      {menuOpen && <span>EMPLOYEE PROFILE</span>}
                    </a>
                  </li>
                  <li style={styles.menuItem}>
                    <a href="/dashboard/products" style={styles.menuLink} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}>
                      <span>📦</span>
                      {menuOpen && <span>PRODUCT PROFILE</span>}
                    </a>
                  </li>
                </ul>
              )}
            </div>
          </nav>
        </aside>

        <main style={styles.contentArea}>
          {children}
        </main>
      </div>

      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <span style={styles.statusIndicator}>● STATUS: LIVE</span>
          <span style={styles.footerDivider}>//</span>
          <span style={styles.statusText}>DESIGNED & DEVELOPED BY EZHUTHOLA EDTECH PRIVATE LIMITED</span>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
  } as React.CSSProperties,

  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontFamily: '"Courier New", Courier, monospace',
  } as React.CSSProperties,

  header: {
    borderBottom: '1px solid #e0e0e0',
    padding: 'clamp(12px, 2vw, 20px)',
    backgroundColor: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  } as React.CSSProperties,

  headerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 clamp(12px, 2vw, 20px)',
  } as React.CSSProperties,

  logoBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    transition: 'opacity 0.3s',
  } as React.CSSProperties,

  logo: {
    fontSize: 'clamp(16px, 2.5vw, 20px)',
    fontWeight: 'bold',
    letterSpacing: '2px',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,

  underscoreBlue: {
    color: '#2196F3',
  } as React.CSSProperties,

  logoutBtn: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#ffffff',
    backgroundColor: '#1a1a1a',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,

  mainContent: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  } as React.CSSProperties,

  sidebar: {
    backgroundColor: '#ffffff',
    borderRight: '1px solid #e0e0e0',
    padding: 'clamp(8px, 1.5vw, 12px)',
    overflowY: 'auto',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,

  menuToggle: {
    width: '100%',
    padding: 'clamp(8px, 1.5vw, 12px)',
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    fontWeight: 'bold',
    backgroundColor: '#f8f8f8',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    marginBottom: 'clamp(12px, 2vw, 16px)',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(12px, 2vw, 16px)',
  } as React.CSSProperties,

  menuSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  } as React.CSSProperties,

  sectionHeader: {
    padding: 'clamp(8px, 1.5vw, 12px)',
    fontSize: 'clamp(10px, 1.2vw, 11px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    backgroundColor: '#f8f8f8',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  menuList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  } as React.CSSProperties,

  menuItem: {
    listStyle: 'none',
  } as React.CSSProperties,

  menuLink: {
    display: 'flex',
    gap: 'clamp(8px, 1.5vw, 12px)',
    alignItems: 'center',
    padding: 'clamp(8px, 1.5vw, 12px)',
    fontSize: 'clamp(10px, 1.2vw, 11px)',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textDecoration: 'none',
    color: '#595959',
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  contentArea: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#ffffff',
  } as React.CSSProperties,

  footer: {
    borderTop: '1px solid #e0e0e0',
    padding: 'clamp(12px, 2vw, 16px)',
    backgroundColor: '#ffffff',
  } as React.CSSProperties,

  footerContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 12px)',
    padding: '0 clamp(12px, 2vw, 20px)',
    fontSize: 'clamp(10px, 1.2vw, 12px)',
    color: '#8a8a8a',
    letterSpacing: '0.5px',
    justifyContent: 'center',
    textAlign: 'center',
  } as React.CSSProperties,

  statusIndicator: {
    fontWeight: 'bold',
  } as React.CSSProperties,

  footerDivider: {
    color: '#e0e0e0',
  } as React.CSSProperties,

  statusText: {
    color: '#8a8a8a',
  } as React.CSSProperties,
};