const express = require('express');
const router = express.Router();

// Import Supabase with proper error handling
let supabase;
try {
  const supabaseConfig = require('../config/supabase');
  // Handle different export styles
  supabase = supabaseConfig.supabase || supabaseConfig.default || supabaseConfig;
  
  if (!supabase) {
    throw new Error('Supabase client not found in config');
  }
  console.log('✅ Supabase client loaded');
} catch (error) {
  console.error('❌ Failed to load Supabase client:', error.message);
}

router.post('/', async (req, res) => {
  try {
    // Check if supabase is available
    if (!supabase) {
      return res.status(500).json({
        status: 'error',
        message: 'Supabase client not initialized'
      });
    }

    const {
      items,
      from_stock_point_id,
      to_stock_point_id,
      reference_id,
      notes,
      created_by
    } = req.body;

    console.log('🔍 DEBUG: Received stock transfer request');
    console.log('Items:', JSON.stringify(items, null, 2));
    console.log('From:', from_stock_point_id);
    console.log('To:', to_stock_point_id);
    console.log('User:', created_by);

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Items array is required and cannot be empty'
      });
    }

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

    if (!created_by) {
      return res.status(400).json({
        status: 'error',
        message: 'created_by (user UUID) is required'
      });
    }

    // Validate stock availability
    console.log('🔍 DEBUG: Validating stock availability...');
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
        console.log('❌ Product not found:', item.product_id, productError);
        return res.status(404).json({
          status: 'error',
          message: `Product with ID ${item.product_id} not found`,
          code: 'PRODUCT_NOT_FOUND'
        });
      }

      console.log('✅ Product found:', product.product_alias);

      // Check stock availability
      const { data: stock, error: stockError } = await supabase
        .from('stock_inventory')
        .select('current_quantity_ml')
        .eq('product_id', item.product_id)
        .eq('stock_point_id', from_stock_point_id)
        .single();

      if (stockError || !stock) {
        console.log('❌ Stock record not found:', { product_id: item.product_id, stock_point_id: from_stock_point_id }, stockError);
        return res.status(404).json({
          status: 'error',
          message: `Stock record not found for ${product.product_alias} at ${from_stock_point_id}`,
          code: 'STOCK_NOT_FOUND'
        });
      }

      console.log('✅ Stock found:', stock.current_quantity_ml, 'ML');

      if (stock.current_quantity_ml < item.quantity_ml) {
        console.log('❌ Insufficient stock');
        return res.status(400).json({
          status: 'error',
          message: `Insufficient stock for ${product.product_alias}. Available: ${stock.current_quantity_ml} ML, Requested: ${item.quantity_ml} ML`,
          code: 'INSUFFICIENT_STOCK'
        });
      }
    }

    // Create transactions
    console.log('🔍 DEBUG: Creating transactions...');
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

    console.log('Transactions to insert:', JSON.stringify(transactions, null, 2));

    // Insert all transactions
    console.log('🔍 DEBUG: Calling supabase.from().insert()...');
    const { data: insertedTransactions, error: insertError } = await supabase
      .from('stock_transactions')
      .insert(transactions)
      .select();

    console.log('🔍 DEBUG: Insert response received');
    console.log('Data:', insertedTransactions);
    console.log('Error:', insertError);

    if (insertError) {
      console.error('❌ Supabase error:', insertError);
      return res.status(400).json({
        status: 'error',
        message: insertError.message || 'Failed to insert transactions',
        details: insertError
      });
    }

    if (!insertedTransactions || insertedTransactions.length === 0) {
      console.error('❌ No transactions were inserted! Check RLS policies.');
      return res.status(400).json({
        status: 'error',
        message: 'No transactions were inserted. Check database RLS policies.',
        debug: 'insertedTransactions is empty'
      });
    }

    console.log('✅ Transactions inserted successfully:', insertedTransactions.length);

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
    console.error('❌ Stock transfer error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;