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
  ml_per_bottle: number;
  bottles_per_case: number;
  cases: number;
  bottles: number;
  total_ml: number;
}

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

export default function StockTransferPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockData, setStockData] = useState<{[key: string]: StockData}>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Form state
  const [fromStockPoint, setFromStockPoint] = useState('warehouse');
  const [toStockPoint, setToStockPoint] = useState('druvam');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCases, setSelectedCases] = useState('');
  const [selectedBottles, setSelectedBottles] = useState('');
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
    fetchProductsAndStock();
  }, [router]);

  // Fetch products and all stock in ONE call
  const fetchProductsAndStock = async () => {
    try {
      setLoading(true);
      
      // Fetch products
      const productsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const productsData = await productsResponse.json();
      
      // Fetch all stock
      const stockResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stock/total`, {
        headers: { 'Content-Type': 'application/json' }
      });
      const stockDataResponse = await stockResponse.json();

      if (productsData.status === 'success') {
        setProducts(productsData.data);
      }

      if (stockDataResponse.status === 'success') {
        // Create lookup map: { product_id → stock data }
        const stockMap: {[key: string]: StockData} = {};
        stockDataResponse.data.forEach((stock: StockData) => {
          stockMap[stock.product_id] = stock;
        });
        setStockData(stockMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
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
      ).sort((a, b) => a.product_alias.localeCompare(b.product_alias));

  // Helper function to convert cases + bottles to ML
  const convertToML = (product: Product, cases: number, bottles: number): number => {
    const casesML = cases * product.bottles_per_case * product.ml_per_bottle;
    const bottlesML = bottles * product.ml_per_bottle;
    return casesML + bottlesML;
  };

  // Helper function to convert ML to cases + bottles
  const convertFromML = (product: Product, totalML: number) => {
    const totalBottles = Math.floor(totalML / product.ml_per_bottle);
    const cases = Math.floor(totalBottles / product.bottles_per_case);
    const bottles = totalBottles % product.bottles_per_case;
    return { cases, bottles };
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.product_alias);
    setShowDropdown(false);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      alert('Please select a product first');
      return;
    }

    const cases = parseInt(selectedCases) || 0;
    const bottles = parseInt(selectedBottles) || 0;

    if (cases === 0 && bottles === 0) {
      alert('Please enter cases or bottles');
      return;
    }

    // Check if product already in cart
    const exists = transferItems.find(item => item.product_id === selectedProduct.product_id);
    if (exists) {
      alert('Product already added. Please remove and add again with new quantity.');
      return;
    }

    // Validate against available stock
    const stock = stockData[selectedProduct.product_id];
    const requestedML = convertToML(selectedProduct, cases, bottles);
    
    if (requestedML > stock.total_quantity_ml) {
      alert(
        `Insufficient stock! Requested: ${requestedML} ML, Available: ${stock.total_quantity_ml} ML`
      );
      return;
    }

    const totalML = convertToML(selectedProduct, cases, bottles);

    const newItem: TransferItem = {
      id: `${selectedProduct.product_id}-${Date.now()}`,
      product_id: selectedProduct.product_id,
      product_name: selectedProduct.product_name,
      product_alias: selectedProduct.product_alias,
      ml_per_bottle: selectedProduct.ml_per_bottle,
      bottles_per_case: selectedProduct.bottles_per_case,
      cases,
      bottles,
      total_ml: totalML
    };

    setTransferItems([...transferItems, newItem]);
    setSearchTerm('');
    setSelectedProduct(null);
    setSelectedCases('');
    setSelectedBottles('');
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

    // Show summary
    const totalQuantity = transferItems.reduce((sum, item) => sum + item.total_ml, 0);
    const summary = `
Transfer Summary:
FROM: ${STOCK_POINTS.find(s => s.id === fromStockPoint)?.name}
TO: ${STOCK_POINTS.find(s => s.id === toStockPoint)?.name}

Products:
${transferItems.map(item => `- ${item.product_alias}: ${item.cases} case(s) + ${item.bottles} bottle(s) (${item.total_ml} ML)`).join('\n')}

Total Quantity: ${totalQuantity} ML
Reference ID: ${referenceId || 'Not provided'}
Notes: ${notes || 'None'}

Ready to confirm?
    `;

    if (confirm(summary)) {
      // TODO: Call API when ready
      alert('Stock Transfer API will be called here!');
      console.log('Transfer data:', {
        from_stock_point_id: fromStockPoint,
        to_stock_point_id: toStockPoint,
        reference_id: referenceId || null,
        notes: notes || null,
        items: transferItems.map(item => ({
          product_id: item.product_id,
          quantity_ml: item.total_ml
        }))
      });
    }
  };

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
              <div style={{...styles.formGroup, width: '100%'}}>
                <label style={styles.label}>PRODUCT *</label>
                <div style={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="TYPE TO SEARCH (e.g., KF, AMSTEL)..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                      setSelectedProduct(null);
                    }}
                    onFocus={() => {
                      if (searchTerm) setShowDropdown(true);
                    }}
                    style={styles.searchInput}
                  />
                  
                  {showDropdown && searchTerm && filteredProducts.length > 0 && (
                    <div style={styles.dropdown}>
                      {filteredProducts.slice(0, 10).map(product => {
                        const stock = stockData[product.product_id];
                        const { cases, bottles } = convertFromML(product, stock?.total_quantity_ml || 0);
                        
                        return (
                          <div 
                            key={product.product_id}
                            onClick={() => handleSelectProduct(product)}
                            style={styles.dropdownItem}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                          >
                            <div style={styles.productName}>{product.product_alias}</div>
                            <div style={styles.productAlias}>
                              {product.product_name}
                            </div>
                            {stock && (
                              <div style={styles.stockInfo}>
                                {cases} Cases, {bottles} Bottles Available in {Object.entries(stock.breakdown)
                                  .filter(([_, qty]) => qty > 0)
                                  .map(([point]) => point.charAt(0).toUpperCase() + point.slice(1))
                                  .join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {selectedProduct && (
                    <div style={styles.selectedProductInfo}>
                      <span style={{fontSize: 'clamp(11px, 1.2vw, 12px)'}}>
                        ✓ {selectedProduct.product_alias} selected
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.quantitySection}>
                <div style={styles.quantityInputsRow}>
                  <div style={{...styles.formGroup, flex: 1}}>
                    <label style={styles.label}>CASES</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={selectedCases}
                      onChange={(e) => setSelectedCases(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <div style={{...styles.formGroup, flex: 1}}>
                    <label style={styles.label}>BOTTLES</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={selectedBottles}
                      onChange={(e) => setSelectedBottles(e.target.value)}
                      style={styles.input}
                    />
                  </div>

                  <button
                    onClick={handleAddProduct}
                    style={styles.addBtn}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
                  >
                    + ADD
                  </button>
                </div>
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
                        <th style={styles.th}>PRODUCT</th>
                        <th style={styles.th}>CASES</th>
                        <th style={styles.th}>BOTTLES</th>
                        <th style={styles.th}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferItems.map((item) => (
                        <tr key={item.id} style={styles.tableRow}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f8f8'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                          <td style={styles.td}>
                            <div style={{fontWeight: 'bold', color: '#1a1a1a'}}>
                              {item.product_alias}
                            </div>
                            <div style={{fontSize: 'clamp(10px, 1.1vw, 11px)', color: '#8a8a8a'}}>
                              {item.product_name}
                            </div>
                          </td>
                          <td style={styles.td}>{item.cases}</td>
                          <td style={styles.td}>{item.bottles}</td>
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
              </div>
            )}

            {/* Reference and Notes */}
            <div style={styles.detailsSection}>
              <div style={styles.formGroup}>
                <label style={styles.label}>REFERENCE ID</label>
                <input
                  type="text"
                  placeholder="e.g., TRANSFER-001, PO-123"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                  style={styles.input}
                />
              </div>

              <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                <label style={styles.label}>NOTES</label>
                <textarea
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.toUpperCase())}
                  style={{...styles.input, minHeight: '60px'}}
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
                setSelectedProduct(null);
                setSelectedCases('');
                setSelectedBottles('');
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

  contentCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 'clamp(12px, 2.5vw, 20px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  } as React.CSSProperties,

  formSection: {
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
  } as React.CSSProperties,

  locationRow: {
    display: 'flex',
    gap: 'clamp(8px, 1.5vw, 12px)',
    alignItems: 'flex-end',
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.8vw, 6px)',
    flex: 1,
    minWidth: 'clamp(140px, 30%, 200px)',
  } as React.CSSProperties,

  label: {
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#1a1a1a',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  select: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(10px, 1.5vw, 12px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
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
    marginBottom: 'clamp(4px, 0.8vw, 6px)',
  } as React.CSSProperties,

  arrow: {
    fontSize: 'clamp(18px, 2.8vw, 22px)',
    color: '#2196F3',
    fontWeight: 'bold',
  } as React.CSSProperties,

  searchSection: {
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
  } as React.CSSProperties,

  searchContainer: {
    position: 'relative',
  } as React.CSSProperties,

  searchInput: {
    width: '100%',
    padding: 'clamp(8px, 1.4vw, 12px) clamp(10px, 1.5vw, 12px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
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
    maxHeight: '400px',
    overflowY: 'auto',
    zIndex: 100,
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,

  dropdownItem: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(10px, 1.5vw, 12px)',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,

  productName: {
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    color: '#1a1a1a',
  } as React.CSSProperties,

  productAlias: {
    fontSize: 'clamp(10px, 1.1vw, 11px)',
    color: '#8a8a8a',
    marginBottom: '4px',
  } as React.CSSProperties,

  stockInfo: {
    fontSize: 'clamp(9px, 1vw, 10px)',
    color: '#2e7d32',
    fontWeight: 'bold',
    marginTop: '4px',
    padding: '4px 0',
    borderTop: '1px solid #e0e0e0',
  } as React.CSSProperties,

  selectedProductInfo: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(10px, 1.5vw, 12px)',
    marginTop: '4px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '3px',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
  } as React.CSSProperties,

  quantitySection: {
    marginTop: 'clamp(12px, 2vw, 16px)',
  } as React.CSSProperties,

  quantityInputsRow: {
    display: 'flex',
    gap: 'clamp(8px, 1.5vw, 12px)',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  input: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(10px, 1.5vw, 12px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    color: '#1a1a1a',
    outline: 'none',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  addBtn: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(14px, 2vw, 18px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,

  tableSection: {
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
  } as React.CSSProperties,

  tableHeader: {
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#1a1a1a',
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

  tableHeaderRow: {
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

  removeBtn: {
    padding: 'clamp(6px, 1vw, 8px) clamp(10px, 1.4vw, 12px)',
    fontSize: 'clamp(10px, 1.1vw, 11px)',
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

  detailsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'clamp(10px, 2vw, 14px)',
  } as React.CSSProperties,

  actionButtons: {
    display: 'flex',
    gap: 'clamp(10px, 1.5vw, 12px)',
    justifyContent: 'flex-end',
    paddingTop: 'clamp(12px, 2vw, 16px)',
    borderTop: '1px solid #e0e0e0',
    flexWrap: 'wrap',
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

  transferBtn: {
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