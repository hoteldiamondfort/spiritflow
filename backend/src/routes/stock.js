const express = require('express');
const router = express.Router();

// Import Supabase - handle both export styles
let supabase;
try {
  const supabaseConfig = require('../config/supabase');
  // Try different export patterns
  supabase = supabaseConfig.supabase || supabaseConfig.default || supabaseConfig;
} catch (error) {
  console.error('Failed to import Supabase:', error.message);
}

// Helper function to calculate cases and bottles from ML
const calculateCasesBottles = (ml, mlPerBottle, bottlesPerCase) => {
  const totalBottles = Math.floor(ml / mlPerBottle);
  const cases = Math.floor(totalBottles / bottlesPerCase);
  const bottles = totalBottles % bottlesPerCase;
  return { cases, bottles };
};

// GET /api/stock/total - Get total stock across all stock points
// Query: ?product_id=uuid (optional)
router.get('/total', async (req, res) => {
  try {
    // Check if Supabase is initialized
    if (!supabase) {
      return res.status(500).json({
        status: 'error',
        message: 'Supabase client not initialized'
      });
    }

    const { product_id } = req.query;

    const { data: stockData, error } = await supabase
      .from('products')
      .select(`
        product_id,
        product_name,
        product_alias,
        ml_per_bottle,
        bottles_per_case,
        stock_inventory (
          stock_point_id,
          current_quantity_ml
        )
      `)
      .order('product_alias');

    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }

    if (!stockData) {
      return res.json({
        status: 'success',
        data: []
      });
    }

    // Group by product and calculate totals
    const result = stockData.map(product => {
      const breakdown = {
        warehouse: 0,
        druvam: 0,
        spadikam: 0
      };
      let total = 0;

      if (product.stock_inventory && Array.isArray(product.stock_inventory)) {
        product.stock_inventory.forEach(stock => {
          breakdown[stock.stock_point_id] = stock.current_quantity_ml;
          total += stock.current_quantity_ml;
        });
      }

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        product_alias: product.product_alias,
        ml_per_bottle: product.ml_per_bottle,
        bottles_per_case: product.bottles_per_case,
        total_quantity_ml: total,
        breakdown
      };
    });

    // Filter by product_id if provided
    const filteredResult = product_id 
      ? result.find(p => p.product_id === product_id)
      : result;

    if (product_id && !filteredResult) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
        code: 404
      });
    }

    res.json({
      status: 'success',
      data: filteredResult
    });
  } catch (error) {
    console.error('Error fetching stock total:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error'
    });
  }
});

module.exports = router;