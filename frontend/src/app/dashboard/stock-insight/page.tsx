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
  product_code: string;
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

  // PDF display functions - return separate values for 2-row display with formatting
  const getStockDisplayPDF = (ml: number, mlPerBottle: number): { bottles: string; pegs: string } => {
    const { bottles, pegs } = convertFromML(ml, mlPerBottle);
    return { 
      bottles: bottles.toString(), 
      pegs: pegs.toFixed(2)  // Always 2 decimal places
    };
  };

  const getWarehouseDisplayPDF = (ml: number, mlPerBottle: number): string => {
    const { bottles } = convertFromML(ml, mlPerBottle);
    return bottles.toString();
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

      // ===== HEADER =====
      doc.setFillColor(33, 150, 243);
      doc.rect(0, 0, pageWidth, 24, 'F');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text('HOTEL DIAMOND FORT', pageWidth / 2, yPosition + 4, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text('CONSOLIDATED STOCK REPORT', pageWidth / 2, yPosition + 10, { align: 'center' });

      yPosition = 28;

      // ===== METADATA (Professional layout with left/right alignment) =====
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      const reportDate = new Date().toLocaleDateString('en-IN');
      const reportTime = new Date().toLocaleTimeString('en-IN');
      const categoryDisplay = selectedCategory === 'all' ? 'ALL' : selectedCategory.toUpperCase();

      // LEFT SIDE: Report Date & Report Time
      doc.text(`Report Date: ${reportDate}`, margin, yPosition);
      doc.text(`Report Time: ${reportTime}`, margin, yPosition + 4);
      
      // RIGHT SIDE: Stock Category & Generated by (right-aligned)
      doc.text(`Stock Category: ${categoryDisplay}`, pageWidth - margin, yPosition, { align: 'right' });
      doc.text(`Generated by: ${user?.name || 'System User'}`, pageWidth - margin, yPosition + 4, { align: 'right' });

      yPosition += 11;

      // ===== SEPARATOR =====
      doc.setDrawColor(33, 150, 243);
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 3;

      // ===== TABLE CONFIG (Product: 36.67% +10%, rest equal width) =====
      const tableWidth = pageWidth - margin * 2;
      const colWidth = {
        product: (tableWidth / 3) * 1.1,    // 1/3 + 10% more = ~40% of width
        warehouse: (tableWidth * 0.6) / 4,  // All stock columns equal width
        druvam: (tableWidth * 0.6) / 4,     // All stock columns equal width
        spadikam: (tableWidth * 0.6) / 4,   // All stock columns equal width
        total: (tableWidth * 0.6) / 4       // All stock columns equal width
      };

      const col = {
        product: margin,
        warehouse: margin + colWidth.product,
        druvam: margin + colWidth.product + colWidth.warehouse,
        spadikam: margin + colWidth.product + colWidth.warehouse + colWidth.druvam,
        total: margin + colWidth.product + colWidth.warehouse + colWidth.druvam + colWidth.spadikam
      };

      const headerHeight = 5;

      // ===== HEADER ROW =====
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(33, 150, 243);
      doc.rect(margin, yPosition, tableWidth, headerHeight, 'F');

      // Draw vertical lines
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.2);
      doc.line(col.warehouse, yPosition, col.warehouse, yPosition + headerHeight);
      doc.line(col.druvam, yPosition, col.druvam, yPosition + headerHeight);
      doc.line(col.spadikam, yPosition, col.spadikam, yPosition + headerHeight);
      doc.line(col.total, yPosition, col.total, yPosition + headerHeight);

      // Header text
      doc.text('PRODUCT', col.product + 1, yPosition + 3.5);
      doc.text('WAREHOUSE', col.warehouse + colWidth.warehouse / 2, yPosition + 3.5, { align: 'center' });
      doc.text('DRUVAM', col.druvam + colWidth.druvam / 2, yPosition + 3.5, { align: 'center' });
      doc.text('SPADIKAM', col.spadikam + colWidth.spadikam / 2, yPosition + 3.5, { align: 'center' });
      doc.text('TOTAL', col.total + colWidth.total / 2, yPosition + 3.5, { align: 'center' });

      yPosition += headerHeight;

      // ===== DATA ROWS =====
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);

      filteredData.forEach((item, idx) => {
        // Calculate product text height (alias + name + category + product code)
        const aliasLines = doc.splitTextToSize(item.product_alias, colWidth.product - 2);
        const nameLines = doc.splitTextToSize(item.product_name, colWidth.product - 2);
        const categoryText = `CATEGORY: ${item.category_name}`;
        const categoryLines = doc.splitTextToSize(categoryText, colWidth.product - 2);
        const productCodeText = `PRODUCT CODE: ${item.product_code}`;
        const productCodeLines = doc.splitTextToSize(productCodeText, colWidth.product - 2);
        
        const productHeight = (aliasLines.length + nameLines.length + categoryLines.length + productCodeLines.length) * 2.2 + 2;
        const rowHeight = Math.max(productHeight, 6);

        // Check page break
        if (yPosition + rowHeight > pageHeight - 14) {
          // Footer
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

          // New page
          doc.addPage();
          yPosition = margin;

          // Repeat header
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          doc.setFillColor(33, 150, 243);
          doc.rect(margin, yPosition, tableWidth, headerHeight, 'F');

          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.2);
          doc.line(col.warehouse, yPosition, col.warehouse, yPosition + headerHeight);
          doc.line(col.druvam, yPosition, col.druvam, yPosition + headerHeight);
          doc.line(col.spadikam, yPosition, col.spadikam, yPosition + headerHeight);
          doc.line(col.total, yPosition, col.total, yPosition + headerHeight);

          doc.text('PRODUCT', col.product + 1, yPosition + 3.5);
          doc.text('WAREHOUSE', col.warehouse + colWidth.warehouse / 2, yPosition + 3.5, { align: 'center' });
          doc.text('DRUVAM', col.druvam + colWidth.druvam / 2, yPosition + 3.5, { align: 'center' });
          doc.text('SPADIKAM', col.spadikam + colWidth.spadikam / 2, yPosition + 3.5, { align: 'center' });
          doc.text('TOTAL', col.total + colWidth.total / 2, yPosition + 3.5, { align: 'center' });

          yPosition += headerHeight;
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(0, 0, 0);
        }

        // Alternate row colors
        if (idx % 2 === 1) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPosition, tableWidth, rowHeight, 'F');
        }

        // Draw borders
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.rect(margin, yPosition, tableWidth, rowHeight);

        // Vertical separators
        doc.line(col.warehouse, yPosition, col.warehouse, yPosition + rowHeight);
        doc.line(col.druvam, yPosition, col.druvam, yPosition + rowHeight);
        doc.line(col.spadikam, yPosition, col.spadikam, yPosition + rowHeight);
        doc.line(col.total, yPosition, col.total, yPosition + rowHeight);

        // Product column: alias (bold) + name (normal) + category (italic) + product code (italic) - VERTICALLY CENTERED
        const totalProductLines = aliasLines.length + nameLines.length + categoryLines.length + productCodeLines.length;
        const totalProductHeight = totalProductLines * 2.2;
        const topPadding = (rowHeight - totalProductHeight) / 2;
        let productY = yPosition + topPadding + 2.2;
        
        // Alias (bold)
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6.5);
        aliasLines.forEach((line: string) => {
          doc.text(line, col.product + 0.5, productY);
          productY += 2.2;
        });

        // Name (normal)
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6);
        nameLines.forEach((line: string) => {
          doc.text(line, col.product + 0.5, productY);
          productY += 2.2;
        });

        // Category (italic with label)
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(6);
        doc.setTextColor(80, 80, 80);
        categoryLines.forEach((line: string) => {
          doc.text(line, col.product + 0.5, productY);
          productY += 2.2;
        });

        // Product Code (italic with label)
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(6);
        doc.setTextColor(80, 80, 80);
        productCodeLines.forEach((line: string) => {
          doc.text(line, col.product + 0.5, productY);
          productY += 2.2;
        });
        doc.setTextColor(0, 0, 0);

        // Warehouse (right-aligned, 2-row format with proper spacing and vertical centering)
        const warehouseRowHeight = rowHeight;
        const warehouseCenterY = yPosition + warehouseRowHeight / 2;
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6);
        const warehouseBottles = getWarehouseDisplayPDF(item.breakdown.warehouse, item.ml_per_bottle);
        const warehouseWord = parseInt(warehouseBottles) === 1 ? 'BOTTLE' : 'BOTTLES';
        
        // First row: quantity + unit (centered above middle)
        doc.text(warehouseBottles + ' ' + warehouseWord, col.warehouse + colWidth.warehouse - 1, warehouseCenterY - 1.8, { align: 'right' });
        
        // Second row: empty/spacing for better readability
        // Third row: stays empty for gap

        // Druvam (right-aligned, 2-row format with spacing and vertical centering)
        const druvamRowHeight = rowHeight;
        const druvamCenterY = yPosition + druvamRowHeight / 2;
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6);
        const druvamStk = getStockDisplayPDF(item.breakdown.druvam, item.ml_per_bottle);
        const druvamBottleWord = parseInt(druvamStk.bottles) === 1 ? 'BOTTLE' : 'BOTTLES';
        
        // First row: Bottles
        doc.text(druvamStk.bottles + ' ' + druvamBottleWord, col.druvam + colWidth.druvam - 1, druvamCenterY - 3.2, { align: 'right' });
        
        // Second row: Pegs (with spacing gap)
        doc.text(druvamStk.pegs + ' PEGS', col.druvam + colWidth.druvam - 1, druvamCenterY + 1.5, { align: 'right' });

        // Spadikam (right-aligned, 2-row format with spacing and vertical centering)
        const spadikamRowHeight = rowHeight;
        const spadikamCenterY = yPosition + spadikamRowHeight / 2;
        
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(6);
        const spadikamStk = getStockDisplayPDF(item.breakdown.spadikam, item.ml_per_bottle);
        const spadikamBottleWord = parseInt(spadikamStk.bottles) === 1 ? 'BOTTLE' : 'BOTTLES';
        
        // First row: Bottles
        doc.text(spadikamStk.bottles + ' ' + spadikamBottleWord, col.spadikam + colWidth.spadikam - 1, spadikamCenterY - 3.2, { align: 'right' });
        
        // Second row: Pegs (with spacing gap)
        doc.text(spadikamStk.pegs + ' PEGS', col.spadikam + colWidth.spadikam - 1, spadikamCenterY + 1.5, { align: 'right' });

        // Total (right-aligned, centered with spacing)
        const totalCenterY = yPosition + rowHeight / 2;
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(6);
        const totalValue = (item.total_quantity_ml / 1000).toFixed(2);
        doc.text(totalValue + ' LITRE', col.total + colWidth.total - 1, totalCenterY, { align: 'right' });

        yPosition += rowHeight;
      });

      // ===== TOTALS ROW (with more height for spacing) =====
      const totalsHeight = 9;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(33, 150, 243);
      doc.rect(margin, yPosition, tableWidth, totalsHeight, 'F');

      // Vertical lines
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.2);
      doc.line(col.warehouse, yPosition, col.warehouse, yPosition + totalsHeight);
      doc.line(col.druvam, yPosition, col.druvam, yPosition + totalsHeight);
      doc.line(col.spadikam, yPosition, col.spadikam, yPosition + totalsHeight);
      doc.line(col.total, yPosition, col.total, yPosition + totalsHeight);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('TOTAL', col.product + 1, yPosition + totalsHeight / 2 + 1.2, { align: 'left' });
      
      // Warehouse total (bold, right-aligned, centered vertically)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      const totalWarehouseWord = totals.warehouseBottles === 1 ? 'BOTTLE' : 'BOTTLES';
      doc.text(`${totals.warehouseBottles} ${totalWarehouseWord}`, col.warehouse + colWidth.warehouse - 1, yPosition + totalsHeight / 2, { align: 'right' });
      
      // Druvam total (bold, 2-row format, right-aligned, centered vertically with gap)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      const totalDruvamWord = totals.druvamBottles === 1 ? 'BOTTLE' : 'BOTTLES';
      doc.text(`${totals.druvamBottles} ${totalDruvamWord}`, col.druvam + colWidth.druvam - 1, yPosition + totalsHeight / 2 - 2, { align: 'right' });
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(`${totals.druvamPegs.toFixed(2)} PEGS`, col.druvam + colWidth.druvam - 1, yPosition + totalsHeight / 2 + 1.5, { align: 'right' });
      
      // Spadikam total (bold, 2-row format, right-aligned, centered vertically with gap)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      const totalSpadikamWord = totals.spadikamBottles === 1 ? 'BOTTLE' : 'BOTTLES';
      doc.text(`${totals.spadikamBottles} ${totalSpadikamWord}`, col.spadikam + colWidth.spadikam - 1, yPosition + totalsHeight / 2 - 2, { align: 'right' });
      
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(`${totals.spadikamPegs.toFixed(2)} PEGS`, col.spadikam + colWidth.spadikam - 1, yPosition + totalsHeight / 2 + 1.5, { align: 'right' });
      
      // Total (BOLD value with unit, right-aligned, centered vertically)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6);
      doc.text(`${totals.totalLitres} LITRE`, col.total + colWidth.total - 1, yPosition + totalsHeight / 2, { align: 'right' });

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

      // ===== DOWNLOAD =====
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