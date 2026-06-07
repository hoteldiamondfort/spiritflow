'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

const STOCK_POINTS = [
  { id: 'warehouse', name: 'WAREHOUSE' },
  { id: 'druvam', name: 'DRUVAM' },
  { id: 'spadikam', name: 'SPADIKAM' }
];

interface TransferItem {
  id: string;
  product_id: string;
  product_name: string;
  product_alias: string;
  quantity_ml: number;
}

interface Product {
  product_id: string;
  product_name: string;
  product_alias: string;
  category_name: string;
}

export default function StockTransferPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Form state
  const [fromStockPoint, setFromStockPoint] = useState('warehouse');
  const [toStockPoint, setToStockPoint] = useState('druvam');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  // Transfer items (cart)
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchProducts();
  }, [router]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      if (data.status === 'success') {
        setProducts(data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search term
  const filteredProducts = searchTerm.trim() === ''
    ? []
    : products.filter(p =>
        p.product_name.toUpperCase().includes(searchTerm.toUpperCase()) ||
        p.product_alias.toUpperCase().includes(searchTerm.toUpperCase())
      ).sort((a, b) => a.product_name.localeCompare(b.product_name));

  const handleAddProduct = (product: Product) => {
    if (!selectedQuantity || parseFloat(selectedQuantity) <= 0) {
      alert('Please enter valid quantity');
      return;
    }

    // Check if product already in cart
    const exists = transferItems.find(item => item.product_id === product.product_id);
    if (exists) {
      alert('Product already added. Please remove and add again with new quantity.');
      return;
    }

    const newItem: TransferItem = {
      id: `${product.product_id}-${Date.now()}`,
      product_id: product.product_id,
      product_name: product.product_name,
      product_alias: product.product_alias,
      quantity_ml: parseFloat(selectedQuantity)
    };

    setTransferItems([...transferItems, newItem]);
    setSearchTerm('');
    setSelectedQuantity('');
    setShowDropdown(false);
  };

  const handleRemoveItem = (id: string) => {
    setTransferItems(transferItems.filter(item => item.id !== id));
  };

  const handleTransfer = async () => {
    // Validation
    if (fromStockPoint === toStockPoint) {
      alert('FROM and TO stock points cannot be the same');
      return;
    }

    if (transferItems.length === 0) {
      alert('Please add at least one product to transfer');
      return;
    }

    if (!referenceId.trim()) {
      alert('Reference ID is required');
      return;
    }

    // Show summary
    const totalQuantity = transferItems.reduce((sum, item) => sum + item.quantity_ml, 0);
    const summary = `
Transfer Summary:
FROM: ${STOCK_POINTS.find(s => s.id === fromStockPoint)?.name}
TO: ${STOCK_POINTS.find(s => s.id === toStockPoint)?.name}

Products:
${transferItems.map(item => `- ${item.product_alias}: ${item.quantity_ml} ML`).join('\n')}

Total Quantity: ${totalQuantity} ML
Reference ID: ${referenceId}
Notes: ${notes || 'None'}

Ready to confirm?
    `;

    if (confirm(summary)) {
      // TODO: Call API when ready
      alert('Stock Transfer API will be called here!');
      console.log('Transfer data:', {
        fromStockPoint,
        toStockPoint,
        referenceId,
        notes,
        items: transferItems
      });
    }
  };

  const totalQuantity = transferItems.reduce((sum, item) => sum + item.quantity_ml, 0);

  return (
    <DashboardLayout user={user}>
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>STOCK TRANSFER</h1>
        </div>

        <div style={styles.contentCard}>
          <div style={styles.formSection}>
            {/* Stock Points Selection */}
            <div style={styles.locationRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>FROM STOCK POINT *</label>
                <select 
                  value={fromStockPoint} 
                  onChange={(e) => setFromStockPoint(e.target.value)}
                  style={styles.select}
                >
                  {STOCK_POINTS.map(point => (
                    <option key={point.id} value={point.id}>{point.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.arrowContainer}>
                <span style={styles.arrow}>→</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>TO STOCK POINT *</label>
                <select 
                  value={toStockPoint} 
                  onChange={(e) => setToStockPoint(e.target.value)}
                  style={styles.select}
                >
                  {STOCK_POINTS.map(point => (
                    <option key={point.id} value={point.id}>{point.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Search and Add */}
            <div style={styles.searchSection}>
              <div style={styles.formGroup}>
                <label style={styles.label}>PRODUCT *</label>
                <div style={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="TYPE TO SEARCH (e.g., KF, AMSTEL)..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    style={styles.searchInput}
                  />
                  
                  {showDropdown && searchTerm && filteredProducts.length > 0 && (
                    <div style={styles.dropdown}>
                      {filteredProducts.slice(0, 10).map(product => (
                        <div 
                          key={product.product_id}
                          onClick={() => {
                            setSearchTerm('');
                            setShowDropdown(false);
                            // Product selected, now wait for quantity input
                          }}
                          style={styles.dropdownItem}
                        >
                          <div style={styles.productName}>{product.product_name}</div>
                          <div style={styles.productAlias}>{product.product_alias}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.quantityAddSection}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>QUANTITY (ML) *</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={selectedQuantity}
                    onChange={(e) => setSelectedQuantity(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <button
                  onClick={() => {
                    if (!searchTerm) {
                      alert('Please search and select a product first');
                      return;
                    }
                    const selected = filteredProducts.find(p =>
                      p.product_name.toUpperCase() === searchTerm.toUpperCase() ||
                      p.product_alias.toUpperCase() === searchTerm.toUpperCase()
                    );
                    if (selected) {
                      handleAddProduct(selected);
                    } else {
                      alert('Please select a product from the dropdown');
                    }
                  }}
                  style={styles.addBtn}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
                >
                  + ADD
                </button>
              </div>
            </div>

            {/* Transfer Items Table */}
            {transferItems.length > 0 && (
              <div style={styles.tableSection}>
                <div style={styles.tableHeader}>PRODUCTS TO TRANSFER</div>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>PRODUCT NAME</th>
                        <th style={styles.th}>ALIAS</th>
                        <th style={styles.th}>QUANTITY (ML)</th>
                        <th style={styles.th}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferItems.map((item) => (
                        <tr key={item.id} style={styles.tableRow}>
                          <td style={styles.td}>{item.product_name}</td>
                          <td style={styles.td}>{item.product_alias}</td>
                          <td style={styles.td}>{item.quantity_ml}</td>
                          <td style={styles.td}>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              style={styles.removeBtn}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#C62828'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#E53935'}
                            >
                              REMOVE
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={styles.totalRow}>
                  TOTAL QUANTITY: {totalQuantity} ML
                </div>
              </div>
            )}

            {/* Reference and Notes */}
            <div style={styles.detailsSection}>
              <div style={styles.formGroup}>
                <label style={styles.label}>REFERENCE ID *</label>
                <input
                  type="text"
                  placeholder="e.g., TRANSFER-001, PO-123"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>NOTES</label>
                <textarea
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.toUpperCase())}
                  style={{...styles.input, minHeight: '80px'}}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={styles.actionButtons}>
            <button
              onClick={() => {
                setFromStockPoint('warehouse');
                setToStockPoint('druvam');
                setSearchTerm('');
                setSelectedQuantity('');
                setReferenceId('');
                setNotes('');
                setTransferItems([]);
              }}
              style={styles.cancelBtn}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d0d0d0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
            >
              CANCEL
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferItems.length === 0}
              style={{...styles.transferBtn, opacity: transferItems.length === 0 ? 0.5 : 1}}
              onMouseEnter={(e) => transferItems.length > 0 && (e.currentTarget.style.backgroundColor = '#1976D2')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
            >
              CONFIRM TRANSFER
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    padding: 'clamp(16px, 3vw, 24px)',
  } as React.CSSProperties,

  pageHeader: {
    marginBottom: 'clamp(16px, 3vw, 24px)',
  } as React.CSSProperties,

  pageTitle: {
    fontSize: 'clamp(18px, 3.5vw, 28px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    margin: 0,
  } as React.CSSProperties,

  contentCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 'clamp(16px, 3vw, 24px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  } as React.CSSProperties,

  formSection: {
    marginBottom: 'clamp(20px, 3vw, 28px)',
  } as React.CSSProperties,

  locationRow: {
    display: 'flex',
    gap: 'clamp(12px, 2vw, 16px)',
    alignItems: 'flex-end',
    marginBottom: 'clamp(20px, 3vw, 28px)',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    minWidth: '200px',
  } as React.CSSProperties,

  label: {
    fontSize: 'clamp(10px, 1.2vw, 11px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  select: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    outline: 'none',
    cursor: 'pointer',
  } as React.CSSProperties,

  arrowContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    marginBottom: '6px',
  } as React.CSSProperties,

  arrow: {
    fontSize: 'clamp(18px, 3vw, 24px)',
    color: '#2196F3',
    fontWeight: 'bold',
  } as React.CSSProperties,

  searchSection: {
    marginBottom: 'clamp(20px, 3vw, 28px)',
  } as React.CSSProperties,

  searchContainer: {
    position: 'relative',
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    outline: 'none',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    borderTop: 'none',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 100,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,

  dropdownItem: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  productName: {
    fontSize: 'clamp(10px, 1.2vw, 11px)',
    fontWeight: 'bold',
    color: '#1a1a1a',
  } as React.CSSProperties,

  productAlias: {
    fontSize: 'clamp(9px, 1.1vw, 10px)',
    color: '#8a8a8a',
  } as React.CSSProperties,

  quantityAddSection: {
    display: 'flex',
    gap: 'clamp(12px, 2vw, 16px)',
    alignItems: 'flex-end',
    marginTop: 'clamp(16px, 2vw, 20px)',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  input: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(12px, 2vw, 16px)',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    outline: 'none',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  addBtn: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(16px, 2vw, 20px)',
    fontSize: 'clamp(10px, 1.2vw, 11px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  tableSection: {
    marginBottom: 'clamp(20px, 3vw, 28px)',
  } as React.CSSProperties,

  tableHeader: {
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
    marginBottom: 'clamp(12px, 2vw, 16px)',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  tableContainer: {
    overflowX: 'auto',
    marginBottom: 'clamp(12px, 2vw, 16px)',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'clamp(10px, 1.2vw, 11px)',
  } as React.CSSProperties,

  tableHeaderRow: {
    backgroundColor: '#f8f8f8',
    borderBottom: '2px solid #e0e0e0',
  } as React.CSSProperties,

  th: {
    padding: 'clamp(10px, 2vw, 14px)',
    textAlign: 'left',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
  } as React.CSSProperties,

  tableRow: {
    borderBottom: '1px solid #e0e0e0',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  td: {
    padding: 'clamp(10px, 2vw, 14px)',
    color: '#595959',
  } as React.CSSProperties,

  removeBtn: {
    padding: 'clamp(6px, 1vw, 8px) clamp(10px, 1.5vw, 14px)',
    fontSize: 'clamp(9px, 1.1vw, 10px)',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    color: '#ffffff',
    backgroundColor: '#E53935',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  totalRow: {
    textAlign: 'right',
    fontSize: 'clamp(11px, 1.3vw, 12px)',
    fontWeight: 'bold',
    color: '#1a1a1a',
    padding: 'clamp(12px, 2vw, 16px)',
    backgroundColor: '#f8f8f8',
    borderTop: '1px solid #e0e0e0',
  } as React.CSSProperties,

  detailsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: 'clamp(12px, 2vw, 16px)',
  } as React.CSSProperties,

  actionButtons: {
    display: 'flex',
    gap: 'clamp(12px, 2vw, 16px)',
    justifyContent: 'flex-end',
    paddingTop: 'clamp(16px, 2vw, 20px)',
    borderTop: '1px solid #e0e0e0',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  cancelBtn: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(20px, 2vw, 24px)',
    fontSize: 'clamp(10px, 1.2vw, 11px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#1a1a1a',
    backgroundColor: '#e0e0e0',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  transferBtn: {
    padding: 'clamp(8px, 1.5vw, 12px) clamp(20px, 2vw, 24px)',
    fontSize: 'clamp(10px, 1.2vw, 11px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
  } as React.CSSProperties,
};