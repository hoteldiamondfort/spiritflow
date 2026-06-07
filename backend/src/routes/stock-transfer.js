const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// POST /api/stock-transfer - Create stock transfer
// Request body:
// {
//   "items": [
//     { "product_id": "uuid", "quantity_ml": 7800 },
//     { "product_id": "uuid", "quantity_ml": 3900 }
//   ],
//   "from_stock_point_id": "warehouse",
//   "to_stock_point_id": "druvam",
//   "reference_id": "TRANSFER-001",  // Optional
//   "notes": "Test transfer",         // Optional
//   "created_by": "user-uuid"
// }

router.post('/', async (req, res) => {
  try {
    const {
      items,
      from_stock_point_id,
      to_stock_point_id,
      reference_id,
      notes,
      created_by
    } = req.body;

    // ========================================
    // VALIDATION
    // ========================================

    // Check items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Items array is required and cannot be empty'
      });
    }

    // Check stock points
    if (!from_stock_point_id || !to_stock_point_id) {
      return res.status(400).json({
        status: 'error',
        message: 'from_stock_point_id and to_stock_point_id are required'
      });
    }

    const validStockPoints = ['warehouse', 'druvam', 'spadikam'];
    if (!validStockPoints.includes(from_stock_point_id)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid from_stock_point_id. Must be one of: ${validStockPoints.join(', ')}`
      });
    }

    if (!validStockPoints.includes(to_stock_point_id)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid to_stock_point_id. Must be one of: ${validStockPoints.join(', ')}`
      });
    }

    if (from_stock_point_id === to_stock_point_id) {
      return res.status(400).json({
        status: 'error',
        message: 'FROM and TO stock points cannot be the same'
      });
    }

    // Check user
    if (!created_by) {
      return res.status(400).json({
        status: 'error',
        message: 'created_by (user UUID) is required'
      });
    }

    // ========================================
    // VALIDATE STOCK AVAILABILITY
    // ========================================

    for (const item of items) {
      if (!item.product_id || !item.quantity_ml) {
        return res.status(400).json({
          status: 'error',
          message: 'Each item must have product_id and quantity_ml'
        });
      }

      if (item.quantity_ml <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'quantity_ml must be greater than 0'
        });
      }

      // Check product exists
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('product_id, product_name, product_alias')
        .eq('product_id', item.product_id)
        .single();

      if (productError || !product) {
        return res.status(404).json({
          status: 'error',
          message: `Product with ID ${item.product_id} not found`,
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      // Check stock availability
      const { data: stock, error: stockError } = await supabase
        .from('stock_inventory')
        .select('current_quantity_ml')
        .eq('product_id', item.product_id)
        .eq('stock_point_id', from_stock_point_id)
        .single();

      if (stockError || !stock) {
        return res.status(404).json({
          status: 'error',
          message: `Stock record not found for ${product.product_alias} at ${from_stock_point_id}`,
          code: 'STOCK_NOT_FOUND'
        });
      }

      if (stock.current_quantity_ml < item.quantity_ml) {
        return res.status(400).json({
          status: 'error',
          message: `Insufficient stock for ${product.product_alias}. Available: ${stock.current_quantity_ml} ML, Requested: ${item.quantity_ml} ML`,
          code: 'INSUFFICIENT_STOCK'
        });
      }
    }

    // ========================================
    // CREATE TRANSACTIONS
    // ========================================

    const transactions = items.map(item => ({
      product_id: item.product_id,
      from_stock_point_id,
      to_stock_point_id,
      transaction_type: 'STOCK_TRANSFER',
      quantity_ml: item.quantity_ml,
      reference_id: reference_id || null,
      notes: notes || null,
      created_by,
      outlet_id: null
    }));

    // Insert all transactions at once
    const { data: insertedTransactions, error: insertError } = await supabase
      .from('stock_transactions')
      .insert(transactions)
      .select();

    if (insertError) {
      console.error('Error inserting stock transfer transactions:', insertError);
      throw insertError;
    }

    // ========================================
    // RESPONSE
    // ========================================

    res.status(201).json({
      status: 'success',
      message: 'Stock transfer created successfully',
      data: {
        transaction_count: insertedTransactions.length,
        transaction_ids: insertedTransactions.map(t => t.transaction_id),
        from_stock_point: from_stock_point_id,
        to_stock_point: to_stock_point_id,
        reference_id: reference_id || null,
        created_by,
        created_on: new Date().toISOString(),
        transactions: insertedTransactions.map(t => ({
          transaction_id: t.transaction_id,
          product_id: t.product_id,
          quantity_ml: t.quantity_ml
        }))
      }
    });

  } catch (error) {
    console.error('Stock transfer error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
      details: error.details || null
    });
  }
});

module.exports = router;