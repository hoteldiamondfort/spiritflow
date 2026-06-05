const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, stock_point, role } = req.body;

    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          stock_point: stock_point || null,
          role: role || 'user'
        }
      }
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    // Create user profile in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          auth_id: authData.user.id,
          email,
          name,
          stock_point: stock_point || null,
          role: role || 'user',
          status: 'active'
        }
      ])
      .select();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    res.status(201).json({
      message: 'User created successfully. Check email for confirmation.',
      user: userData[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Get user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      return res.status(400).json({ error: userError.message });
    }

    res.json({
      message: 'Login successful',
      token: data.session.access_token,
      user: userData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;