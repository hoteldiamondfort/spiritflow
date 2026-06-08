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

      // Fetch both products and stock data
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
        // Store products
        setProducts(productsData.data);

        // Create stock map for easy lookup
        const stockMap: {[key: string]: StockItem} = {};
        stockDataResponse.data.forEach((item: StockItem) => {
          stockMap[item.product_id] = item;
        });
        setStockData(stockMap);

        // Combine products with stock data
        const combined: CombinedItem[] = productsData.data.map((product: Product) => {
          const stock = stockMap[product.product_id] || {
            product_id: product.product_id,
            total_quantity_ml: 0,
            breakdown: { warehouse: 0, druvam: 0, spadikam: 0 }
          };
          return { ...product, ...stock };
        });

        setCombinedData(combined);

        // Extract unique categories
        const catSet = new Set<string>();
        combined.forEach((item: CombinedItem) => {
          if (item.category_name) {
            catSet.add(item.category_name);
          }
        });
        const cats = Array.from(catSet).sort();
        setCategories(cats);

        // Apply initial filters
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

    // Filter by category
    if (category !== 'all' && category) {
      filtered = filtered.filter(item => item.category_name === category);
    }

    // Filter by search query
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(lowerSearch) ||
        item.product_alias.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort by category then product alias
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

  const handlePrint = () => {
    window.print();
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
                        {(() => {
                          const { bottles } = convertFromML(item.breakdown.warehouse, item.ml_per_bottle);
                          return `${bottles} Bottles`;
                        })()}
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

      <style>{`
        @media print {
          body {
            background: white;
          }
          .no-print {
            display: none;
          }
          table {
            page-break-inside: avoid;
          }
        }
      `}</style>
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