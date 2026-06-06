const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

// Helper function to convert to uppercase
const toUpperCase = (obj) => {
  const result = {};
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'string') {
      result[key] = obj[key].toUpperCase();
    } else {
      result[key] = obj[key];
    }
  });
  return result;
};

// GET all products
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_on', { ascending: false });

    if (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }

    res.json({
      status: 'success',
      message: 'Products fetched successfully',
      count: data.length,
      data: data
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET product by ID
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    res.json({
      status: 'success',
      message: 'Product fetched successfully',
      data: data
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// CREATE product
router.post('/', async (req, res) => {
  try {
    const {
      category_name,
      product_code,
      product_name,
      product_alias,
      manufacturer_name,
      ml_per_bottle,
      bottles_per_case,
      rate_per_bottle,
      product_description,
      product_status,
      created_by
    } = req.body;

    // Validate mandatory fields
    if (!category_name || !product_name || !product_alias || !ml_per_bottle || !bottles_per_case || !rate_per_bottle || !product_status) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required fields: category_name, product_name, product_alias, ml_per_bottle, bottles_per_case, rate_per_bottle, product_status'
      });
    }

    // Convert all strings to uppercase
    const uppercaseData = {
      category_name: category_name.toUpperCase(),
      product_code: product_code ? product_code.toUpperCase() : null,
      product_name: product_name.toUpperCase(),
      product_alias: product_alias.toUpperCase(),
      manufacturer_name: manufacturer_name ? manufacturer_name.toUpperCase() : null,
      product_description: product_description ? product_description.toUpperCase() : null,
      product_status: product_status.toUpperCase()
    };

    // Calculate purchase_rate_per_ml
    const purchase_rate_per_ml = rate_per_bottle / ml_per_bottle;

    const { data, error } = await supabase
      .from('products')
      .insert([{
        category_name: uppercaseData.category_name,
        product_code: uppercaseData.product_code,
        product_name: uppercaseData.product_name,
        product_alias: uppercaseData.product_alias,
        manufacturer_name: uppercaseData.manufacturer_name,
        ml_per_bottle: parseInt(ml_per_bottle),
        bottles_per_case: parseInt(bottles_per_case),
        purchase_rate_per_ml: parseFloat(purchase_rate_per_ml),
        product_description: uppercaseData.product_description,
        product_status: uppercaseData.product_status,
        created_by
      }])
      .select()
      .single();

    if (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }

    res.status(201).json({
      status: 'success',
      message: 'Product created successfully',
      data: data
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// UPDATE product
router.put('/:id', async (req, res) => {
  try {
    const {
      category_name,
      product_code,
      product_name,
      product_alias,
      manufacturer_name,
      ml_per_bottle,
      bottles_per_case,
      rate_per_bottle,
      product_description,
      product_status,
      created_by
    } = req.body;

    // Convert all strings to uppercase
    const uppercaseData = {
      category_name: category_name.toUpperCase(),
      product_code: product_code ? product_code.toUpperCase() : null,
      product_name: product_name.toUpperCase(),
      product_alias: product_alias.toUpperCase(),
      manufacturer_name: manufacturer_name ? manufacturer_name.toUpperCase() : null,
      product_description: product_description ? product_description.toUpperCase() : null,
      product_status: product_status.toUpperCase()
    };

    // Build update object
    const updateData = {
      category_name: uppercaseData.category_name,
      product_code: uppercaseData.product_code,
      product_name: uppercaseData.product_name,
      product_alias: uppercaseData.product_alias,
      manufacturer_name: uppercaseData.manufacturer_name,
      ml_per_bottle: parseInt(ml_per_bottle),
      bottles_per_case: parseInt(bottles_per_case),
      product_description: uppercaseData.product_description,
      product_status: uppercaseData.product_status,
      last_updated_by: created_by,
      last_updated_on: new Date().toISOString()
    };

    // Calculate purchase_rate_per_ml if provided
    if (rate_per_bottle && ml_per_bottle) {
      updateData.purchase_rate_per_ml = parseFloat(rate_per_bottle / ml_per_bottle);
    }

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('product_id', req.params.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ status: 'error', message: error.message });
    }

    res.json({
      status: 'success',
      message: 'Product updated successfully',
      data: data
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;