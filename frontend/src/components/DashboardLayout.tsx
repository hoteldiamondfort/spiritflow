'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: any;
}

export default function DashboardLayout({ children, user }: DashboardLayoutProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [stockExpanded, setStockExpanded] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={styles.hamburger}
          >
            ☰
          </button>
          <h1 style={styles.logo}>SPIRITFLOW WMS</h1>
          <div style={styles.headerRight}>
            <span style={styles.userEmail}>{user?.email || 'User'}</span>
            <button onClick={handleLogout} style={styles.logoutBtn}>
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      <div style={styles.mainContainer}>
        {/* Sidebar */}
        <aside
          style={{
            ...styles.sidebar,
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <nav style={styles.nav}>
            {/* Dashboard */}
            <div style={styles.navSection}>
              <button
                onClick={() => router.push('/dashboard')}
                style={styles.navItem}
              >
                📊 DASHBOARD
              </button>
            </div>

            {/* Profile Management Section */}
            <div style={styles.navSection}>
              <button
                onClick={() => setProfileExpanded(!profileExpanded)}
                style={styles.navItemExpand}
              >
                👤 PROFILE MANAGEMENT {profileExpanded ? '▼' : '▶'}
              </button>
              {profileExpanded && (
                <div style={styles.navSubMenu}>
                  <button
                    onClick={() => router.push('/dashboard/products')}
                    style={styles.navSubItem}
                  >
                    Products
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/employee')}
                    style={styles.navSubItem}
                  >
                    Employee Profile
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/bank')}
                    style={styles.navSubItem}
                  >
                    Bank Profile
                  </button>
                </div>
              )}
            </div>

            {/* Stock Management Section */}
            <div style={styles.navSection}>
              <button
                onClick={() => setStockExpanded(!stockExpanded)}
                style={styles.navItemExpand}
              >
                📦 STOCK MANAGEMENT {stockExpanded ? '▼' : '▶'}
              </button>
              {stockExpanded && (
                <div style={styles.navSubMenu}>
                  <button
                    onClick={() => router.push('/dashboard/stock-transfer')}
                    style={styles.navSubItem}
                  >
                    Stock Transfer
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/stock-adjustment')}
                    style={styles.navSubItem}
                  >
                    Stock Adjustment
                  </button>
                </div>
              )}
            </div>

            {/* Attendance Section */}
            <div style={styles.navSection}>
              <button
                onClick={() => router.push('/dashboard/attendance')}
                style={styles.navItem}
              >
                ✓ ATTENDANCE
              </button>
            </div>

            {/* Reports Section */}
            <div style={styles.navSection}>
              <button
                onClick={() => router.push('/dashboard/reports')}
                style={styles.navItem}
              >
                📈 REPORTS
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main style={styles.main}>{children}</main>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2026 Hotel Diamond Fort - SpiritFlow WMS
        </p>
      </footer>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '"Courier New", Courier, monospace',
  } as React.CSSProperties,

  header: {
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    padding: 'clamp(12px, 2vw, 16px)',
    borderBottom: '2px solid #2196F3',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,

  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'clamp(8px, 2vw, 16px)',
  } as React.CSSProperties,

  hamburger: {
    display: 'none',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: 'clamp(18px, 3vw, 24px)',
    cursor: 'pointer',
    padding: '4px 8px',
  } as React.CSSProperties,

  logo: {
    fontSize: 'clamp(16px, 2.5vw, 20px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    margin: 0,
    flex: 1,
  } as React.CSSProperties,

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 'clamp(8px, 1.5vw, 12px)',
  } as React.CSSProperties,

  userEmail: {
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    color: '#aaa',
  } as React.CSSProperties,

  logoutBtn: {
    backgroundColor: '#E53935',
    color: '#ffffff',
    border: 'none',
    padding: 'clamp(6px, 1vw, 8px) clamp(12px, 1.5vw, 16px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    borderRadius: '3px',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  mainContainer: {
    display: 'flex',
    flex: 1,
    gap: 0,
  } as React.CSSProperties,

  sidebar: {
    backgroundColor: '#ffffff',
    width: 'clamp(200px, 20vw, 280px)',
    borderRight: '1px solid #e0e0e0',
    padding: 'clamp(12px, 2vw, 16px)',
    overflowY: 'auto',
    position: 'relative',
    zIndex: 50,
    transition: 'transform 0.3s ease',
  } as React.CSSProperties,

  nav: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'clamp(4px, 0.8vw, 8px)',
  } as React.CSSProperties,

  navSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'clamp(2px, 0.5vw, 4px)',
  } as React.CSSProperties,

  navItem: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: 'clamp(10px, 1.6vw, 12px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    color: '#1a1a1a',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: '"Courier New", Courier, monospace',
    borderRadius: '3px',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  navItemExpand: {
    backgroundColor: '#f0f0f0',
    border: 'none',
    padding: 'clamp(10px, 1.6vw, 12px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    color: '#1a1a1a',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: '"Courier New", Courier, monospace',
    borderRadius: '3px',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  navSubMenu: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'clamp(2px, 0.5vw, 4px)',
    paddingLeft: 'clamp(8px, 1.5vw, 12px)',
    borderLeft: '2px solid #2196F3',
  } as React.CSSProperties,

  navSubItem: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: 'clamp(8px, 1.4vw, 10px)',
    fontSize: 'clamp(11px, 1.1vw, 12px)',
    color: '#595959',
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: '"Courier New", Courier, monospace',
    borderRadius: '3px',
    transition: 'all 0.2s',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  main: {
    flex: 1,
    padding: 'clamp(12px, 2.5vw, 20px)',
    overflowY: 'auto',
    backgroundColor: '#f5f5f5',
  } as React.CSSProperties,

  footer: {
    backgroundColor: '#1a1a1a',
    color: '#aaa',
    textAlign: 'center',
    padding: 'clamp(10px, 1.5vw, 14px)',
    borderTop: '1px solid #e0e0e0',
    fontSize: 'clamp(10px, 1.1vw, 11px)',
  } as React.CSSProperties,

  footerText: {
    margin: 0,
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 48,
  } as React.CSSProperties,
};