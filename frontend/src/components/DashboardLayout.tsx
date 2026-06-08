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
  const [stockExpanded, setStockExpanded] = useState(false);
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
            {/* PROFILE MANAGEMENT SECTION */}
            <div style={styles.menuSection}>
              <button 
                onClick={() => setProfileExpanded(!profileExpanded)} 
                style={{...styles.sectionHeader, display: 'flex', justifyContent: menuOpen ? 'space-between' : 'center'}}
              >
                <span style={{display: menuOpen ? 'inline' : 'none'}}>PROFILE MANAGEMENT</span>
                <span style={{fontSize: '12px', transition: 'transform 0.3s', transform: profileExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'}}>▼</span>
              </button>

              {profileExpanded && (
                <div style={styles.menuItems}>
                  <button 
                    onClick={() => router.push('#')} 
                    style={styles.menuItem}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <span style={styles.menuIcon}>🏦</span>
                    <span style={{display: menuOpen ? 'inline' : 'none'}}>BANK PROFILE</span>
                  </button>
                  <button 
                    onClick={() => router.push('#')} 
                    style={styles.menuItem}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <span style={styles.menuIcon}>👤</span>
                    <span style={{display: menuOpen ? 'inline' : 'none'}}>EMPLOYEE PROFILE</span>
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/products')} 
                    style={styles.menuItem}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <span style={styles.menuIcon}>📦</span>
                    <span style={{display: menuOpen ? 'inline' : 'none'}}>PRODUCT PROFILE</span>
                  </button>
                </div>
              )}
            </div>

            {/* STOCK MANAGEMENT SECTION */}
            <div style={styles.menuSection}>
              <button 
                onClick={() => setStockExpanded(!stockExpanded)} 
                style={{...styles.sectionHeader, display: 'flex', justifyContent: menuOpen ? 'space-between' : 'center'}}
              >
                <span style={{display: menuOpen ? 'inline' : 'none'}}>STOCK MANAGEMENT</span>
                <span style={{fontSize: '12px', transition: 'transform 0.3s', transform: stockExpanded ? 'rotate(0deg)' : 'rotate(-90deg)'}}>▼</span>
              </button>

              {stockExpanded && (
                <div style={styles.menuItems}>
                  <button 
                    onClick={() => router.push('/dashboard/stock-transfer')} 
                    style={styles.menuItem}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <span style={styles.menuIcon}>🔄</span>
                    <span style={{display: menuOpen ? 'inline' : 'none'}}>STOCK TRANSFER</span>
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/stock-adjustment')} 
                    style={styles.menuItem}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <span style={styles.menuIcon}>⚙️</span>
                    <span style={{display: menuOpen ? 'inline' : 'none'}}>STOCK ADJUSTMENT</span>
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/stock-insight')} 
                    style={styles.menuItem}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <span style={styles.menuIcon}>📊</span>
                    <span style={{display: menuOpen ? 'inline' : 'none'}}>STOCK INSIGHT</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </aside>

        <main style={styles.mainArea}>
          {children}
        </main>
      </div>

      <footer style={styles.footer}>
        ● STATUS: LIVE // DESIGNED & DEVELOPED BY EZHUTHOLA EDTECH PRIVATE LIMITED
      </footer>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
  } as React.CSSProperties,

  header: {
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    padding: 'clamp(12px, 2vw, 16px)',
    borderBottom: '1px solid #e0e0e0',
  } as React.CSSProperties,

  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%',
  } as React.CSSProperties,

  logoBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  } as React.CSSProperties,

  logo: {
    fontSize: 'clamp(16px, 2.5vw, 22px)',
    margin: 0,
    letterSpacing: '2px',
    color: '#ffffff',
  } as React.CSSProperties,

  underscoreBlue: {
    color: '#2196F3',
  } as React.CSSProperties,

  logoutBtn: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(10px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#ffffff',
    backgroundColor: '#1a1a1a',
    border: '1px solid #595959',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  mainContent: {
    display: 'flex',
    flex: 1,
  } as React.CSSProperties,

  sidebar: {
    backgroundColor: '#f8f8f8',
    borderRight: '1px solid #e0e0e0',
    transition: 'width 0.3s',
    overflowY: 'auto',
    padding: 'clamp(12px, 1.5vw, 16px) 0',
  } as React.CSSProperties,

  menuToggle: {
    width: '100%',
    padding: 'clamp(8px, 1.5vw, 12px)',
    fontSize: 'clamp(11px, 1.3vw, 13px)',
    fontWeight: 'bold',
    border: 'none',
    backgroundColor: '#e0e0e0',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    marginBottom: 'clamp(12px, 1.5vw, 16px)',
  } as React.CSSProperties,

  nav: {
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  menuSection: {
    marginBottom: 'clamp(8px, 1.5vw, 12px)',
  } as React.CSSProperties,

  sectionHeader: {
    width: '100%',
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(9px, 1.1vw, 10px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
    backgroundColor: '#e0e0e0',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    textTransform: 'uppercase',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  menuItems: {
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,

  menuItem: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(9px, 1.1vw, 11px)',
    color: '#595959',
    backgroundColor: '#ffffff',
    border: 'none',
    borderBottom: '1px solid #e0e0e0',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    textAlign: 'left',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 12px)',
  } as React.CSSProperties,

  menuIcon: {
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    minWidth: '20px',
  } as React.CSSProperties,

  mainArea: {
    flex: 1,
    overflowY: 'auto',
  } as React.CSSProperties,

  footer: {
    backgroundColor: '#f8f8f8',
    color: '#8a8a8a',
    padding: 'clamp(12px, 2vw, 16px)',
    textAlign: 'center',
    fontSize: 'clamp(9px, 1.1vw, 10px)',
    borderTop: '1px solid #e0e0e0',
  } as React.CSSProperties,

  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontFamily: '"Courier New", Courier, monospace',
    fontSize: '16px',
  } as React.CSSProperties,
};