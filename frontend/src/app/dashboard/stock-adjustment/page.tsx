'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

const STOCK_POINTS = [
  { id: 'warehouse', name: 'WAREHOUSE' },
  { id: 'druvam', name: 'DRUVAM' },
  { id: 'spadikam', name: 'SPADIKAM' }
];

const ADJUSTMENT_OPTIONS = [
  { id: 'CLOSING_STOCK', name: 'CLOSING STOCK' },
  { id: 'CORRECTION', name: 'CORRECTION' }
];

const PEG_SIZE_ML = 60;

interface Product {
  product_id: string;
  product_name: string;
  product_alias: string;
  category_name: string;
  ml_per_bottle: number;
  bottles_per_case: number;
}

interface StockData {
  product_id: string;
  product_name: string;
  product_alias: string;
  total_quantity_ml: number;
  breakdown: {
    warehouse: number;
    druvam: number;
    spadikam: number;
  };
}

interface AdjustmentItem {
  product_id: string;
  product_name: string;
  product_alias: string;
  category_name: string;
  ml_per_bottle: number;
  bottles_per_case: number;
  current_ml: number;
  adjusted_cases: number;
  adjusted_bottles: number;
  adjusted_pegs: number;
  adjusted_ml: number;
}

type StockPointId = 'warehouse' | 'druvam' | 'spadikam';

