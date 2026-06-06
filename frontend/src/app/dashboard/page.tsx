'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(true);
  const [profileExpanded, setProfileExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
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
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return <div style={styles.loadingContainer}>Loading...</div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>
            SPIRIT FLOW
            <span style={styles.underscoreBlue}>_</span>
          </h1>
          <button onClick={handleLogout} style={styles.logoutBtn} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a1a1a'}>
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
              <button onClick={() => setProfileExpanded(!profileExpanded)} style={{...styles.sectionHeader, display: 'flex', justifyContent: menuOpen ? 'space-between' : 'center'}}>
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
          <div style={styles.contentCard}>
            <h2 style={styles.welcomeTitle}>WELCOME, {user?.name?.toUpperCase()}</h2>
            <div style={styles.userInfoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>ROLE</span>
                <span style={styles.infoValue}>{user?.role?.toUpperCase()}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>STOCK POINT</span>
                <span style={styles.infoValue}>{user?.stock_point?.toUpperCase()}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>EMAIL</span>
                <span style={styles.infoValue}>{user?.email}</span>
              </div>
            </div>
          </div>
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
    borderRight: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    padding: 'clamp(12px, 2vw, 16px)',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,

  menuToggle: {
    padding: '10px 8px',
    fontSize: '12px',
    fontWeight: 'bold',
    border: '1px solid #e0e0e0',
    backgroundColor: '#f8f8f8',
    cursor: 'pointer',
    marginBottom: '20px',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s ease',
    letterSpacing: '1px',
  } as React.CSSProperties,

  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  } as React.CSSProperties,

  menuSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  } as React.CSSProperties,

  sectionHeader: {
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
    textTransform: 'uppercase',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    padding: '8px 0',
    transition: 'all 0.3s ease',
    alignItems: 'center',
  } as React.CSSProperties,

  menuList: {
    listStyle: 'none',
    padding: '0 0 0 12px',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderLeft: '2px solid #e0e0e0',
  } as React.CSSProperties,

  menuItem: {
    margin: 0,
  } as React.CSSProperties,

  menuLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: 'clamp(8px, 1.5vw, 10px) clamp(10px, 1.5vw, 12px)',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    color: '#1a1a1a',
    textDecoration: 'none',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.2s ease',
    fontWeight: '500',
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  contentArea: {
    flex: 1,
    padding: 'clamp(20px, 4vw, 32px)',
    overflow: 'auto',
  } as React.CSSProperties,

  contentCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 'clamp(20px, 3vw, 28px)',
    marginBottom: 'clamp(20px, 3vw, 28px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  } as React.CSSProperties,

  welcomeTitle: {
    fontSize: 'clamp(20px, 3.5vw, 28px)',
    fontWeight: 'bold',
    margin: '0 0 20px 0',
    letterSpacing: '1px',
  } as React.CSSProperties,

  userInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  } as React.CSSProperties,

  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  } as React.CSSProperties,

  infoLabel: {
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    color: '#595959',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  infoValue: {
    fontSize: 'clamp(13px, 1.5vw, 15px)',
    color: '#1a1a1a',
    fontWeight: '500',
    letterSpacing: '0.5px',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 'clamp(8px, 2vw, 16px)',
    fontSize: 'clamp(9px, 1.1vw, 11px)',
    color: '#595959',
    flexWrap: 'wrap',
    padding: '0 clamp(12px, 2vw, 20px)',
  } as React.CSSProperties,

  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  footerDivider: {
    color: '#d0d0d0',
  } as React.CSSProperties,

  statusText: {
    letterSpacing: '0.5px',
  } as React.CSSProperties,
};