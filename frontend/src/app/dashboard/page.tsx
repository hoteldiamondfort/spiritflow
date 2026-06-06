'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
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
  }, [router]);

  if (loading) {
    return <div style={styles.loadingContainer}>Loading...</div>;
  }

  return (
    <DashboardLayout user={user}>
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
    </DashboardLayout>
  );
}

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontFamily: '"Courier New", Courier, monospace',
  } as React.CSSProperties,

  contentCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 'clamp(20px, 3vw, 28px)',
    margin: 'clamp(20px, 3vw, 28px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  } as React.CSSProperties,

  welcomeTitle: {
    fontSize: 'clamp(18px, 3vw, 24px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    margin: '0 0 clamp(16px, 2vw, 20px) 0',
    fontFamily: '"Courier New", Courier, monospace',
  } as React.CSSProperties,

  userInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 'clamp(12px, 2vw, 16px)',
  } as React.CSSProperties,

  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: 'clamp(12px, 2vw, 16px)',
    backgroundColor: '#f8f8f8',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,

  infoLabel: {
    fontSize: 'clamp(10px, 1.2vw, 11px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#8a8a8a',
    textTransform: 'uppercase',
    fontFamily: '"Courier New", Courier, monospace',
  } as React.CSSProperties,

  infoValue: {
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    fontWeight: 'bold',
    color: '#1a1a1a',
    fontFamily: '"Courier New", Courier, monospace',
  } as React.CSSProperties,
};