export default function StockAdjustmentPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockData, setStockData] = useState<{[key: string]: StockData}>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [selectedStockPoint, setSelectedStockPoint] = useState<StockPointId | ''>('');
  const [selectedAdjustmentOption, setSelectedAdjustmentOption] = useState('');
  const [adjustmentItems, setAdjustmentItems] = useState<AdjustmentItem[]>([]);
  const [reason, setReason] = useState('');

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchProductsAndStock();
  }, [router]);

  function getTodayDate(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const fetchProductsAndStock = async () => {
    try {
      setLoading(true);

      const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const productsData = await productsResponse.json();

      const stockResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stock/total`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const stockDataResponse = await stockResponse.json();

      if (productsData.status === 'success') {
        setProducts(productsData.data);
      }

      if (stockDataResponse.status === 'success') {
        const stockMap: {[key: string]: StockData} = {};
        stockDataResponse.data.forEach((stock: StockData) => {
          stockMap[stock.product_id] = stock;
        });
        setStockData(stockMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setErrorMessage('Failed to load products and stock');
    } finally {
      setLoading(false);
    }
  };

  const convertFromML = (product: Product, totalML: number) => {
    const totalBottles = Math.floor(totalML / product.ml_per_bottle);
    const cases = Math.floor(totalBottles / product.bottles_per_case);
    const bottles = totalBottles % product.bottles_per_case;

    const remainingML = totalML - (cases * product.bottles_per_case * product.ml_per_bottle) - (bottles * product.ml_per_bottle);
    const pegsExact = remainingML / PEG_SIZE_ML;
    const pegs = Math.floor(pegsExact * 2) / 2;

    return { cases, bottles, pegs };
  };

  const convertToML = (product: Product, cases: number, bottles: number, pegs: number): number => {
    const casesML = cases * product.bottles_per_case * product.ml_per_bottle;
    const bottlesML = bottles * product.ml_per_bottle;
    const pegsML = pegs * PEG_SIZE_ML;
    return casesML + bottlesML + pegsML;
  };

  const isWarehouse = selectedStockPoint === 'warehouse';
  const isOutlet = selectedStockPoint === 'druvam' || selectedStockPoint === 'spadikam';

  const handleStockPointChange = (stockPoint: string) => {
    if (!stockPoint) {
      setSelectedStockPoint('');
      setAdjustmentItems([]);
      return;
    }

    const validStockPoint = stockPoint as StockPointId;
    setSelectedStockPoint(validStockPoint);
    
    setTimeout(() => {
      if (products.length === 0 || Object.keys(stockData).length === 0) {
        setAdjustmentItems([]);
        return;
      }

      const sortedProducts = [...products].sort((a, b) => {
        if (a.category_name !== b.category_name) {
          return a.category_name.localeCompare(b.category_name);
        }
        return a.product_alias.localeCompare(b.product_alias);
      });

      const items: AdjustmentItem[] = sortedProducts.map(product => {
        const stock = stockData[product.product_id];
        const currentML = stock?.breakdown[validStockPoint] || 0;
        const { cases, bottles, pegs } = convertFromML(product, currentML);

        return {
          product_id: product.product_id,
          product_name: product.product_name,
          product_alias: product.product_alias,
          category_name: product.category_name,
          ml_per_bottle: product.ml_per_bottle,
          bottles_per_case: product.bottles_per_case,
          current_ml: currentML,
          adjusted_cases: cases,
          adjusted_bottles: bottles,
          adjusted_pegs: pegs,
          adjusted_ml: currentML
        };
      });

      setAdjustmentItems(items);
    }, 0);
  };

  const handleItemChange = (index: number, field: 'cases' | 'bottles' | 'pegs', value: string) => {
    const numValue = field === 'pegs' ? parseFloat(value) || 0 : parseInt(value) || 0;
    const updatedItems = [...adjustmentItems];
    const item = updatedItems[index];
    const product = products.find(p => p.product_id === item.product_id);

    if (!product) return;

    if (field === 'cases') {
      item.adjusted_cases = numValue;
    } else if (field === 'bottles') {
      item.adjusted_bottles = numValue;
    } else if (field === 'pegs') {
      item.adjusted_pegs = numValue;
    }

    // For warehouse: cases + bottles + 0 pegs
    // For outlets: 0 cases + bottles + pegs
    if (isWarehouse) {
      item.adjusted_pegs = 0;
      item.adjusted_ml = convertToML(product, item.adjusted_cases, item.adjusted_bottles, 0);
    } else {
      item.adjusted_cases = 0;
      item.adjusted_ml = convertToML(product, 0, item.adjusted_bottles, item.adjusted_pegs);
    }

    setAdjustmentItems(updatedItems);
  };

  const handleConfirmAdjustment = () => {
    if (!selectedDate) {
      setErrorMessage('Please select a date');
      return;
    }

    if (!selectedStockPoint) {
      setErrorMessage('Please select a stock point');
      return;
    }

    if (!selectedAdjustmentOption) {
      setErrorMessage('Please select adjustment option');
      return;
    }

    const hasChanges = adjustmentItems.some(item => item.adjusted_ml !== item.current_ml);
    if (!hasChanges) {
      setErrorMessage('No changes made to stock');
      return;
    }

    setConfirmationData({
      date: selectedDate,
      stockPoint: selectedStockPoint,
      adjustmentOption: selectedAdjustmentOption,
      items: adjustmentItems.filter((item: AdjustmentItem) => item.adjusted_ml !== item.current_ml),
      reason
    });

    setShowConfirmation(true);
  };

  const handleSubmitAdjustment = async () => {
    if (!confirmationData) return;

    try {
      setIsProcessing(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stock-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: confirmationData.date,
          stock_point_id: confirmationData.stockPoint,
          adjustment_type: confirmationData.adjustmentOption,
          items: confirmationData.items.map((item: AdjustmentItem) => ({
            product_id: item.product_id,
            current_quantity_ml: item.current_ml,
            adjusted_quantity_ml: item.adjusted_ml,
            adjustment_quantity_ml: item.adjusted_ml - item.current_ml
          })),
          reason: confirmationData.reason || null,
          created_by: user?.auth_id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Adjustment failed');
      }

      setShowConfirmation(false);
      setSelectedDate(getTodayDate());
      setSelectedStockPoint('');
      setSelectedAdjustmentOption('');
      setReason('');
      setAdjustmentItems([]);
      setSuccessMessage(`✅ Stock adjustment successful! ${confirmationData.items.length} product(s) adjusted.`);

      setTimeout(() => {
        setSuccessMessage('');
        fetchProductsAndStock();
      }, 3000);

    } catch (error) {
      setErrorMessage(`❌ Error: ${error instanceof Error ? error.message : 'Adjustment failed'}`);
      console.error('Adjustment error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDisplayFormat = (item: AdjustmentItem, stockPoint: StockPointId | ''): string => {
    if (stockPoint === 'warehouse') {
      return `${item.adjusted_cases} Case(s) + ${item.adjusted_bottles} Bottle(s)`;
    } else {
      return `${item.adjusted_bottles} Bottle(s) + ${item.adjusted_pegs} Peg(s)`;
    }
  };

  const getPreviousFormat = (item: AdjustmentItem, stockPoint: StockPointId | ''): string => {
    const { cases, bottles, pegs } = convertFromML(
      products.find(p => p.product_id === item.product_id)!,
      item.current_ml
    );

    if (stockPoint === 'warehouse') {
      return `${cases} Case(s) + ${bottles} Bottle(s)`;
    } else {
      return `${bottles} Bottle(s) + ${pegs} Peg(s)`;
    }
  };

  if (loading) {
    return (
      <DashboardLayout user={user}>
        <div style={styles.container}>
          <div style={{textAlign: 'center', padding: '40px'}}>
            Loading...
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>STOCK ADJUSTMENT</h1>
        </div>

        {successMessage && (
          <div style={styles.successAlert}>
            <span style={styles.alertText}>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div style={styles.errorAlert}>
            <span style={styles.alertText}>{errorMessage}</span>
          </div>
        )}

        {showConfirmation ? (
          <div style={styles.contentCard}>
            <div style={styles.confirmationSection}>
              <h2 style={styles.confirmationTitle}>⚠️ CONFIRM ADJUSTMENT</h2>
              
              <div style={styles.confirmationDetails}>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Date:</span>
                  <span style={styles.detailValue}>{confirmationData.date}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Stock Point:</span>
                  <span style={styles.detailValue}>
                    {STOCK_POINTS.find(s => s.id === confirmationData.stockPoint)?.name}
                  </span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Type:</span>
                  <span style={styles.detailValue}>{confirmationData.adjustmentOption}</span>
                </div>
              </div>

              <div style={styles.divider}></div>

              <h3 style={styles.itemsTitle}>Products to Adjust ({confirmationData.items.length})</h3>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={{...styles.th, width: '25%'}}>PRODUCT</th>
                      {confirmationData.adjustmentOption === 'CORRECTION' ? (
                        <>
                          <th style={{...styles.th, width: '25%'}}>PREVIOUS STOCK</th>
                          <th style={{...styles.th, width: '25%'}}>CHANGED TO</th>
                        </>
                      ) : (
                        <th style={{...styles.th, width: '50%'}}>ACTUAL PHYSICAL STOCK</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {confirmationData.items.map((item: AdjustmentItem, idx: number) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.td}>
                          <div style={{fontWeight: 'bold'}}>{item.product_alias}</div>
                          <div style={{fontSize: 'clamp(10px, 1.1vw, 11px)', color: '#8a8a8a'}}>
                            {item.product_name}
                          </div>
                        </td>
                        {confirmationData.adjustmentOption === 'CORRECTION' ? (
                          <>
                            <td style={{...styles.td, color: '#666'}}>
                              {getPreviousFormat(item, confirmationData.stockPoint)}
                            </td>
                            <td style={{...styles.td, color: '#2196F3', fontWeight: 'bold'}}>
                              {getDisplayFormat(item, confirmationData.stockPoint)}
                            </td>
                          </>
                        ) : (
                          <td style={{...styles.td, color: '#2196F3', fontWeight: 'bold'}}>
                            {getDisplayFormat(item, confirmationData.stockPoint)}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.divider}></div>

              <div style={styles.confirmationButtons}>
                <button
                  onClick={() => setShowConfirmation(false)}
                  style={styles.cancelBtn}
                  disabled={isProcessing}
                >
                  ← BACK
                </button>
                <button
                  onClick={handleSubmitAdjustment}
                  style={styles.confirmBtn}
                  disabled={isProcessing}
                  onMouseEnter={(e) => !isProcessing && (e.currentTarget.style.backgroundColor = '#1976D2')}
                  onMouseLeave={(e) => !isProcessing && (e.currentTarget.style.backgroundColor = '#2196F3')}
                >
                  {isProcessing ? 'PROCESSING...' : '✓ CONFIRM'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={styles.contentCard}>
            <div style={styles.formSection}>
              <div style={styles.formGroup}>
                <label style={styles.label}>DATE *</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>STOCK POINT *</label>
                <select
                  value={selectedStockPoint}
                  onChange={(e) => handleStockPointChange(e.target.value)}
                  style={{...styles.select, color: selectedStockPoint ? '#1a1a1a' : '#aaa'}}
                >
                  <option value="">-- SELECT STOCK POINT --</option>
                  {STOCK_POINTS.map(point => (
                    <option key={point.id} value={point.id}>{point.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>ADJUSTMENT TYPE *</label>
                <select
                  value={selectedAdjustmentOption}
                  onChange={(e) => setSelectedAdjustmentOption(e.target.value)}
                  style={{...styles.select, color: selectedAdjustmentOption ? '#1a1a1a' : '#aaa'}}
                >
                  <option value="">-- SELECT ADJUSTMENT TYPE --</option>
                  {ADJUSTMENT_OPTIONS.map(option => (
                    <option key={option.id} value={option.id}>{option.name}</option>
                  ))}
                </select>
              </div>

              <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                <label style={styles.label}>REASON (Optional)</label>
                <textarea
                  placeholder="Reason for adjustment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value.toUpperCase())}
                  style={{...styles.input, minHeight: '60px'}}
                />
              </div>
            </div>

            {adjustmentItems.length > 0 && (
              <div style={styles.productsSection}>
                <h2 style={styles.productsTitle}>STOCK ADJUSTMENT TABLE</h2>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={{...styles.th, width: '30%'}}>PRODUCT</th>
                        {isWarehouse ? (
                          <>
                            <th style={{...styles.th, width: '20%', textAlign: 'center'}}>CASES</th>
                            <th style={{...styles.th, width: '20%', textAlign: 'center'}}>BOTTLES</th>
                          </>
                        ) : (
                          <>
                            <th style={{...styles.th, width: '20%', textAlign: 'center'}}>BOTTLES</th>
                            <th style={{...styles.th, width: '20%', textAlign: 'center'}}>PEGS</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {adjustmentItems.map((item: AdjustmentItem, idx: number) => (
                        <tr key={idx} style={styles.tableRow}>
                          <td style={styles.td}>
                            <div style={{fontWeight: 'bold', fontSize: 'clamp(11px, 1.2vw, 12px)'}}>
                              {item.product_alias}
                            </div>
                            <div style={{fontSize: 'clamp(10px, 1.1vw, 11px)', color: '#8a8a8a'}}>
                              {item.product_name}
                            </div>
                            <div style={{fontSize: '10px', color: '#aaa', marginTop: '2px'}}>
                              {item.category_name}
                            </div>
                          </td>
                          {isWarehouse ? (
                            <>
                              <td style={{...styles.td, padding: '8px 4px'}}>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.adjusted_cases}
                                  onChange={(e) => handleItemChange(idx, 'cases', e.target.value)}
                                  style={styles.tableInput}
                                />
                              </td>
                              <td style={{...styles.td, padding: '8px 4px'}}>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.adjusted_bottles}
                                  onChange={(e) => handleItemChange(idx, 'bottles', e.target.value)}
                                  style={styles.tableInput}
                                />
                              </td>
                            </>
                          ) : (
                            <>
                              <td style={{...styles.td, padding: '8px 4px'}}>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.adjusted_bottles}
                                  onChange={(e) => handleItemChange(idx, 'bottles', e.target.value)}
                                  style={styles.tableInput}
                                />
                              </td>
                              <td style={{...styles.td, padding: '8px 4px'}}>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={item.adjusted_pegs}
                                  onChange={(e) => handleItemChange(idx, 'pegs', e.target.value)}
                                  style={styles.tableInput}
                                />
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div style={styles.actionButtons}>
              <button
                onClick={() => {
                  setSelectedDate(getTodayDate());
                  setSelectedStockPoint('');
                  setSelectedAdjustmentOption('');
                  setReason('');
                  setAdjustmentItems([]);
                  setErrorMessage('');
                }}
                style={styles.resetBtn}
              >
                RESET
              </button>
              <button
                onClick={handleConfirmAdjustment}
                style={styles.submitBtn}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
              >
                CONFIRM ADJUSTMENT
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    padding: 'clamp(12px, 2.5vw, 20px)',
  } as React.CSSProperties,
  pageHeader: {
    marginBottom: 'clamp(14px, 2.5vw, 20px)',
  } as React.CSSProperties,
  pageTitle: {
    fontSize: 'clamp(18px, 3.5vw, 28px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    margin: 0,
  } as React.CSSProperties,
  successAlert: {
    backgroundColor: '#c8e6c9',
    color: '#2e7d32',
    border: '1px solid #81c784',
    borderRadius: '4px',
    padding: 'clamp(12px, 2vw, 16px)',
    marginBottom: 'clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
  } as React.CSSProperties,
  errorAlert: {
    backgroundColor: '#ffcdd2',
    color: '#c62828',
    border: '1px solid #ef5350',
    borderRadius: '4px',
    padding: 'clamp(12px, 2vw, 16px)',
    marginBottom: 'clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
  } as React.CSSProperties,
  alertText: {
    display: 'block',
    wordBreak: 'break-word',
  } as React.CSSProperties,
  contentCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 'clamp(12px, 2.5vw, 20px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  } as React.CSSProperties,
  formSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'clamp(10px, 2vw, 14px)',
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
  } as React.CSSProperties,
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.8vw, 6px)',
  } as React.CSSProperties,
  label: {
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#1a1a1a',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  input: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(10px, 1.5vw, 12px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    outline: 'none',
  } as React.CSSProperties,
  select: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(10px, 1.5vw, 12px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,
  productsSection: {
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
    paddingTop: 'clamp(12px, 2vw, 16px)',
    borderTop: '1px solid #e0e0e0',
  } as React.CSSProperties,
  productsTitle: {
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    marginBottom: 'clamp(8px, 1.5vw, 12px)',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  tableContainer: {
    overflowX: 'auto',
    marginBottom: 'clamp(8px, 1.5vw, 12px)',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
  } as React.CSSProperties,
  tableHeader: {
    backgroundColor: '#f8f8f8',
    borderBottom: '2px solid #e0e0e0',
  } as React.CSSProperties,
  th: {
    padding: 'clamp(10px, 1.6vw, 14px)',
    textAlign: 'left',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#1a1a1a',
  } as React.CSSProperties,
  tableRow: {
    borderBottom: '1px solid #e0e0e0',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  td: {
    padding: 'clamp(10px, 1.6vw, 14px)',
    color: '#595959',
  } as React.CSSProperties,
  tableInput: {
    width: '100%',
    padding: '6px 4px',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    border: '1px solid #2196F3',
    backgroundColor: '#f0f8ff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    outline: 'none',
    textAlign: 'center',
  } as React.CSSProperties,
  actionButtons: {
    display: 'flex',
    gap: 'clamp(10px, 1.5vw, 12px)',
    justifyContent: 'flex-end',
    paddingTop: 'clamp(12px, 2vw, 16px)',
    borderTop: '1px solid #e0e0e0',
    flexWrap: 'wrap',
  } as React.CSSProperties,
  resetBtn: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(16px, 2.2vw, 20px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#1a1a1a',
    backgroundColor: '#e0e0e0',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,
  submitBtn: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(16px, 2.2vw, 20px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,
  confirmationSection: {
    padding: 'clamp(12px, 2vw, 16px)',
  } as React.CSSProperties,
  confirmationTitle: {
    fontSize: 'clamp(14px, 1.5vw, 15px)',
    fontWeight: 'bold',
    marginBottom: 'clamp(12px, 2vw, 16px)',
    color: '#ff6f00',
  } as React.CSSProperties,
  confirmationDetails: {
    backgroundColor: '#f8f8f8',
    padding: 'clamp(12px, 2vw, 16px)',
    borderRadius: '4px',
    marginBottom: 'clamp(12px, 2vw, 16px)',
  } as React.CSSProperties,
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
  } as React.CSSProperties,
  detailLabel: {
    fontWeight: 'bold',
    color: '#1a1a1a',
  } as React.CSSProperties,
  detailValue: {
    color: '#595959',
    textAlign: 'right',
    flex: 1,
  } as React.CSSProperties,
  divider: {
    borderTop: '1px solid #e0e0e0',
    margin: 'clamp(12px, 2vw, 16px) 0',
  } as React.CSSProperties,
  itemsTitle: {
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    fontWeight: 'bold',
    marginBottom: 'clamp(8px, 1.5vw, 12px)',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  confirmationButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: 'clamp(16px, 2.5vw, 24px)',
    paddingTop: 'clamp(12px, 2vw, 16px)',
    borderTop: '1px solid #e0e0e0',
  } as React.CSSProperties,
  cancelBtn: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(16px, 2.2vw, 20px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#1a1a1a',
    backgroundColor: '#e0e0e0',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,
  confirmBtn: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(16px, 2.2vw, 20px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,
};