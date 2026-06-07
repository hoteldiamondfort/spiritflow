'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

const STOCK_POINTS = [
  { id: 'warehouse', name: 'WAREHOUSE' },
  { id: 'druvam', name: 'DRUVAM' },
  { id: 'spadikam', name: 'SPADIKAM' }
];

const PEG_SIZE_ML = 60; // 1 peg = 60ml

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

type StockPointId = 'warehouse' | 'druvam' | 'spadikam';

export default function StockTransferPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockData, setStockData] = useState<{[key: string]: StockData}>({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Form state
  const [fromStockPoint, setFromStockPoint] = useState<StockPointId>('warehouse');
  const [toStockPoint, setToStockPoint] = useState<StockPointId>('druvam');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCases, setSelectedCases] = useState('');
  const [selectedBottles, setSelectedBottles] = useState('');
  const [selectedPegs, setSelectedPegs] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  // Transfer items (cart)
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);

  // Message states
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Report state
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

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

  const filteredProducts = searchTerm.trim() === ''
    ? []
    : products.filter(p =>
        p.product_name.toUpperCase().includes(searchTerm.toUpperCase()) ||
        p.product_alias.toUpperCase().includes(searchTerm.toUpperCase())
      ).sort((a, b) => a.product_alias.localeCompare(b.product_alias));

  const getFromLocationStock = (productId: string): number => {
    const stock = stockData[productId];
    if (!stock) return 0;
    return stock.breakdown[fromStockPoint as StockPointId] || 0;
  };

  // Convert cases + bottles + pegs to ML
  const convertToML = (product: Product, cases: number, bottles: number, pegs: number): number => {
    const casesML = cases * product.bottles_per_case * product.ml_per_bottle;
    const bottlesML = bottles * product.ml_per_bottle;
    const pegsML = pegs * PEG_SIZE_ML;
    return casesML + bottlesML + pegsML;
  };

  // Convert ML to cases + bottles + pegs (with peg rounding to 0.5)
  const convertFromML = (product: Product, totalML: number) => {
    const totalBottles = Math.floor(totalML / product.ml_per_bottle);
    const cases = Math.floor(totalBottles / product.bottles_per_case);
    const bottles = totalBottles % product.bottles_per_case;
    
    // Remaining ML after cases and bottles
    const remainingML = totalML - (cases * product.bottles_per_case * product.ml_per_bottle) - (bottles * product.ml_per_bottle);
    
    // Convert to pegs and round down to nearest 0.5
    const pegsExact = remainingML / PEG_SIZE_ML;
    const pegs = Math.floor(pegsExact * 2) / 2; // Round down to nearest 0.5
    
    return { cases, bottles, pegs };
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setSearchTerm(product.product_alias);
    setShowDropdown(false);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) {
      setErrorMessage('Please select a product first');
      return;
    }

    const cases = parseInt(selectedCases) || 0;
    const bottles = parseInt(selectedBottles) || 0;
    const pegs = parseFloat(selectedPegs) || 0;

    if (cases === 0 && bottles === 0 && pegs === 0) {
      setErrorMessage('Please enter cases, bottles, or pegs');
      return;
    }

    const exists = transferItems.find(item => item.product_id === selectedProduct.product_id);
    if (exists) {
      setErrorMessage('Product already added. Please remove and add again with new quantity.');
      return;
    }

    const fromLocationStock = getFromLocationStock(selectedProduct.product_id);
    const requestedML = convertToML(selectedProduct, cases, bottles, pegs);
    
    if (requestedML > fromLocationStock) {
      setErrorMessage(`Insufficient stock for ${selectedProduct.product_alias}`);
      return;
    }

    const totalML = convertToML(selectedProduct, cases, bottles, pegs);

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
    setSelectedPegs('');
    setShowDropdown(false);
    setErrorMessage('');
  };

  const handleRemoveItem = (id: string) => {
    setTransferItems(transferItems.filter(item => item.id !== id));
  };

  const formatDateTime = () => {
    const now = new Date();
    return now.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateTotals = (items: TransferItem[], product: Product) => {
    let totalCases = 0;
    let totalBottles = 0;
    let totalPegs = 0;

    items.forEach(item => {
      const { cases, bottles, pegs } = convertFromML(product, item.total_ml);
      totalCases += cases;
      totalBottles += bottles;
      totalPegs += pegs;
    });

    return { totalCases, totalBottles, totalPegs };
  };

  const handleTransfer = async () => {
    if (fromStockPoint === toStockPoint) {
      setErrorMessage('FROM and TO stock points cannot be the same');
      return;
    }

    if (transferItems.length === 0) {
      setErrorMessage('Please add at least one product to transfer');
      return;
    }

    const now = new Date();
    const dateTime = formatDateTime();

    const summary = `
STOCK TRANSFER CONFIRMATION
═══════════════════════════════════════

FROM: ${STOCK_POINTS.find(s => s.id === fromStockPoint)?.name}
TO: ${STOCK_POINTS.find(s => s.id === toStockPoint)?.name}

DATE & TIME: ${dateTime}

PRODUCTS:
${transferItems.map(item => {
  const product = products.find(p => p.product_id === item.product_id);
  if (!product) return '';
  const { cases, bottles, pegs } = convertFromML(product, item.total_ml);
  return `• ${item.product_alias} - ${cases} case(s) + ${bottles} bottle(s) + ${pegs} peg(s)`;
}).join('\n')}

Reference ID: ${referenceId || 'None'}
Notes: ${notes || 'None'}

═══════════════════════════════════════
Ready to confirm?
    `;

    if (!confirm(summary)) {
      return;
    }

    try {
      setIsTransferring(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stock-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: transferItems.map(item => ({
            product_id: item.product_id,
            quantity_ml: item.total_ml
          })),
          from_stock_point_id: fromStockPoint,
          to_stock_point_id: toStockPoint,
          reference_id: referenceId || null,
          notes: notes || null,
          created_by: user?.auth_id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Transfer failed');
      }

      // Get display name
      const transferredBy = user?.display_name || user?.email || user?.auth_id || 'Unknown';

      // ✅ SUCCESS - Generate Report with Live Data
      const reportItems = transferItems.map(item => {
        const product = products.find(p => p.product_id === item.product_id);
        if (!product) return null;
        const { cases, bottles, pegs } = convertFromML(product, item.total_ml);
        return { ...item, cases, bottles, pegs };
      }).filter(Boolean);

      const report = {
        from_stock_point: fromStockPoint,
        to_stock_point: toStockPoint,
        date_time: dateTime,
        reference_id: referenceId || 'N/A',
        notes: notes || 'N/A',
        created_by: transferredBy,
        items: reportItems,
        total_items: transferItems.length,
        transaction_ids: data.data.transaction_ids
      };

      setReportData(report);
      setShowReport(true);

      setSuccessMessage(
        `✅ Transfer successful! ${transferItems.length} product(s) transferred.`
      );

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (error) {
      setErrorMessage(`❌ Error: ${error instanceof Error ? error.message : 'Transfer failed'}`);
      console.error('Transfer error:', error);
    } finally {
      setIsTransferring(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('print-report');
    if (!printContent) return;

    const printWindow = window.open('', '', 'width=900,height=1200');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Stock Transfer Report</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: "Courier New", Courier, monospace;
            color: #1a1a1a;
            padding: 20px;
            background: white;
          }
          .report-container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
          }
          .report-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 20px;
          }
          .report-title {
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 8px;
          }
          .report-subtitle {
            font-size: 12px;
            color: #8a8a8a;
          }
          .report-details {
            background: #f8f8f8;
            padding: 16px;
            margin-bottom: 24px;
            border-radius: 4px;
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 12px;
          }
          .detail-label {
            font-weight: bold;
            min-width: 140px;
            color: #1a1a1a;
          }
          .detail-value {
            flex: 1;
            text-align: right;
            color: #595959;
          }
          .divider {
            border-top: 2px solid #e0e0e0;
            margin: 24px 0;
          }
          .table-section {
            margin-bottom: 24px;
          }
          .table-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 16px;
            letter-spacing: 0.8px;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          thead {
            background: #f0f0f0;
            border-bottom: 2px solid #e0e0e0;
          }
          th {
            padding: 14px;
            text-align: left;
            font-weight: bold;
            letter-spacing: 0.5px;
          }
          td {
            padding: 14px;
            color: #595959;
            border-bottom: 1px solid #e0e0e0;
          }
          .product-name {
            font-weight: bold;
            color: #1a1a1a;
            font-size: 12px;
          }
          .product-desc {
            font-size: 11px;
            color: #8a8a8a;
            margin-top: 4px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 16px;
            border-top: 1px solid #e0e0e0;
          }
          .footer-text {
            font-size: 11px;
            color: #8a8a8a;
            margin: 6px 0;
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  const handleCloseReport = () => {
    setShowReport(false);
    setFromStockPoint('warehouse');
    setToStockPoint('druvam');
    setSearchTerm('');
    setSelectedProduct(null);
    setSelectedCases('');
    setSelectedBottles('');
    setSelectedPegs('');
    setReferenceId('');
    setNotes('');
    setTransferItems([]);
    setReportData(null);
    fetchProductsAndStock();
  };

  const dropdownsDisabled = transferItems.length > 0 || isTransferring;

  // ========================================
  // REPORT VIEW
  // ========================================
  if (showReport && reportData) {
    return (
      <DashboardLayout user={user}>
        <div style={styles.container}>
          {/* Print Button */}
          <div style={styles.printButtonContainer} className="no-print">
            <button 
              onClick={handlePrint}
              style={styles.printBtn}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
            >
              🖨️ PRINT REPORT
            </button>
            <button 
              onClick={handleCloseReport}
              style={styles.closeBtn}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d0d0d0'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e0e0e0'}
            >
              CLOSE & NEW TRANSFER
            </button>
          </div>

          {/* Report Content */}
          <div id="print-report" style={styles.reportContainer}>
            {/* Header */}
            <div style={styles.reportHeader}>
              <h1 style={styles.reportTitle}>STOCK TRANSFER REPORT</h1>
              <p style={styles.reportSubtitle}>Hotel Diamond Fort - WMS</p>
            </div>

            {/* Details */}
            <div style={styles.reportDetails}>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>FROM:</span>
                <span style={styles.detailValue}>{STOCK_POINTS.find(s => s.id === reportData.from_stock_point)?.name}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>TO:</span>
                <span style={styles.detailValue}>{STOCK_POINTS.find(s => s.id === reportData.to_stock_point)?.name}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>DATE & TIME:</span>
                <span style={styles.detailValue}>{reportData.date_time}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>REFERENCE ID:</span>
                <span style={styles.detailValue}>{reportData.reference_id}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>TRANSFERRED BY:</span>
                <span style={styles.detailValue}>{reportData.created_by}</span>
              </div>
              {reportData.notes !== 'N/A' && (
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>NOTES:</span>
                  <span style={styles.detailValue}>{reportData.notes}</span>
                </div>
              )}
            </div>

            <div style={styles.reportDivider}></div>

            {/* Items Table */}
            <div style={styles.reportTableSection}>
              <h2 style={styles.reportTableTitle}>PRODUCTS TRANSFERRED</h2>
              <div style={styles.reportTableContainer}>
                <table style={styles.reportTable}>
                  <thead>
                    <tr style={styles.reportTableHeader}>
                      <th style={{...styles.reportTh, width: '35%'}}>PRODUCT</th>
                      <th style={{...styles.reportTh, width: '15%', textAlign: 'center'}}>CASES</th>
                      <th style={{...styles.reportTh, width: '15%', textAlign: 'center'}}>BOTTLES</th>
                      <th style={{...styles.reportTh, width: '15%', textAlign: 'center'}}>PEGS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.items.map((item: any, idx: number) => (
                      <tr key={idx} style={styles.reportTableRow}>
                        <td style={styles.reportTd}>
                          <div style={styles.reportProductName}>{item.product_alias}</div>
                          <div style={styles.reportProductDesc}>{item.product_name}</div>
                        </td>
                        <td style={{...styles.reportTd, textAlign: 'center'}}>{item.cases}</td>
                        <td style={{...styles.reportTd, textAlign: 'center'}}>{item.bottles}</td>
                        <td style={{...styles.reportTd, textAlign: 'center'}}>{item.pegs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div style={styles.reportTotals}>
              <div style={styles.reportTotalRow}>
                <span style={styles.reportTotalLabel}>TOTAL ITEMS:</span>
                <span style={styles.reportTotalValue}>{reportData.total_items}</span>
              </div>
            </div>

            <div style={styles.reportDivider}></div>

            {/* Footer */}
            <div style={styles.reportFooter}>
              <p style={styles.reportFooterText}>
                Report Generated: {formatDateTime()}
              </p>
              <p style={styles.reportFooterText}>
                This is an official Stock Transfer Report. Please retain for records.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ========================================
  // TRANSFER FORM VIEW
  // ========================================
  return (
    <DashboardLayout user={user}>
      <div style={styles.container}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>STOCK TRANSFER</h1>
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

        <div style={styles.contentCard}>
          <div style={styles.formSection}>
            {/* Stock Points Selection */}
            <div style={styles.locationRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>FROM STOCK POINT *</label>
                <select 
                  value={fromStockPoint} 
                  onChange={(e) => setFromStockPoint(e.target.value as StockPointId)}
                  style={{
                    ...styles.select,
                    opacity: dropdownsDisabled ? 0.5 : 1,
                    cursor: dropdownsDisabled ? 'not-allowed' : 'pointer',
                    backgroundColor: dropdownsDisabled ? '#f5f5f5' : '#ffffff'
                  }}
                  disabled={dropdownsDisabled}
                >
                  {STOCK_POINTS.map(point => (
                    <option key={point.id} value={point.id}>{point.name}</option>
                  ))}
                </select>
                {dropdownsDisabled && (
                  <div style={styles.lockedWarning}>
                    🔒 Locked - Remove items to change
                  </div>
                )}
              </div>

              <div style={styles.arrowContainer}>
                <span style={styles.arrow}>→</span>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>TO STOCK POINT *</label>
                <select 
                  value={toStockPoint} 
                  onChange={(e) => setToStockPoint(e.target.value as StockPointId)}
                  style={{
                    ...styles.select,
                    opacity: dropdownsDisabled ? 0.5 : 1,
                    cursor: dropdownsDisabled ? 'not-allowed' : 'pointer',
                    backgroundColor: dropdownsDisabled ? '#f5f5f5' : '#ffffff'
                  }}
                  disabled={dropdownsDisabled}
                >
                  {STOCK_POINTS.map(point => (
                    <option key={point.id} value={point.id}>{point.name}</option>
                  ))}
                </select>
                {dropdownsDisabled && (
                  <div style={styles.lockedWarning}>
                    🔒 Locked - Remove items to change
                  </div>
                )}
              </div>
            </div>

            {/* Product Search */}
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
                    disabled={isTransferring}
                  />
                  
                  {showDropdown && searchTerm && filteredProducts.length > 0 && (
                    <div style={styles.dropdown}>
                      {filteredProducts.slice(0, 10).map(product => {
                        const fromLocationStock = getFromLocationStock(product.product_id);
                        const { cases, bottles, pegs } = convertFromML(product, fromLocationStock);
                        const hasStock = fromLocationStock > 0;
                        
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
                            <div style={{
                              ...styles.stockInfo,
                              color: hasStock ? '#2e7d32' : '#c62828'
                            }}>
                              {cases} Cases, {bottles} Bottles, {pegs} Peg(s) Available in {STOCK_POINTS.find(s => s.id === fromStockPoint)?.name}
                            </div>
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

              {/* Quantity Inputs */}
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
                      disabled={isTransferring}
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
                      disabled={isTransferring}
                    />
                  </div>

                  <div style={{...styles.formGroup, flex: 1}}>
                    <label style={styles.label}>PEGS (60ml)</label>
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      step="0.5"
                      value={selectedPegs}
                      onChange={(e) => setSelectedPegs(e.target.value)}
                      style={styles.input}
                      disabled={isTransferring}
                    />
                  </div>

                  <button
                    onClick={handleAddProduct}
                    style={styles.addBtn}
                    onMouseEnter={(e) => !isTransferring && (e.currentTarget.style.backgroundColor = '#1976D2')}
                    onMouseLeave={(e) => !isTransferring && (e.currentTarget.style.backgroundColor = '#2196F3')}
                    disabled={isTransferring}
                  >
                    + ADD
                  </button>
                </div>
              </div>
            </div>

            {/* Transfer Items Table */}
            {transferItems.length > 0 && (
              <div style={styles.tableSection}>
                <div style={styles.tableHeader}>PRODUCTS TO TRANSFER ({transferItems.length})</div>
                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>PRODUCT</th>
                        <th style={styles.th}>CASES</th>
                        <th style={styles.th}>BOTTLES</th>
                        <th style={styles.th}>PEGS</th>
                        <th style={styles.th}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferItems.map((item) => {
                        const product = products.find(p => p.product_id === item.product_id);
                        if (!product) return null;
                        const { cases, bottles, pegs } = convertFromML(product, item.total_ml);
                        
                        return (
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
                            <td style={styles.td}>{cases}</td>
                            <td style={styles.td}>{bottles}</td>
                            <td style={styles.td}>{pegs}</td>
                            <td style={styles.td}>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                style={styles.removeBtn}
                                onMouseEnter={(e) => !isTransferring && (e.currentTarget.style.backgroundColor = '#C62828')}
                                onMouseLeave={(e) => !isTransferring && (e.currentTarget.style.backgroundColor = '#E53935')}
                                disabled={isTransferring}
                              >
                                REMOVE
                              </button>
                            </td>
                          </tr>
                        );
                      })}
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
                  disabled={isTransferring}
                />
              </div>

              <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
                <label style={styles.label}>NOTES</label>
                <textarea
                  placeholder="Any additional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.toUpperCase())}
                  style={{...styles.input, minHeight: '60px'}}
                  disabled={isTransferring}
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
                setSelectedPegs('');
                setReferenceId('');
                setNotes('');
                setTransferItems([]);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              style={styles.cancelBtn}
              onMouseEnter={(e) => !isTransferring && (e.currentTarget.style.backgroundColor = '#d0d0d0')}
              onMouseLeave={(e) => !isTransferring && (e.currentTarget.style.backgroundColor = '#e0e0e0')}
              disabled={isTransferring}
            >
              CANCEL
            </button>
            <button
              onClick={handleTransfer}
              disabled={transferItems.length === 0 || isTransferring}
              style={{
                ...styles.transferBtn,
                opacity: (transferItems.length === 0 || isTransferring) ? 0.5 : 1,
                cursor: (transferItems.length === 0 || isTransferring) ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => (transferItems.length > 0 && !isTransferring) && (e.currentTarget.style.backgroundColor = '#1976D2')}
              onMouseLeave={(e) => !isTransferring && (e.currentTarget.style.backgroundColor = '#2196F3')}
            >
              {isTransferring ? 'PROCESSING...' : 'CONFIRM TRANSFER'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ... [Rest of styles remain the same, just updating table header and dropdowns to include pegs]

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
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
  } as React.CSSProperties,

  locationRow: {
    display: 'flex',
    gap: 'clamp(8px, 1.5vw, 12px)',
    alignItems: 'flex-start',
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'clamp(4px, 0.8vw, 6px)',
    flex: 1,
    minWidth: 'clamp(140px, 30%, 200px)',
    position: 'relative',
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
    transition: 'all 0.3s',
  } as React.CSSProperties,

  lockedWarning: {
    fontSize: 'clamp(9px, 1vw, 10px)',
    color: '#ff6f00',
    marginTop: '4px',
    fontWeight: 'bold',
    fontStyle: 'italic',
  } as React.CSSProperties,

  arrowContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 'clamp(4px, 0.8vw, 6px)',
    height: '42px',
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
    fontSize: 'clamp(11px, 1.2vw, 12px)',
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

  printButtonContainer: {
    marginBottom: 'clamp(12px, 2vw, 16px)',
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  } as React.CSSProperties,

  printBtn: {
    padding: 'clamp(10px, 1.5vw, 14px) clamp(18px, 2.5vw, 24px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    borderRadius: '4px',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  closeBtn: {
    padding: 'clamp(10px, 1.5vw, 14px) clamp(18px, 2.5vw, 24px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    fontWeight: 'bold',
    color: '#1a1a1a',
    backgroundColor: '#e0e0e0',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    borderRadius: '4px',
    transition: 'all 0.3s',
  } as React.CSSProperties,

  reportContainer: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 'clamp(20px, 3vw, 30px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  } as React.CSSProperties,

  reportHeader: {
    textAlign: 'center',
    marginBottom: 'clamp(20px, 3vw, 30px)',
    borderBottom: '2px solid #e0e0e0',
    paddingBottom: '20px',
  } as React.CSSProperties,

  reportTitle: {
    fontSize: 'clamp(20px, 3.5vw, 28px)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    margin: '0 0 8px 0',
  } as React.CSSProperties,

  reportSubtitle: {
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    color: '#8a8a8a',
    margin: '0',
  } as React.CSSProperties,

  reportDetails: {
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
    backgroundColor: '#f8f8f8',
    padding: 'clamp(12px, 2vw, 16px)',
    borderRadius: '4px',
  } as React.CSSProperties,

  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
  } as React.CSSProperties,

  detailLabel: {
    fontWeight: 'bold',
    minWidth: '140px',
    color: '#1a1a1a',
  } as React.CSSProperties,

  detailValue: {
    flex: 1,
    textAlign: 'right',
    color: '#595959',
  } as React.CSSProperties,

  reportDivider: {
    borderTop: '2px solid #e0e0e0',
    margin: 'clamp(16px, 2.5vw, 24px) 0',
  } as React.CSSProperties,

  reportTableSection: {
    marginBottom: 'clamp(20px, 3vw, 30px)',
  } as React.CSSProperties,

  reportTableTitle: {
    fontSize: 'clamp(14px, 1.5vw, 15px)',
    fontWeight: 'bold',
    marginBottom: 'clamp(12px, 2vw, 16px)',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  } as React.CSSProperties,

  reportTableContainer: {
    overflowX: 'auto',
  } as React.CSSProperties,

  reportTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
  } as React.CSSProperties,

  reportTableHeader: {
    backgroundColor: '#f0f0f0',
    borderBottom: '2px solid #e0e0e0',
  } as React.CSSProperties,

  reportTh: {
    padding: 'clamp(10px, 1.6vw, 14px)',
    textAlign: 'left',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  reportTableRow: {
    borderBottom: '1px solid #e0e0e0',
  } as React.CSSProperties,

  reportTd: {
    padding: 'clamp(10px, 1.6vw, 14px)',
    color: '#595959',
  } as React.CSSProperties,

  reportProductName: {
    fontWeight: 'bold',
    color: '#1a1a1a',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
  } as React.CSSProperties,

  reportProductDesc: {
    fontSize: 'clamp(10px, 1.1vw, 11px)',
    color: '#8a8a8a',
    marginTop: '4px',
  } as React.CSSProperties,

  reportTotals: {
    backgroundColor: '#f8f8f8',
    padding: 'clamp(12px, 2vw, 16px)',
    borderRadius: '4px',
    marginBottom: 'clamp(16px, 2.5vw, 24px)',
  } as React.CSSProperties,

  reportTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
  } as React.CSSProperties,

  reportTotalLabel: {
    fontWeight: 'bold',
    color: '#1a1a1a',
  } as React.CSSProperties,

  reportTotalValue: {
    fontWeight: 'bold',
    color: '#2196F3',
    fontSize: 'clamp(13px, 1.4vw, 14px)',
  } as React.CSSProperties,

  reportFooter: {
    textAlign: 'center',
    marginTop: 'clamp(20px, 3vw, 30px)',
    paddingTop: 'clamp(12px, 2vw, 16px)',
    borderTop: '1px solid #e0e0e0',
  } as React.CSSProperties,

  reportFooterText: {
    fontSize: 'clamp(10px, 1.1vw, 11px)',
    color: '#8a8a8a',
    margin: '6px 0',
  } as React.CSSProperties,
};