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

    if (!['CORRECTION', 'CLOSING_STOCK'].includes(adjustment_type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid adjustment_type. Must be CORRECTION or CLOSING_STOCK'
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

    } else if (adjustment_type === 'CLOSING_STOCK') {
      // ============================================
      // TYPE 2: CLOSING_STOCK
      // ============================================
      // Two operations:
      // 1. DIRECTLY UPDATE stock_inventory with closing quantity
      // 2. INSERT INTO stock_transactions with SALES (for audit trail)
      //
      // Example:
      //   Opening: 3000ml
      //   Closing: 2500ml (user enters)
      //   Sales: 500ml (calculated difference)
      //   Result: stock_inventory becomes 2500ml, SALES transaction shows 500ml sold
      // ============================================
      console.log('📊 Mode: CLOSING_STOCK - Updating stock + Creating SALES transactions');

      const transaction_ids = [];
      let itemsUpdated = 0;
      let itemsWithSales = 0;

      for (const item of items) {
        const {
          product_id,
          current_quantity_ml,
          adjusted_quantity_ml
        } = item;

        console.log(`  📝 Processing: ${product_id}`);
        console.log(`     Current: ${current_quantity_ml}ml → Closing: ${adjusted_quantity_ml}ml`);

        // ========================================
        // STEP 1: DIRECTLY UPDATE stock_inventory
        // ========================================
        // Set the closing quantity as the new current stock
        console.log(`  📥 Updating stock_inventory to ${adjusted_quantity_ml}ml`);

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
          console.error(`  ❌ Stock update failed for ${product_id}:`, updateError.message);
          throw new Error(`Failed to update stock for product ${product_id}: ${updateError.message}`);
        }

        console.log(`  ✅ Stock updated to ${adjusted_quantity_ml}ml`);
        itemsUpdated++;

        // ========================================
        // STEP 2: Create SALES transaction (audit trail)
        // ========================================
        // Only if there's a difference (stock was sold/lost)
        const quantityToSell = current_quantity_ml - adjusted_quantity_ml;

        if (quantityToSell > 0) {
          console.log(`  📊 Quantity difference: ${quantityToSell}ml (to be recorded as SALES)`);

          // Insert SALES transaction for audit trail
          const { data: transactionData, error: insertError } = await supabase
            .from('stock_transactions')
            .insert([
              {
                product_id,
                from_stock_point_id: stock_point_id,
                to_stock_point_id: null,
                outlet_id: null,
                transaction_type: 'SALES',
                quantity_ml: quantityToSell,
                reference_id: `CLOSING-${date}-${stock_point_id}`,
                notes: `Closing stock adjustment. Reason: ${reason || 'None'}`,
                created_by,
                created_on: new Date().toISOString()
              }
            ])
            .select('transaction_id');

          if (insertError) {
            console.error(`  ❌ SALES transaction insert failed for ${product_id}:`, insertError.message);
            throw new Error(`Failed to create SALES transaction for product ${product_id}: ${insertError.message}`);
          }

          if (transactionData && transactionData.length > 0) {
            const txnId = transactionData[0].transaction_id;
            transaction_ids.push(txnId);
            console.log(`  ✅ SALES transaction created: ${txnId} (${quantityToSell}ml)`);
            itemsWithSales++;
          }
        } else if (quantityToSell === 0) {
          console.log(`  ℹ️  No difference - stock unchanged, no SALES transaction created`);
        } else {
          console.log(`  ⚠️  Stock increased (${Math.abs(quantityToSell)}ml) - no SALES transaction for increase`);
        }
      }

      console.log(`✅ CLOSING_STOCK complete:`);
      console.log(`   - ${itemsUpdated} items stock updated`);
      console.log(`   - ${transaction_ids.length} SALES transactions created`);

      return res.json({
        status: 'success',
        message: 'Closing stock adjustment completed successfully',
        data: {
          adjustment_type: 'CLOSING_STOCK',
          items_updated: itemsUpdated,
          transaction_ids,
          transactions_created: transaction_ids.length,
          stock_point: stock_point_id,
          note: 'Closing stock quantities directly updated. SALES transactions recorded for audit trail.'
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