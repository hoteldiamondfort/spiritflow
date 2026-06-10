const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

// POST /api/stock-adjustment
router.post('/', async (req, res) => {
  try {
    const {
      date,
      stock_point_id,
      adjustment_type,
      items,
      reason,
      created_by
    } = req.body;

    // Validation
    if (!date || !stock_point_id || !adjustment_type || !items || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: date, stock_point_id, adjustment_type, items'
      });
    }

    // Validate adjustment type (only CORRECTION is supported for now)
    if (adjustment_type !== 'CORRECTION') {
      return res.status(400).json({
        status: 'error',
        message: 'Only CORRECTION adjustment type is currently supported'
      });
    }

    console.log(`📝 Processing stock adjustment: ${adjustment_type} for ${stock_point_id} on ${date}`);
    console.log(`📊 Items to adjust: ${items.length}`);

    if (adjustment_type === 'CORRECTION') {
      // ============================================
      // TYPE 1: CORRECTION
      // ============================================
      // Direct update to stock_inventory
      // User corrects the stock quantity directly
      // No transaction created (just correction)
      // ============================================
      console.log('🔧 Mode: CORRECTION - Directly updating stock_inventory');

      for (const item of items) {
        const { product_id, adjusted_quantity_ml } = item;

        console.log(`  🔄 Updating product ${product_id} to ${adjusted_quantity_ml}ml in ${stock_point_id}`);

        // Update stock_inventory directly
        const { error: updateError } = await supabase
          .from('stock_inventory')
          .update({
            current_quantity_ml: adjusted_quantity_ml,
            last_updated_on: new Date().toISOString(),
            last_updated_by: created_by
          })
          .eq('product_id', product_id)
          .eq('stock_point_id', stock_point_id);

        if (updateError) {
          console.error(`  ❌ Update failed for product ${product_id}:`, updateError.message);
          throw new Error(`Failed to update stock for product ${product_id}: ${updateError.message}`);
        }

        console.log(`  ✅ Updated: ${product_id} to ${adjusted_quantity_ml}ml`);
      }

      console.log('✅ CORRECTION complete - stock_inventory updated directly');

      return res.json({
        status: 'success',
        message: 'Stock correction applied successfully',
        data: {
          adjustment_type: 'CORRECTION',
          items_adjusted: items.length,
          stock_point: stock_point_id
        }
      });
    }

  } catch (error) {
    console.error('❌ Stock adjustment error:', error.message);
    console.error(error.stack);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to process stock adjustment'
    });
  }
});

module.exports = router;