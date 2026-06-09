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
  const [isDownloading, setIsDownloading] = useState(false);

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
      alert('Error loading data. Please refresh the page.');
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

  // Web view display (full words)
  const getStockDisplayWeb = (ml: number, mlPerBottle: number): string => {
    const { bottles, pegs } = convertFromML(ml, mlPerBottle);
    return `${bottles} Bottles | ${pegs} Pegs`;
  };

  const getWarehouseDisplayWeb = (ml: number, mlPerBottle: number): string => {
    const { bottles } = convertFromML(ml, mlPerBottle);
    return `${bottles} Bottles`;
  };

  // PDF display (short format)
  const getStockDisplayPDF = (ml: number, mlPerBottle: number): string => {
    const { bottles, pegs } = convertFromML(ml, mlPerBottle);
    return `${bottles} B | ${pegs} P`;
  };

  const getWarehouseDisplayPDF = (ml: number, mlPerBottle: number): string => {
    const { bottles } = convertFromML(ml, mlPerBottle);
    return `${bottles} B`;
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

  const generatePDF = async () => {
    try {
      setIsDownloading(true);
      console.log('🔄 Starting PDF generation...');

      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      let yPosition = 6;

      // ===== PROFESSIONAL HEADER BACKGROUND =====
      doc.setFillColor(33, 150, 243);
      doc.rect(0, 0, pageWidth, 24, 'F');

      // ===== HEADER TEXT =====
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('HOTEL DIAMOND FORT', pageWidth / 2, yPosition + 4, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text('CONSOLIDATED STOCK REPORT', pageWidth / 2, yPosition + 10, { align: 'center' });

      yPosition = 28;

      // ===== METADATA SECTION =====
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      const reportDate = new Date().toLocaleDateString('en-IN');
      const reportTime = new Date().toLocaleTimeString('en-IN');

      doc.text(`Date: ${reportDate}`, margin, yPosition);
      doc.text(`Time: ${reportTime}`, margin, yPosition + 4);

      doc.text(`Report Type: Current`, pageWidth - margin, yPosition, { align: 'right' });
      doc.text(`Prepared by: ${user?.name || 'System User'}`, pageWidth - margin, yPosition + 4, { align: 'right' });

      yPosition += 10;

      // ===== SEPARATOR LINE =====
      doc.setDrawColor(33, 150, 243);
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 3;

      // ===== TABLE CONFIGURATION =====
      const tableWidth = pageWidth - margin * 2;
      const colWidths = {
        product: 45,
        warehouse: 22,
        druvam: 26,
        spadikam: 26,
        total: 18
      };

      const rowHeight = 8;
      const headerRowHeight = 5;

      const colPositions = [
        margin,
        margin + colWidths.product,
        margin + colWidths.product + colWidths.warehouse,
        margin + colWidths.product + colWidths.warehouse + colWidths.druvam,
        margin + colWidths.product + colWidths.warehouse + colWidths.druvam + colWidths.spadikam
      ];

      // ===== TABLE HEADER =====
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(33, 150, 243);
      doc.rect(margin, yPosition - headerRowHeight + 0.2, tableWidth, headerRowHeight, 'F');

      // Draw vertical separators
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.2);
      doc.line(colPositions[1], yPosition - headerRowHeight + 0.2, colPositions[1], yPosition + 0.2);
      doc.line(colPositions[2], yPosition - headerRowHeight + 0.2, colPositions[2], yPosition + 0.2);
      doc.line(colPositions[3], yPosition - headerRowHeight + 0.2, colPositions[3], yPosition + 0.2);
      doc.line(colPositions[4], yPosition - headerRowHeight + 0.2, colPositions[4], yPosition + 0.2);

      // Header text - centered in each column
      doc.text('PRODUCT', colPositions[0] + 1, yPosition - 0.5);
      doc.text('WAREHOUSE', colPositions[1] + colWidths.warehouse / 2 - 3, yPosition - 0.5);
      doc.text('DRUVAM', colPositions[2] + colWidths.druvam / 2 - 2.5, yPosition - 0.5);
      doc.text('SPADIKAM', colPositions[3] + colWidths.spadikam / 2 - 3, yPosition - 0.5);
      doc.text('TOTAL', colPositions[4] + colWidths.total / 2 - 2, yPosition - 0.5);

      yPosition += headerRowHeight;

      // ===== TABLE BODY =====
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);

      filteredData.forEach((item, idx) => {
        // Check if we need a new page
        if (yPosition + rowHeight > pageHeight - 14) {
          // Add footer before new page
          doc.setDrawColor(33, 150, 243);
          doc.setLineWidth(0.3);
          doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
          
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(6);
          doc.setTextColor(100, 100, 100);
          doc.text(
            'This is a computer generated report based on the data available within the system.',
            pageWidth / 2,
            pageHeight - 7,
            { align: 'center' }
          );

          doc.addPage();
          yPosition = margin;

          // Repeat header on new page
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.setFillColor(33, 150, 243);
          doc.rect(margin, yPosition - headerRowHeight + 0.2, tableWidth, headerRowHeight, 'F');

          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.2);
          doc.line(colPositions[1], yPosition - headerRowHeight + 0.2, colPositions[1], yPosition + 0.2);
          doc.line(colPositions[2], yPosition - headerRowHeight + 0.2, colPositions[2], yPosition + 0.2);
          doc.line(colPositions[3], yPosition - headerRowHeight + 0.2, colPositions[3], yPosition + 0.2);
          doc.line(colPositions[4], yPosition - headerRowHeight + 0.2, colPositions[4], yPosition + 0.2);

          doc.text('PRODUCT', colPositions[0] + 1, yPosition - 0.5);
          doc.text('WAREHOUSE', colPositions[1] + colWidths.warehouse / 2 - 3, yPosition - 0.5);
          doc.text('DRUVAM', colPositions[2] + colWidths.druvam / 2 - 2.5, yPosition - 0.5);
          doc.text('SPADIKAM', colPositions[3] + colWidths.spadikam / 2 - 3, yPosition - 0.5);
          doc.text('TOTAL', colPositions[4] + colWidths.total / 2 - 2, yPosition - 0.5);

          yPosition += headerRowHeight;
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(0, 0, 0);
        }

        // Alternate row colors
        if (idx % 2 === 1) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPosition - rowHeight + 0.2, tableWidth, rowHeight, 'F');
        }

        // Draw cell borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(margin, yPosition - rowHeight + 0.2, tableWidth, rowHeight);

        // Vertical separators
        for (let i = 1; i < 5; i++) {
          doc.line(colPositions[i], yPosition - rowHeight + 0.2, colPositions[i], yPosition + 0.2);
        }

        // Product column - with wrapping (alias + name)
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.5);
        const maxProductWidth = colWidths.product - 2;
        const productAlias = item.product_alias;
        const productName = item.product_name;
        
        // Split text into lines if too long
        const aliasLines = doc.splitTextToSize(productAlias, maxProductWidth);
        const nameLines = doc.splitTextToSize(productName, maxProductWidth);
        
        let textY = yPosition - 5;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.5);
        aliasLines.forEach((line: string) => {
          doc.text(line, colPositions[0] + 0.5, textY);
          textY -= 2;
        });
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(5.5);
        nameLines.slice(0, 1).forEach((line: string) => {
          doc.text(line, colPositions[0] + 0.5, textY);
          textY -= 1.5;
        });

        // Warehouse (centered)
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7);
        const warehouseText = getWarehouseDisplayPDF(item.breakdown.warehouse, item.ml_per_bottle);
        doc.text(warehouseText, colPositions[1] + colWidths.warehouse / 2, yPosition - 2.5, { align: 'center' });

        // Druvam (centered)
        const druvamText = getStockDisplayPDF(item.breakdown.druvam, item.ml_per_bottle);
        doc.text(druvamText, colPositions[2] + colWidths.druvam / 2, yPosition - 2.5, { align: 'center' });

        // Spadikam (centered)
        const spadikamText = getStockDisplayPDF(item.breakdown.spadikam, item.ml_per_bottle);
        doc.text(spadikamText, colPositions[3] + colWidths.spadikam / 2, yPosition - 2.5, { align: 'center' });

        // Total (right aligned)
        const totalText = `${(item.total_quantity_ml / 1000).toFixed(2)}L`;
        doc.text(totalText, colPositions[4] + colWidths.total - 1, yPosition - 2.5, { align: 'right' });

        yPosition += rowHeight;
      });

      // ===== TOTALS ROW =====
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(33, 150, 243);
      doc.rect(margin, yPosition - rowHeight + 0.2, tableWidth, rowHeight, 'F');

      // Vertical separators for totals
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.2);
      doc.line(colPositions[1], yPosition - rowHeight + 0.2, colPositions[1], yPosition + 0.2);
      doc.line(colPositions[2], yPosition - rowHeight + 0.2, colPositions[2], yPosition + 0.2);
      doc.line(colPositions[3], yPosition - rowHeight + 0.2, colPositions[3], yPosition + 0.2);
      doc.line(colPositions[4], yPosition - rowHeight + 0.2, colPositions[4], yPosition + 0.2);

      doc.text('TOTAL', colPositions[0] + 1, yPosition - 2.5);
      doc.text(`${totals.warehouseBottles} B`, colPositions[1] + colWidths.warehouse / 2, yPosition - 2.5, { align: 'center' });
      doc.text(`${totals.druvamBottles} B | ${totals.druvamPegs} P`, colPositions[2] + colWidths.druvam / 2, yPosition - 2.5, { align: 'center' });
      doc.text(`${totals.spadikamBottles} B | ${totals.spadikamPegs} P`, colPositions[3] + colWidths.spadikam / 2, yPosition - 2.5, { align: 'center' });
      doc.text(`${totals.totalLitres}L`, colPositions[4] + colWidths.total - 1, yPosition - 2.5, { align: 'right' });

      // ===== FOOTER =====
      doc.setDrawColor(33, 150, 243);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(6);
      doc.setTextColor(100, 100, 100);
      doc.text(
        'This is a computer generated report based on the data available within the system.',
        pageWidth / 2,
        pageHeight - 7,
        { align: 'center' }
      );

      // ===== DOWNLOAD PDF =====
      const fileName = `Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      setIsDownloading(false);
      console.log('✅ PDF downloaded successfully:', fileName);
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Error: ${errorMessage}`);
      setIsDownloading(false);
    }
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
              onClick={generatePDF}
              style={{...styles.actionBtn, opacity: isDownloading ? 0.6 : 1}}
              title="Download PDF report"
              disabled={isDownloading}
            >
              {isDownloading ? '⏳ GENERATING...' : '📥 DOWNLOAD PDF'}
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
                        {getWarehouseDisplayWeb(item.breakdown.warehouse, item.ml_per_bottle)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{fontSize: 'clamp(11px, 1.2vw, 12px)', fontWeight: 'bold'}}>
                        {getStockDisplayWeb(item.breakdown.druvam, item.ml_per_bottle)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={{fontSize: 'clamp(11px, 1.2vw, 12px)', fontWeight: 'bold'}}>
                        {getStockDisplayWeb(item.breakdown.spadikam, item.ml_per_bottle)}
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