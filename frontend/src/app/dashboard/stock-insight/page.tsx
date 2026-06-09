'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';

const PEG_SIZE_ML = 60;

interface Product {
  product_id: string;
  product_name: string;
  product_alias: string;
  category_name: string;
  ml_per_bottle: number;
  bottles_per_case: number;
}

interface StockItem {
  product_id: string;
  total_quantity_ml: number;
  breakdown: {
    warehouse: number;
    druvam: number;
    spadikam: number;
  };
}

interface CombinedItem extends Product, StockItem {}

export default function StockInsightPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockData, setStockData] = useState<{[key: string]: StockItem}>({});
  const [combinedData, setCombinedData] = useState<CombinedItem[]>([]);
  const [filteredData, setFilteredData] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [productsRes, stockRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, {
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/stock/total`, {
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      const productsData = await productsRes.json();
      const stockDataResponse = await stockRes.json();

      if (productsData.status === 'success' && stockDataResponse.status === 'success') {
        setProducts(productsData.data);

        const stockMap: {[key: string]: StockItem} = {};
        stockDataResponse.data.forEach((item: StockItem) => {
          stockMap[item.product_id] = item;
        });
        setStockData(stockMap);

        const combined: CombinedItem[] = productsData.data.map((product: Product) => {
          const stock = stockMap[product.product_id] || {
            product_id: product.product_id,
            total_quantity_ml: 0,
            breakdown: { warehouse: 0, druvam: 0, spadikam: 0 }
          };
          return { ...product, ...stock };
        });

        setCombinedData(combined);

        const catSet = new Set<string>();
        combined.forEach((item: CombinedItem) => {
          if (item.category_name) {
            catSet.add(item.category_name);
          }
        });
        const cats = Array.from(catSet).sort();
        setCategories(cats);

        applyFilters(combined, 'all', '');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data: CombinedItem[], category: string, search: string) => {
    let filtered = [...data];

    if (category !== 'all' && category) {
      filtered = filtered.filter(item => item.category_name === category);
    }

    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(lowerSearch) ||
        item.product_alias.toLowerCase().includes(lowerSearch)
      );
    }

    filtered.sort((a, b) => {
      if (a.category_name !== b.category_name) {
        return a.category_name.localeCompare(b.category_name);
      }
      return a.product_alias.localeCompare(b.product_alias);
    });

    setFilteredData(filtered);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    applyFilters(combinedData, category, searchQuery);
  };

  const handleSearchChange = (search: string) => {
    setSearchQuery(search);
    applyFilters(combinedData, selectedCategory, search);
  };

  const convertFromML = (ml: number, mlPerBottle: number): { bottles: number; pegs: number } => {
    const bottles = Math.floor(ml / mlPerBottle);
    const remainingML = ml - (bottles * mlPerBottle);
    const pegsExact = remainingML / PEG_SIZE_ML;
    const pegs = Math.floor(pegsExact * 2) / 2;
    return { bottles, pegs };
  };

  const getStockDisplay = (ml: number, mlPerBottle: number): string => {
    const { bottles, pegs } = convertFromML(ml, mlPerBottle);
    return `${bottles} Bottles | ${pegs} Pegs`;
  };

  const getWarehouseDisplay = (ml: number, mlPerBottle: number): string => {
    const { bottles } = convertFromML(ml, mlPerBottle);
    return `${bottles} Bottles`;
  };

  const calculateTotals = () => {
    let warehouseBottles = 0;
    let druvamBottles = 0;
    let druvamPegs = 0;
    let spadikamBottles = 0;
    let spadikamPegs = 0;
    let totalLitres = 0;

    filteredData.forEach((item) => {
      const warehouse = convertFromML(item.breakdown.warehouse, item.ml_per_bottle);
      const druvam = convertFromML(item.breakdown.druvam, item.ml_per_bottle);
      const spadikam = convertFromML(item.breakdown.spadikam, item.ml_per_bottle);

      warehouseBottles += warehouse.bottles;
      druvamBottles += druvam.bottles;
      druvamPegs += druvam.pegs;
      spadikamBottles += spadikam.bottles;
      spadikamPegs += spadikam.pegs;
      totalLitres += item.total_quantity_ml / 1000;
    });

    return {
      warehouseBottles,
      druvamBottles,
      druvamPegs,
      spadikamBottles,
      spadikamPegs,
      totalLitres: totalLitres.toFixed(2)
    };
  };

  const totals = calculateTotals();

  const handlePrint = () => {
    setShowPrintPreview(true);
  };

  const handleExportPDF = () => {
    alert('PDF export feature coming soon!');
  };

  const handleEmail = () => {
    alert('Email feature coming soon!');
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
    <>
      <DashboardLayout user={user}>
        <div style={styles.container}>
          <div style={styles.pageHeader}>
            <h1 style={styles.pageTitle}>STOCK INSIGHT</h1>
          </div>

          {/* Filters Section */}
          <div style={styles.filterCard}>
            <div style={styles.filterGrid}>
              <div style={styles.filterGroup}>
                <label style={styles.label}>CATEGORY</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  style={styles.select}
                >
                  <option value="all">ALL CATEGORIES</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              <div style={{...styles.filterGroup, gridColumn: '1 / -1'}}>
                <label style={styles.label}>SEARCH PRODUCT</label>
                <input
                  type="text"
                  placeholder="Search by name or alias..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.actionBar}>
              <button
                onClick={fetchData}
                style={styles.refreshBtn}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1976D2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2196F3'}
                title="Refresh data"
              >
                ↻ REFRESH
              </button>
              <button
                onClick={handlePrint}
                style={styles.actionBtn}
                title="Print report"
              >
                🖨️ PRINT
              </button>
              <button
                onClick={handleExportPDF}
                style={styles.actionBtn}
                title="Export to PDF"
              >
                📄 PDF
              </button>
              <button
                onClick={handleEmail}
                style={{...styles.actionBtn, opacity: 0.5}}
                title="Email report (coming soon)"
                disabled
              >
                📧 EMAIL
              </button>
            </div>
          </div>

          {/* Report Table */}
          <div style={styles.reportCard}>
            <div style={{fontSize: 'clamp(12px, 1.2vw, 13px)', marginBottom: '12px', color: '#8a8a8a'}}>
              Showing {filteredData.length} product(s)
            </div>
            
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{...styles.th, width: '30%'}}>PRODUCT</th>
                    <th style={{...styles.th, width: '20%'}}>WAREHOUSE</th>
                    <th style={{...styles.th, width: '20%'}}>DRUVAM</th>
                    <th style={{...styles.th, width: '20%'}}>SPADIKAM</th>
                    <th style={{...styles.th, width: '15%', textAlign: 'right'}}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>
                        <div style={{fontWeight: 'bold', fontSize: 'clamp(11px, 1.2vw, 12px)'}}>
                          {item.product_alias}
                        </div>
                        <div style={{fontSize: 'clamp(10px, 1.1vw, 11px)', color: '#8a8a8a', marginTop: '2px'}}>
                          {item.product_name}
                        </div>
                        <div style={{fontSize: 'clamp(9px, 1vw, 10px)', color: '#aaa', marginTop: '4px', fontWeight: '500'}}>
                          {item.category_name}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{fontSize: 'clamp(11px, 1.2vw, 12px)', fontWeight: 'bold'}}>
                          {getWarehouseDisplay(item.breakdown.warehouse, item.ml_per_bottle)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{fontSize: 'clamp(11px, 1.2vw, 12px)', fontWeight: 'bold'}}>
                          {getStockDisplay(item.breakdown.druvam, item.ml_per_bottle)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{fontSize: 'clamp(11px, 1.2vw, 12px)', fontWeight: 'bold'}}>
                          {getStockDisplay(item.breakdown.spadikam, item.ml_per_bottle)}
                        </span>
                      </td>
                      <td style={{...styles.td, color: '#2196F3', fontWeight: 'bold', fontSize: 'clamp(11px, 1.2vw, 12px)', textAlign: 'right'}}>
                        {(item.total_quantity_ml / 1000).toFixed(2)}L
                      </td>
                    </tr>
                  ))}
                  {/* Totals Row */}
                  <tr style={{...styles.tableRow, backgroundColor: '#f0f0f0', fontWeight: 'bold', borderTop: '2px solid #1a1a1a'}}>
                    <td style={{...styles.td, fontWeight: 'bold'}}>TOTAL</td>
                    <td style={{...styles.td, fontWeight: 'bold', fontSize: 'clamp(11px, 1.2vw, 12px)'}}>
                      {totals.warehouseBottles} Bottles
                    </td>
                    <td style={{...styles.td, fontWeight: 'bold', fontSize: 'clamp(11px, 1.2vw, 12px)'}}>
                      {totals.druvamBottles} Bottles | {totals.druvamPegs} Pegs
                    </td>
                    <td style={{...styles.td, fontWeight: 'bold', fontSize: 'clamp(11px, 1.2vw, 12px)'}}>
                      {totals.spadikamBottles} Bottles | {totals.spadikamPegs} Pegs
                    </td>
                    <td style={{...styles.td, color: '#2196F3', fontWeight: 'bold', fontSize: 'clamp(11px, 1.2vw, 12px)', textAlign: 'right'}}>
                      {totals.totalLitres}L
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {filteredData.length === 0 && (
              <div style={{textAlign: 'center', padding: '40px', color: '#8a8a8a'}}>
                No products found matching your filters.
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>

      {/* Professional Print Preview Modal */}
      {showPrintPreview && (
        <ProfessionalPrintModal
          filteredData={filteredData}
          totals={totals}
          user={user}
          getWarehouseDisplay={getWarehouseDisplay}
          getStockDisplay={getStockDisplay}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </>
  );
}

function ProfessionalPrintModal({
  filteredData,
  totals,
  user,
  getWarehouseDisplay,
  getStockDisplay,
  onClose
}: any) {
  const reportDate = new Date().toLocaleDateString('en-IN');
  const reportTime = new Date().toLocaleTimeString('en-IN');

  useEffect(() => {
    // Don't auto-open print dialog - let user trigger it manually
    // setTimeout(() => {
    //   window.print();
    // }, 500);
  }, []);

  return (
    <>
      {/* PRINT STYLESHEET - Only for print media */}
      <style>{`
        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
          }

          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: white;
          }

          body {
            font-family: Arial, sans-serif;
          }

          .print-modal-overlay {
            position: static !important;
            top: auto !important;
            left: auto !important;
            right: auto !important;
            bottom: auto !important;
            width: 100% !important;
            height: auto !important;
            background: white !important;
            z-index: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-close-btn {
            display: none !important;
          }

          .print-report-wrapper {
            background: white !important;
            padding: 0.5in 0.5in 0.5in 0.5in !important;
            margin: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            page-break-after: auto !important;
            page-break-inside: avoid !important;
          }

          @page {
            size: A4;
            margin: 0.5in 0.5in 0.5in 0.5in;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
          }

          thead {
            display: table-header-group !important;
          }

          tbody {
            display: table-row-group !important;
          }

          tr {
            page-break-inside: avoid !important;
          }

          td, th {
            border: 1px solid #000 !important;
            padding: 8px !important;
            page-break-inside: avoid !important;
          }

          .print-header-section {
            page-break-after: avoid !important;
            margin-bottom: 15px !important;
            padding-bottom: 15px !important;
            border-bottom: 2px solid #000 !important;
          }

          .print-metadata-section {
            page-break-after: avoid !important;
            margin-bottom: 15px !important;
          }

          .print-footer-note {
            page-break-before: avoid !important;
            margin-top: 15px !important;
            padding-top: 10px !important;
          }
        }

        @media screen {
          .print-close-btn {
            display: flex !important;
          }

          .print-modal-overlay {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: #f5f5f5 !important;
            z-index: 10000 !important;
            overflow: auto !important;
            padding: 20px !important;
          }

          .print-report-wrapper {
            background: white !important;
            padding: 40px 50px !important;
            margin: 0 0 40px 0 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
            margin-bottom: 40px !important;
          }
        }
      `}</style>

      <div className="print-modal-overlay">
        {/* Close button - only visible on screen */}
        <div style={screenStyles.closeButtonContainer} className="print-close-btn">
          <button onClick={onClose} style={screenStyles.closeButton}>✕ CLOSE</button>
        </div>

        {/* Print Content - A4 Professional Format */}
        <div style={screenStyles.reportWrapper} className="print-report-wrapper">
          
          {/* ===== HEADER SECTION ===== */}
          <div style={printStyles.headerSection} className="print-header-section">
            <div style={printStyles.hotelName}>HOTEL DIAMOND FORT</div>
            <div style={printStyles.reportTitle}>CONSOLIDATED STOCK REPORT</div>
          </div>

          {/* ===== REPORT METADATA ===== */}
          <div style={printStyles.metadataSection} className="print-metadata-section">
            <div style={printStyles.metadataRow}>
              <div style={printStyles.metadataLabel}>Date:</div>
              <div style={printStyles.metadataValue}>{reportDate}</div>
              <div style={printStyles.metadataLabel}>Report Type:</div>
              <div style={printStyles.metadataValue}>Current</div>
            </div>
            <div style={printStyles.metadataRow}>
              <div style={printStyles.metadataLabel}>Time:</div>
              <div style={printStyles.metadataValue}>{reportTime}</div>
              <div style={printStyles.metadataLabel}>Prepared by:</div>
              <div style={printStyles.metadataValue}>{user?.name || 'System User'}</div>
            </div>
          </div>

          {/* ===== SEPARATOR LINE ===== */}
          <div style={printStyles.separatorLine}></div>

          {/* ===== TABLE ===== */}
          <table style={printStyles.table}>
            <thead>
              <tr style={printStyles.tableHeaderRow}>
                <th style={{...printStyles.th, width: '28%', textAlign: 'left'}}>PRODUCT</th>
                <th style={{...printStyles.th, width: '18%', textAlign: 'center'}}>WAREHOUSE</th>
                <th style={{...printStyles.th, width: '18%', textAlign: 'center'}}>DRUVAM</th>
                <th style={{...printStyles.th, width: '18%', textAlign: 'center'}}>SPADIKAM</th>
                <th style={{...printStyles.th, width: '18%', textAlign: 'right'}}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item: any, idx: number) => (
                <tr key={idx} style={printStyles.tableRow}>
                  <td style={{...printStyles.td, textAlign: 'left'}}>
                    <div style={printStyles.productAlias}>{item.product_alias}</div>
                    <div style={printStyles.productName}>{item.product_name}</div>
                    <div style={printStyles.productCategory}>{item.category_name}</div>
                  </td>
                  <td style={{...printStyles.td, textAlign: 'center'}}>
                    {getWarehouseDisplay(item.breakdown.warehouse, item.ml_per_bottle)}
                  </td>
                  <td style={{...printStyles.td, textAlign: 'center'}}>
                    {getStockDisplay(item.breakdown.druvam, item.ml_per_bottle)}
                  </td>
                  <td style={{...printStyles.td, textAlign: 'center'}}>
                    {getStockDisplay(item.breakdown.spadikam, item.ml_per_bottle)}
                  </td>
                  <td style={{...printStyles.td, textAlign: 'right'}}>
                    {(item.total_quantity_ml / 1000).toFixed(2)}L
                  </td>
                </tr>
              ))}
              
              {/* ===== TOTALS ROW ===== */}
              <tr style={printStyles.totalRow}>
                <td style={{...printStyles.td, textAlign: 'left', fontWeight: 'bold'}}>TOTAL</td>
                <td style={{...printStyles.td, textAlign: 'center', fontWeight: 'bold'}}>
                  {totals.warehouseBottles} Bottles
                </td>
                <td style={{...printStyles.td, textAlign: 'center', fontWeight: 'bold'}}>
                  {totals.druvamBottles} Bottles | {totals.druvamPegs} Pegs
                </td>
                <td style={{...printStyles.td, textAlign: 'center', fontWeight: 'bold'}}>
                  {totals.spadikamBottles} Bottles | {totals.spadikamPegs} Pegs
                </td>
                <td style={{...printStyles.td, textAlign: 'right', fontWeight: 'bold'}}>
                  {totals.totalLitres}L
                </td>
              </tr>
            </tbody>
          </table>

          {/* ===== FOOTER SEPARATOR ===== */}
          <div style={printStyles.footerSeparatorLine}></div>

          {/* ===== FOOTER NOTE ===== */}
          <div style={printStyles.footerNote} className="print-footer-note">
            This is a computer generated report based on the data available within the system.
          </div>

        </div>
      </div>
    </>
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
  filterCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 'clamp(12px, 2.5vw, 20px)',
    marginBottom: 'clamp(12px, 2.5vw, 20px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    borderRadius: '4px',
  } as React.CSSProperties,
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: 'clamp(10px, 2vw, 14px)',
    marginBottom: 'clamp(12px, 2vw, 16px)',
  } as React.CSSProperties,
  filterGroup: {
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
    borderRadius: '3px',
  } as React.CSSProperties,
  select: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(10px, 1.5vw, 12px)',
    fontSize: 'clamp(12px, 1.2vw, 13px)',
    border: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    fontFamily: '"Courier New", Courier, monospace',
    outline: 'none',
    cursor: 'pointer',
    borderRadius: '3px',
    color: '#1a1a1a',
  } as React.CSSProperties,
  actionBar: {
    display: 'flex',
    gap: 'clamp(8px, 1.5vw, 12px)',
    flexWrap: 'wrap',
    paddingTop: 'clamp(8px, 1.5vw, 12px)',
    borderTop: '1px solid #e0e0e0',
  } as React.CSSProperties,
  refreshBtn: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(12px, 1.8vw, 16px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
    borderRadius: '3px',
  } as React.CSSProperties,
  actionBtn: {
    padding: 'clamp(8px, 1.4vw, 12px) clamp(12px, 1.8vw, 16px)',
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 'bold',
    letterSpacing: '0.8px',
    color: '#1a1a1a',
    backgroundColor: '#e0e0e0',
    border: 'none',
    cursor: 'pointer',
    fontFamily: '"Courier New", Courier, monospace',
    transition: 'all 0.3s',
    borderRadius: '3px',
  } as React.CSSProperties,
  reportCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    padding: 'clamp(12px, 2.5vw, 20px)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
    borderRadius: '4px',
  } as React.CSSProperties,
  tableContainer: {
    overflowX: 'auto',
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
};

const screenStyles = {
  closeButtonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '20px',
  },

  closeButton: {
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    backgroundColor: '#e0e0e0',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'Arial, sans-serif',
    borderRadius: '3px',
  } as React.CSSProperties,

  reportWrapper: {
    backgroundColor: '#ffffff',
    padding: '40px 50px',
    marginBottom: '40px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    minHeight: '100vh',
    fontFamily: 'Arial, sans-serif',
    color: '#000',
  } as React.CSSProperties,
};

const printStyles = {
  headerSection: {
    textAlign: 'center' as const,
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #000',
  } as React.CSSProperties,

  hotelName: {
    fontSize: '16pt',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    fontFamily: 'Arial, sans-serif',
  } as React.CSSProperties,

  reportTitle: {
    fontSize: '14pt',
    fontWeight: 'bold',
    letterSpacing: '0.3px',
    fontFamily: 'Arial, sans-serif',
  } as React.CSSProperties,

  metadataSection: {
    marginBottom: '20px',
    fontSize: '10pt',
    fontFamily: 'Arial, sans-serif',
  } as React.CSSProperties,

  metadataRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '4px',
    flexWrap: 'wrap',
  } as React.CSSProperties,

  metadataLabel: {
    fontWeight: 'bold',
    marginRight: '10px',
    width: '80px',
  } as React.CSSProperties,

  metadataValue: {
    flex: 1,
    marginRight: '40px',
  } as React.CSSProperties,

  separatorLine: {
    height: '1px',
    backgroundColor: '#ccc',
    marginBottom: '15px',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '9pt',
    fontFamily: 'Arial, sans-serif',
    marginBottom: '15px',
  } as React.CSSProperties,

  tableHeaderRow: {
    backgroundColor: '#f0f0f0',
    borderTop: '2px solid #000',
    borderBottom: '2px solid #000',
  } as React.CSSProperties,

  th: {
    padding: '10px 8px',
    textAlign: 'left' as const,
    fontWeight: 'bold',
    fontSize: '9pt',
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #000',
  } as React.CSSProperties,

  tableRow: {
    borderBottom: '1px solid #000',
  } as React.CSSProperties,

  td: {
    padding: '8px',
    fontSize: '9pt',
    fontFamily: 'Arial, sans-serif',
    border: '1px solid #000',
  } as React.CSSProperties,

  productAlias: {
    fontWeight: 'bold',
    fontSize: '9pt',
    marginBottom: '2px',
  } as React.CSSProperties,

  productName: {
    fontSize: '8pt',
    color: '#333',
    marginBottom: '2px',
  } as React.CSSProperties,

  productCategory: {
    fontSize: '7.5pt',
    color: '#666',
  } as React.CSSProperties,

  totalRow: {
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    borderTop: '2px solid #000',
    borderBottom: '2px solid #000',
  } as React.CSSProperties,

  footerSeparatorLine: {
    height: '1px',
    backgroundColor: '#ccc',
    marginTop: '15px',
    marginBottom: '10px',
  } as React.CSSProperties,

  footerNote: {
    fontSize: '8pt',
    color: '#666',
    textAlign: 'center' as const,
    fontStyle: 'italic',
    paddingTop: '10px',
    fontFamily: 'Arial, sans-serif',
  } as React.CSSProperties,
};