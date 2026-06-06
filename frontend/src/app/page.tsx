'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      {/* Main Content */}
      <main style={styles.mainContainer}>
        <div style={styles.contentWrapper}>
          {/* Left Section - Title & Description */}
          <div style={styles.leftSection}>
            <h1 style={styles.mainTitle}>
              SPIRIT FLOW
              <span style={styles.underscoreBlue}>_</span>
            </h1>
            <p style={styles.subtitle}>INTELLIGENT BAR MANAGEMENT ECO SYSTEM</p>
            <p style={styles.description}>
              MANAGE YOUR INVENTORY WITH PRECISION AND EFFICIENCY
            </p>
          </div>

          {/* Right Section - Login Form */}
          <div style={styles.rightSection}>
            <div style={styles.formCard}>
              <div style={styles.formHeader}>
                <h2 style={styles.formTitle}>LOGIN</h2>
                <span style={styles.liveBadge}>ACTIVE</span>
              </div>

              <form onSubmit={handleLogin} style={styles.form}>
                {/* Email Input */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    style={{
                      ...styles.input,
                      borderColor: email ? '#2196F3' : '#e0e0e0'
                    }}
                    required
                  />
                </div>

                {/* Password Input */}
                <div style={styles.inputGroup}>
                  <label style={styles.label}>PASSWORD</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      ...styles.input,
                      borderColor: password ? '#2196F3' : '#e0e0e0'
                    }}
                    required
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div style={styles.errorMessage}>
                    <span style={styles.errorIcon}>⚠</span>
                    {error}
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.loginButton,
                    opacity: loading ? 0.6 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? 'AUTHENTICATING...' : 'LOGIN'}
                </button>
              </form>

              {/* Footer */}
              <div style={styles.formFooter}>
                <span style={styles.footerText}>© 2026 HOTEL DIAMOND FORT</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerContent}>
          <span style={styles.footerLeft}>● STATUS: LIVE</span>
          <span style={styles.footerRight}>DESIGNED & DEVELOPED BY EZHUTHOLA EDTECH PRIVATE LIMITED</span>
        </div>
      </footer>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
  } as React.CSSProperties,

  /* Main */
  mainContainer: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(20px, 5vw, 40px)',
  } as React.CSSProperties,

  contentWrapper: {
    width: '100%',
    maxWidth: '1400px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 'clamp(30px, 8vw, 60px)',
    alignItems: 'center',
  } as React.CSSProperties,

  /* Left Section */
  leftSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    minHeight: '300px',
    justifyContent: 'center',
  } as React.CSSProperties,

  mainTitle: {
    fontSize: 'clamp(32px, 6vw, 56px)',
    fontWeight: 'bold',
    letterSpacing: '3px',
    margin: 0,
    display: 'inline-block',
    width: 'fit-content',
  } as React.CSSProperties,

  underscoreBlue: {
    color: '#2196F3',
    fontSize: 'clamp(32px, 6vw, 56px)',
    marginLeft: '4px',
  } as React.CSSProperties,

  subtitle: {
    fontSize: 'clamp(12px, 1.8vw, 16px)',
    color: '#595959',
    letterSpacing: '1px',
    margin: '20px 0 0 0',
    fontWeight: 'normal',
  } as React.CSSProperties,

  description: {
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    color: '#8a8a8a',
    letterSpacing: '1px',
    lineHeight: '1.6',
    margin: '10px 0 0 0',
    maxWidth: '500px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } as React.CSSProperties,

  /* Right Section - Form */
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  } as React.CSSProperties,

  formCard: {
    width: '100%',
    maxWidth: '400px',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    padding: 'clamp(24px, 5vw, 40px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  } as React.CSSProperties,

  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '1px solid #f0f0f0',
  } as React.CSSProperties,

  formTitle: {
    fontSize: 'clamp(16px, 2vw, 20px)',
    fontWeight: 'bold',
    letterSpacing: '2px',
    margin: 0,
  } as React.CSSProperties,

  liveBadge: {
    fontSize: '10px',
    fontWeight: 'bold',
    color: '#4caf50',
    backgroundColor: '#e8f5e9',
    padding: '4px 8px',
    letterSpacing: '1px',
    border: '1px solid #c8e6c9',
  } as React.CSSProperties,

  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(16px, 3vw, 24px)',
  } as React.CSSProperties,

  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  } as React.CSSProperties,

  label: {
    fontSize: 'clamp(12px, 1.4vw, 13px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  input: {
    padding: 'clamp(10px, 2vw, 14px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxSizing: 'border-box',
  } as React.CSSProperties,

  errorMessage: {
    padding: 'clamp(10px, 2vw, 14px)',
    backgroundColor: '#ffebee',
    color: '#c62828',
    fontSize: 'clamp(12px, 1.5vw, 13px)',
    border: '1px solid #ef5350',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  errorIcon: {
    fontSize: 'clamp(14px, 2vw, 16px)',
  } as React.CSSProperties,

  loginButton: {
    padding: 'clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    fontWeight: 'bold',
    letterSpacing: '2px',
    color: '#ffffff',
    backgroundColor: '#1a1a1a',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '8px',
    fontFamily: '"Courier New", Courier, monospace',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  formFooter: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #f0f0f0',
    textAlign: 'center',
  } as React.CSSProperties,

  footerText: {
    fontSize: 'clamp(10px, 1.2vw, 12px)',
    color: '#8a8a8a',
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  /* Footer */
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
  } as React.CSSProperties,

  footerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  footerRight: {
    letterSpacing: '0.5px',
    textAlign: 'right',
  } as React.CSSProperties,
};