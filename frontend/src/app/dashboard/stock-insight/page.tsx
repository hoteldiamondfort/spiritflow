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

      doc.setFont('Courier', 'bold');
      doc.setFontSize(17);
      doc.setTextColor(255, 255, 255);
      doc.text('HOTEL DIAMOND FORT', pageWidth / 2, yPosition + 4, { align: 'center' });
      
      doc.setFont('Courier', 'normal');
      doc.setFontSize(10);
      doc.text('PADA SOUTH, KARUNAGAPALLY P. O, KOLLAM, KERALA - 690518', pageWidth / 2, yPosition + 11, { align: 'center' });

      yPosition = 30;

      // ===== TITLE (with extra gap from header) =====
      doc.setFont('Courier', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('CONSOLIDATED STOCK INSIGHT', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;

      // ===== METADATA BOX (Light gray background with exact vertical centering) =====
      const metadataBoxHeight = 13;
      const metadataBoxY = yPosition;
      
      // Draw metadata box background (light gray only, no border)
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, metadataBoxY, pageWidth - margin * 2, metadataBoxHeight, 'F');
      
      // Metadata text with exact vertical centering
      doc.setFont('Courier', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      
      const reportDate = new Date().toLocaleDateString('en-IN');
      const reportTime = new Date().toLocaleTimeString('en-IN');
      const categoryDisplay = selectedCategory === 'all' ? 'ALL' : selectedCategory.toUpperCase();
      const userNameDisplay = (user?.name || 'SYSTEM USER').toUpperCase();

      // Calculate exact vertical center - equal padding top and bottom
      const metadataCenterY = metadataBoxY + metadataBoxHeight / 2;
      const lineSpacing = 4.5;

      // LEFT SIDE: Report Date & Report Time (exactly centered)
      doc.text(`REPORT DATE: ${reportDate}`, margin + 2, metadataCenterY - lineSpacing / 2);
      doc.text(`REPORT TIME: ${reportTime}`, margin + 2, metadataCenterY + lineSpacing / 2);
      
      // RIGHT SIDE: Stock Category & Generated by (exactly centered, right-aligned)
      doc.text(`STOCK CATEGORY: ${categoryDisplay}`, pageWidth - margin - 2, metadataCenterY - lineSpacing / 2, { align: 'right' });
      doc.text(`GENERATED BY: ${userNameDisplay}`, pageWidth - margin - 2, metadataCenterY + lineSpacing / 2, { align: 'right' });

      yPosition = metadataBoxY + metadataBoxHeight + 5;

      // ===== SEPARATOR =====
      doc.setDrawColor(33, 150, 243);
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 3;

      // ===== CATEGORY-WISE SUMMARY TABLE =====
      // Calculate category totals with proper bottle conversion per product
      const categoryTotals: { 
        [key: string]: { 
          warehouseBottles: number; warehousePegs: number;
          druvamBottles: number; druvamPegs: number;
          spadikamBottles: number; spadikamPegs: number;
          totalML: number;
        } 
      } = {};
      
      filteredData.forEach((item) => {
        const category = item.category_name || 'UNCATEGORIZED';
        if (!categoryTotals[category]) {
          categoryTotals[category] = { 
            warehouseBottles: 0, warehousePegs: 0,
            druvamBottles: 0, druvamPegs: 0,
            spadikamBottles: 0, spadikamPegs: 0,
            totalML: 0
          };
        }

        // Convert each product's stock using its own ml_per_bottle
        const warehouseConv = convertFromML(item.breakdown.warehouse, item.ml_per_bottle);
        const druvamConv = convertFromML(item.breakdown.druvam, item.ml_per_bottle);
        const spadikamConv = convertFromML(item.breakdown.spadikam, item.ml_per_bottle);

        // Sum bottles and pegs separately
        categoryTotals[category].warehouseBottles += warehouseConv.bottles;
        categoryTotals[category].warehousePegs += warehouseConv.pegs;
        categoryTotals[category].druvamBottles += druvamConv.bottles;
        categoryTotals[category].druvamPegs += druvamConv.pegs;
        categoryTotals[category].spadikamBottles += spadikamConv.bottles;
        categoryTotals[category].spadikamPegs += spadikamConv.pegs;
        categoryTotals[category].totalML += item.total_quantity_ml;
      });

      // Sort categories alphabetically
      const sortedCategories = Object.keys(categoryTotals).sort();

      // TABLE CONFIG FOR CATEGORY TABLE (Category: 40%, Stock columns: 15% each)
      const categoryTableWidth = pageWidth - margin * 2;
      const categoryStockWidth = categoryTableWidth * 0.6;
      const categoryColWidth = {
        category: categoryTableWidth * 0.4,
        warehouse: categoryStockWidth / 4,
        druvam: categoryStockWidth / 4,
        spadikam: categoryStockWidth / 4,
        total: categoryStockWidth / 4
      };

      const categoryCol = {
        category: margin,
        warehouse: margin + categoryColWidth.category,
        druvam: margin + categoryColWidth.category + categoryColWidth.warehouse,
        spadikam: margin + categoryColWidth.category + categoryColWidth.warehouse + categoryColWidth.druvam,
        total: margin + categoryColWidth.category + categoryColWidth.warehouse + categoryColWidth.druvam + categoryColWidth.spadikam
      };

      const headerHeight = 5;

      // CATEGORY TABLE HEADER
      doc.setFont('Courier', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(33, 150, 243);
      doc.rect(margin, yPosition, categoryTableWidth, headerHeight, 'F');

      // Draw vertical lines
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.2);
      doc.line(categoryCol.warehouse, yPosition, categoryCol.warehouse, yPosition + headerHeight);
      doc.line(categoryCol.druvam, yPosition, categoryCol.druvam, yPosition + headerHeight);
      doc.line(categoryCol.spadikam, yPosition, categoryCol.spadikam, yPosition + headerHeight);
      doc.line(categoryCol.total, yPosition, categoryCol.total, yPosition + headerHeight);

      // Header text
      doc.text('CATEGORY', categoryCol.category + 1, yPosition + 3.5);
      doc.text('WAREHOUSE', categoryCol.warehouse + categoryColWidth.warehouse / 2, yPosition + 3.5, { align: 'center' });
      doc.text('DRUVAM', categoryCol.druvam + categoryColWidth.druvam / 2, yPosition + 3.5, { align: 'center' });
      doc.text('SPADIKAM', categoryCol.spadikam + categoryColWidth.spadikam / 2, yPosition + 3.5, { align: 'center' });
      doc.text('TOTAL', categoryCol.total + categoryColWidth.total / 2, yPosition + 3.5, { align: 'center' });

      yPosition += headerHeight;

      // CATEGORY DATA ROWS
      doc.setFont('Courier', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);

      const categoryRowHeight = 7;

      sortedCategories.forEach((category, index) => {
        // Alternate row shading
        if (index % 2 === 1) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, yPosition, categoryTableWidth, categoryRowHeight, 'F');
        }

        const data = categoryTotals[category];
        const totalLitres = (data.totalML / 1000).toFixed(2);

        const categoryCenterY = yPosition + categoryRowHeight / 2;

        // Category name
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7);
        doc.text(category.substring(0, 20), categoryCol.category + 1, categoryCenterY, { align: 'left' });

        // Warehouse (single row - only bottles, right-aligned)
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7);
        const warehouseBottleWord = data.warehouseBottles === 1 ? 'BOTTLE' : 'BOTTLES';
        const warehouseFullDisplay = data.warehouseBottles + ' ' + warehouseBottleWord;
        doc.text(warehouseFullDisplay, categoryCol.warehouse + categoryColWidth.warehouse - 1, categoryCenterY, { align: 'right' });

        // Druvam (2-row format with spacing - bottles and pegs, right-aligned)
        const druvamBottleWord = data.druvamBottles === 1 ? 'BOTTLE' : 'BOTTLES';
        const druvamBottleFullDisplay = data.druvamBottles + ' ' + druvamBottleWord;
        const druvamPegsFullDisplay = data.druvamPegs.toFixed(2) + ' PEGS';
        
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7);
        doc.text(druvamBottleFullDisplay, categoryCol.druvam + categoryColWidth.druvam - 1, categoryCenterY - 1.5, { align: 'right' });
        doc.text(druvamPegsFullDisplay, categoryCol.druvam + categoryColWidth.druvam - 1, categoryCenterY + 1.5, { align: 'right' });

        // Spadikam (2-row format with spacing - bottles and pegs, right-aligned)
        const spadikamBottleWord = data.spadikamBottles === 1 ? 'BOTTLE' : 'BOTTLES';
        const spadikamBottleFullDisplay = data.spadikamBottles + ' ' + spadikamBottleWord;
        const spadikamPegsFullDisplay = data.spadikamPegs.toFixed(2) + ' PEGS';
        
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7);
        doc.text(spadikamBottleFullDisplay, categoryCol.spadikam + categoryColWidth.spadikam - 1, categoryCenterY - 1.5, { align: 'right' });
        doc.text(spadikamPegsFullDisplay, categoryCol.spadikam + categoryColWidth.spadikam - 1, categoryCenterY + 1.5, { align: 'right' });

        // Total (single row - litres, bold, right-aligned)
        doc.setFont('Courier', 'bold');
        doc.setFontSize(7);
        const totalFullDisplay = totalLitres + ' LITRE';
        doc.text(totalFullDisplay, categoryCol.total + categoryColWidth.total - 1, categoryCenterY, { align: 'right' });

        yPosition += categoryRowHeight;
      });

      // CATEGORY GRAND TOTALS ROW (matching product table style - white text on blue background)
      const categoryTotalsHeight = 7;
      // Calculate grand totals by summing all category bottles/pegs
      let categoryGrandTotalWarehouseBottles = 0;
      let categoryGrandTotalDruvamBottles = 0;
      let categoryGrandTotalSpadikamBottles = 0;
      let categoryGrandTotalML = 0;

      sortedCategories.forEach((category) => {
        const data = categoryTotals[category];
        categoryGrandTotalWarehouseBottles += data.warehouseBottles;
        categoryGrandTotalDruvamBottles += data.druvamBottles;
        categoryGrandTotalSpadikamBottles += data.spadikamBottles;
        categoryGrandTotalML += data.totalML;
      });

      // Use the exact same grand total pegs from product table (calculated using each product's ml_per_bottle)
      // This ensures category grand total matches product table grand total perfectly
      const categoryGrandTotalDruvamPegs = totals.druvamPegs;
      const categoryGrandTotalSpadikamPegs = totals.spadikamPegs;

      doc.setFillColor(33, 150, 243);
      doc.rect(margin, yPosition, categoryTableWidth, categoryTotalsHeight, 'F');

      // Draw vertical lines
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.2);
      doc.line(categoryCol.warehouse, yPosition, categoryCol.warehouse, yPosition + categoryTotalsHeight);
      doc.line(categoryCol.druvam, yPosition, categoryCol.druvam, yPosition + categoryTotalsHeight);
      doc.line(categoryCol.spadikam, yPosition, categoryCol.spadikam, yPosition + categoryTotalsHeight);
      doc.line(categoryCol.total, yPosition, categoryCol.total, yPosition + categoryTotalsHeight);

      doc.setFont('Courier', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('TOTAL', categoryCol.category + 1, yPosition + categoryTotalsHeight / 2 + 1.2, { align: 'left' });

      // Warehouse total (BOLD, 7pt, black, STRICTLY right-aligned)
      doc.setFont('Courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const categoryTotalWarehouseWord = categoryGrandTotalWarehouseBottles === 1 ? 'BOTTLE' : 'BOTTLES';
      const categoryTotalWarehouseFullDisplay = categoryGrandTotalWarehouseBottles + ' ' + categoryTotalWarehouseWord;
      doc.text(categoryTotalWarehouseFullDisplay, categoryCol.warehouse + categoryColWidth.warehouse - 1, yPosition + categoryTotalsHeight / 2, { align: 'right' });

      // Druvam total (BOLD, 7pt, black, 2-row format, STRICTLY right-aligned, CENTERED VERTICALLY)
      doc.setFont('Courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const categoryTotalDruvamWord = categoryGrandTotalDruvamBottles === 1 ? 'BOTTLE' : 'BOTTLES';
      const categoryTotalDruvamBottleFullDisplay = categoryGrandTotalDruvamBottles + ' ' + categoryTotalDruvamWord;
      doc.text(categoryTotalDruvamBottleFullDisplay, categoryCol.druvam + categoryColWidth.druvam - 1, yPosition + categoryTotalsHeight / 2 - 1.5, { align: 'right' });

      const categoryTotalDruvamPegsFullDisplay = categoryGrandTotalDruvamPegs.toFixed(2) + ' PEGS';
      doc.text(categoryTotalDruvamPegsFullDisplay, categoryCol.druvam + categoryColWidth.druvam - 1, yPosition + categoryTotalsHeight / 2 + 1.5, { align: 'right' });

      // Spadikam total (BOLD, 7pt, black, 2-row format, STRICTLY right-aligned, CENTERED VERTICALLY)
      doc.setFont('Courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const categoryTotalSpadikamWord = categoryGrandTotalSpadikamBottles === 1 ? 'BOTTLE' : 'BOTTLES';
      const categoryTotalSpadikamBottleFullDisplay = categoryGrandTotalSpadikamBottles + ' ' + categoryTotalSpadikamWord;
      doc.text(categoryTotalSpadikamBottleFullDisplay, categoryCol.spadikam + categoryColWidth.spadikam - 1, yPosition + categoryTotalsHeight / 2 - 1.5, { align: 'right' });

      const categoryTotalSpadikamPegsFullDisplay = categoryGrandTotalSpadikamPegs.toFixed(2) + ' PEGS';
      doc.text(categoryTotalSpadikamPegsFullDisplay, categoryCol.spadikam + categoryColWidth.spadikam - 1, yPosition + categoryTotalsHeight / 2 + 1.5, { align: 'right' });

      // Total (BOLD, 7pt, black, STRICTLY right-aligned)
      doc.setFont('Courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      // Use totals.totalLitres to match product table grand total exactly (eliminates rounding discrepancies)
      doc.text(totals.totalLitres + ' LITRE', categoryCol.total + categoryColWidth.total - 1, yPosition + categoryTotalsHeight / 2, { align: 'right' });

      yPosition += categoryTotalsHeight + 5;

      // ===== PRODUCT-WISE DETAILS SUBHEADING =====
      doc.setFont('Courier', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text('PRODUCT-WISE DETAILS', margin, yPosition);
      yPosition += 5;

      // ===== SEPARATOR =====
      doc.setDrawColor(33, 150, 243);
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 3;
      const tableWidth = pageWidth - margin * 2;
      const stockColumnsWidth = tableWidth * 0.6;
      const colWidth = {
        product: tableWidth * 0.4,           // 40% of width
        warehouse: stockColumnsWidth / 4,    // 15% each (equal)
        druvam: stockColumnsWidth / 4,       // 15% each (equal)
        spadikam: stockColumnsWidth / 4,     // 15% each (equal)
        total: stockColumnsWidth / 4         // 15% each (equal)
      };

      const col = {
        product: margin,
        warehouse: margin + colWidth.product,
        druvam: margin + colWidth.product + colWidth.warehouse,
        spadikam: margin + colWidth.product + colWidth.warehouse + colWidth.druvam,
        total: margin + colWidth.product + colWidth.warehouse + colWidth.druvam + colWidth.spadikam
      };

      const productHeaderHeight = 5;

      // ===== HEADER ROW =====
      doc.setFont('Courier', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(33, 150, 243);
      doc.rect(margin, yPosition, tableWidth, productHeaderHeight, 'F');

      // Draw vertical lines
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.2);
      doc.line(col.warehouse, yPosition, col.warehouse, yPosition + productHeaderHeight);
      doc.line(col.druvam, yPosition, col.druvam, yPosition + productHeaderHeight);
      doc.line(col.spadikam, yPosition, col.spadikam, yPosition + productHeaderHeight);
      doc.line(col.total, yPosition, col.total, yPosition + productHeaderHeight);

      // Header text
      doc.text('PRODUCT', col.product + 1, yPosition + 3.5);
      doc.text('WAREHOUSE', col.warehouse + colWidth.warehouse / 2, yPosition + 3.5, { align: 'center' });
      doc.text('DRUVAM', col.druvam + colWidth.druvam / 2, yPosition + 3.5, { align: 'center' });
      doc.text('SPADIKAM', col.spadikam + colWidth.spadikam / 2, yPosition + 3.5, { align: 'center' });
      doc.text('TOTAL', col.total + colWidth.total / 2, yPosition + 3.5, { align: 'center' });

      yPosition += productHeaderHeight;

      // ===== DATA ROWS =====
      doc.setFont('Courier', 'normal');
      doc.setFontSize(9);
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
          
          doc.setFont('Courier', 'italic');
          doc.setFontSize(7);
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
          doc.setFont('Courier', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(255, 255, 255);
          doc.setFillColor(33, 150, 243);
          doc.rect(margin, yPosition, tableWidth, productHeaderHeight, 'F');

          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.2);
          doc.line(col.warehouse, yPosition, col.warehouse, yPosition + productHeaderHeight);
          doc.line(col.druvam, yPosition, col.druvam, yPosition + productHeaderHeight);
          doc.line(col.spadikam, yPosition, col.spadikam, yPosition + productHeaderHeight);
          doc.line(col.total, yPosition, col.total, yPosition + productHeaderHeight);

          doc.text('PRODUCT', col.product + 1, yPosition + 3.5);
          doc.text('WAREHOUSE', col.warehouse + colWidth.warehouse / 2, yPosition + 3.5, { align: 'center' });
          doc.text('DRUVAM', col.druvam + colWidth.druvam / 2, yPosition + 3.5, { align: 'center' });
          doc.text('SPADIKAM', col.spadikam + colWidth.spadikam / 2, yPosition + 3.5, { align: 'center' });
          doc.text('TOTAL', col.total + colWidth.total / 2, yPosition + 3.5, { align: 'center' });

          yPosition += productHeaderHeight;
          doc.setFont('Courier', 'normal');
          doc.setFontSize(8);
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
        doc.setFont('Courier', 'bold');
        doc.setFontSize(7.5);
        aliasLines.forEach((line: string) => {
          doc.text(line, col.product + 0.5, productY);
          productY += 2.2;
        });

        // Name (normal)
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7);
        nameLines.forEach((line: string) => {
          doc.text(line, col.product + 0.5, productY);
          productY += 2.2;
        });

        // Category (italic with label)
        doc.setFont('Courier', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        categoryLines.forEach((line: string) => {
          doc.text(line, col.product + 0.5, productY);
          productY += 2.2;
        });

        // Product Code (italic with label)
        doc.setFont('Courier', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        productCodeLines.forEach((line: string) => {
          doc.text(line, col.product + 0.5, productY);
          productY += 2.2;
        });
        doc.setTextColor(0, 0, 0);

        // Warehouse (strict right-align, minimal spacing, 6pt uniform black)
        const warehouseRowHeight = rowHeight;
        const warehouseCenterY = yPosition + warehouseRowHeight / 2;
        
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        const warehouseBottles = getWarehouseDisplayPDF(item.breakdown.warehouse, item.ml_per_bottle);
        const warehouseWord = parseInt(warehouseBottles) === 1 ? 'BOTTLE' : 'BOTTLES';
        
        // Single row: quantity + unit (both 6pt, black, regular, STRICTLY right-aligned)
        const warehouseFullDisplay = warehouseBottles + ' ' + warehouseWord;
        doc.text(warehouseFullDisplay, col.warehouse + colWidth.warehouse - 1, warehouseCenterY, { align: 'right' });

        // Druvam (strict right-align, tighter spacing, 6pt uniform black, CENTERED VERTICALLY)
        const druvamRowHeight = rowHeight;
        const druvamCenterY = yPosition + druvamRowHeight / 2;
        
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        const druvamStk = getStockDisplayPDF(item.breakdown.druvam, item.ml_per_bottle);
        const druvamBottleWord = parseInt(druvamStk.bottles) === 1 ? 'BOTTLE' : 'BOTTLES';
        
        // First row: Bottles (6pt, black, regular, STRICTLY right-aligned, centered)
        const druvamBottleFullDisplay = druvamStk.bottles + ' ' + druvamBottleWord;
        doc.text(druvamBottleFullDisplay, col.druvam + colWidth.druvam - 1, druvamCenterY - 1.5, { align: 'right' });
        
        // Second row: Pegs (6pt, black, regular, STRICTLY right-aligned, centered)
        const druvamPegsFullDisplay = druvamStk.pegs + ' PEGS';
        doc.text(druvamPegsFullDisplay, col.druvam + colWidth.druvam - 1, druvamCenterY + 1.5, { align: 'right' });

        // Spadikam (strict right-align, tighter spacing, 6pt uniform black, CENTERED VERTICALLY)
        const spadikamRowHeight = rowHeight;
        const spadikamCenterY = yPosition + spadikamRowHeight / 2;
        
        doc.setFont('Courier', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        const spadikamStk = getStockDisplayPDF(item.breakdown.spadikam, item.ml_per_bottle);
        const spadikamBottleWord = parseInt(spadikamStk.bottles) === 1 ? 'BOTTLE' : 'BOTTLES';
        
        // First row: Bottles (6pt, black, regular, STRICTLY right-aligned, centered)
        const spadikamBottleFullDisplay = spadikamStk.bottles + ' ' + spadikamBottleWord;
        doc.text(spadikamBottleFullDisplay, col.spadikam + colWidth.spadikam - 1, spadikamCenterY - 1.5, { align: 'right' });
        
        // Second row: Pegs (6pt, black, regular, STRICTLY right-aligned, centered)
        const spadikamPegsFullDisplay = spadikamStk.pegs + ' PEGS';
        doc.text(spadikamPegsFullDisplay, col.spadikam + colWidth.spadikam - 1, spadikamCenterY + 1.5, { align: 'right' });

        // Total (BOLD quantity + unit, 6pt, black, STRICTLY right-aligned)
        const totalCenterY = yPosition + rowHeight / 2;
        doc.setFont('Courier', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        const totalValue = (item.total_quantity_ml / 1000).toFixed(2);
        const totalFullDisplay = totalValue + ' LITRE';
        doc.text(totalFullDisplay, col.total + colWidth.total - 1, totalCenterY, { align: 'right' });

        yPosition += rowHeight;
      });

      // ===== TOTALS ROW (with more height for spacing) =====
      const totalsHeight = 9;
      doc.setFont('Courier', 'bold');
      doc.setFontSize(8);
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

      doc.setFont('Courier', 'bold');
      doc.setFontSize(9);
      doc.text('TOTAL', col.product + 1, yPosition + totalsHeight / 2 + 1.2, { align: 'left' });
      
      // Warehouse total (BOLD, 6pt, black, STRICTLY right-aligned)
      doc.setFont('Courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const productTotalWarehouseWord = totals.warehouseBottles === 1 ? 'BOTTLE' : 'BOTTLES';
      const productTotalWarehouseFullDisplay = totals.warehouseBottles + ' ' + productTotalWarehouseWord;
      doc.text(productTotalWarehouseFullDisplay, col.warehouse + colWidth.warehouse - 1, yPosition + totalsHeight / 2, { align: 'right' });
      
      // Druvam total (BOLD, 6pt, black, 2-row format, STRICTLY right-aligned, CENTERED VERTICALLY)
      doc.setFont('Courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const productTotalDruvamWord = totals.druvamBottles === 1 ? 'BOTTLE' : 'BOTTLES';
      const productTotalDruvamBottleFullDisplay = totals.druvamBottles + ' ' + productTotalDruvamWord;
      doc.text(productTotalDruvamBottleFullDisplay, col.druvam + colWidth.druvam - 1, yPosition + totalsHeight / 2 - 1.5, { align: 'right' });
      
      const productTotalDruvamPegsFullDisplay = totals.druvamPegs.toFixed(2) + ' PEGS';
      doc.text(productTotalDruvamPegsFullDisplay, col.druvam + colWidth.druvam - 1, yPosition + totalsHeight / 2 + 1.5, { align: 'right' });
      
      // Spadikam total (BOLD, 6pt, black, 2-row format, STRICTLY right-aligned, CENTERED VERTICALLY)
      doc.setFont('Courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const productTotalSpadikamWord = totals.spadikamBottles === 1 ? 'BOTTLE' : 'BOTTLES';
      const productTotalSpadikamBottleFullDisplay = totals.spadikamBottles + ' ' + productTotalSpadikamWord;
      doc.text(productTotalSpadikamBottleFullDisplay, col.spadikam + colWidth.spadikam - 1, yPosition + totalsHeight / 2 - 1.5, { align: 'right' });
      
      const productTotalSpadikamPegsFullDisplay = totals.spadikamPegs.toFixed(2) + ' PEGS';
      doc.text(productTotalSpadikamPegsFullDisplay, col.spadikam + colWidth.spadikam - 1, yPosition + totalsHeight / 2 + 1.5, { align: 'right' });
      
      // Total (BOLD, 6pt, black, STRICTLY right-aligned)
      doc.setFont('Courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      const totalLitresFullDisplay = totals.totalLitres + ' LITRE';
      doc.text(totalLitresFullDisplay, col.total + colWidth.total - 1, yPosition + totalsHeight / 2, { align: 'right' });

      // ===== FOOTER =====
      doc.setDrawColor(33, 150, 243);
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

      doc.setFont('Courier', 'italic');
      doc.setFontSize(7);
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