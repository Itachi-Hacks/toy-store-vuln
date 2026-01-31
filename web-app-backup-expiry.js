// ============================================================
// ToyStore VulnLab – Web Application (Express.js)
// Intentionally Vulnerable E-commerce Site
// ============================================================

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const { Pool } = require('pg');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: '/tmp/uploads/' });

// ── Database Connection ──
const pool = new Pool({
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'vulnlab',
    user: process.env.DB_USER || 'vulnuser',
    password: process.env.DB_PASS || 'vulnpass'
});

// ── Middleware ──
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'weak-secret-key-12345',  // Vulnerability: weak secret
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false,  // Vulnerability: no secure flag
        httpOnly: false  // Vulnerability: allows JavaScript access
    }
}));

// Vulnerability: No security headers
app.use((req, res, next) => {
    // Missing: CSP, X-Frame-Options, HSTS, etc.
    next();
});

// ──────────────────────────────────
// Helper Functions
// ──────────────────────────────────

function md5(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function isLoggedIn(req) {
    return req.session && req.session.userId;
}

function isAdmin(req) {
    return req.session && req.session.role === 'admin';
}

// ──────────────────────────────────
// ROUTES
// ──────────────────────────────────

// ═══════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════
app.get('/', async (req, res) => {
    try {
        const products = await pool.query(
            'SELECT * FROM products ORDER BY created_at DESC LIMIT 12'
        );
        
        const categories = await pool.query(
            'SELECT DISTINCT category FROM products WHERE category IS NOT NULL'
        );

        let cartCount = 0;
        if (isLoggedIn(req)) {
            const cart = await pool.query(
                'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
                [req.session.userId]
            );
            cartCount = cart.rows[0].count || 0;
        }

        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>ToyStore - Best Toys for Kids</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 32px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 25px; align-items: center; }
        .nav a { color: white; text-decoration: none; font-size: 16px; transition: opacity 0.3s; }
        .nav a:hover { opacity: 0.8; }
        .cart-badge { background: #ff6b6b; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 5px; }
        .search-bar { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .search-input { width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
        .categories { max-width: 1200px; margin: 20px auto; padding: 0 20px; display: flex; gap: 15px; flex-wrap: wrap; }
        .category-btn { padding: 10px 20px; background: white; border: 2px solid #667eea; color: #667eea; border-radius: 20px; text-decoration: none; transition: all 0.3s; }
        .category-btn:hover { background: #667eea; color: white; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
        .product-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s; }
        .product-card:hover { transform: translateY(-5px); box-shadow: 0 8px 15px rgba(0,0,0,0.2); }
        .product-image { width: 100%; height: 250px; object-fit: cover; }
        .product-info { padding: 15px; }
        .product-name { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 8px; }
        .product-price { font-size: 24px; color: #667eea; font-weight: bold; margin: 10px 0; }
        .product-brand { font-size: 13px; color: #888; margin-bottom: 5px; }
        .age-range { display: inline-block; background: #e3f2fd; color: #1976d2; padding: 4px 10px; border-radius: 12px; font-size: 12px; margin-top: 5px; }
        .view-btn { display: block; width: 100%; padding: 12px; background: #667eea; color: white; text-align: center; text-decoration: none; border-radius: 6px; margin-top: 10px; font-weight: bold; transition: background 0.3s; }
        .view-btn:hover { background: #764ba2; }
        .footer { background: #333; color: white; padding: 40px 20px; margin-top: 50px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/shop">Shop</a>
                <a href="/deals">Deals</a>
                ${isLoggedIn(req) ? `
                    <a href="/cart">🛒 Cart <span class="cart-badge">${cartCount}</span></a>
                    <a href="/orders">Orders</a>
                    <a href="/profile/${req.session.userId}">Profile</a>
                    ${isAdmin(req) ? '<a href="/admin">Admin</a>' : ''}
                    <a href="/logout">Logout</a>
                ` : `
                    <a href="/login">Login</a>
                    <a href="/register">Register</a>
                `}
            </div>
        </div>
    </div>

    <div class="search-bar">
        <form action="/search" method="GET">
            <input type="text" name="q" class="search-input" placeholder="🔍 Search for toys, games, brands..." value="">
        </form>
    </div>

    <div class="categories">
        <a href="/shop" class="category-btn">All Toys</a>
        ${categories.rows.map(c => `<a href="/shop?category=${encodeURIComponent(c.category)}" class="category-btn">${c.category}</a>`).join('')}
    </div>

    <div class="container">
        <h2 style="margin-bottom: 25px; color: #333; font-size: 28px;">✨ Featured Toys</h2>
        <div class="products-grid">
            ${products.rows.map(p => `
                <div class="product-card">
                    <img src="${p.image_url}" alt="${p.name}" class="product-image">
                    <div class="product-info">
                        <div class="product-brand">${p.brand}</div>
                        <div class="product-name">${p.name}</div>
                        <div class="product-price">$${p.price}</div>
                        <div class="age-range">Ages ${p.age_range}</div>
                        <a href="/product/${p.id}" class="view-btn">View Details</a>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="footer">
        <p>© 2025 ToyStore. All Rights Reserved.</p>
        <p style="margin-top: 10px; font-size: 14px; opacity: 0.7;">Free shipping on orders over $50 | 30-day returns</p>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error loading page: ' + err.message);
    }
});

// ═══════════════════════════════════
// PRODUCT DETAIL PAGE
// ═══════════════════════════════════
app.get('/product/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Vulnerability: SQL Injection
        const product = await pool.query(
            `SELECT * FROM products WHERE id = ${productId}`
        );
        
        if (product.rows.length === 0) {
            return res.status(404).send('<h1>Product not found</h1>');
        }
        
        const p = product.rows[0];
        
        // Get reviews for this product
        const reviews = await pool.query(
            `SELECT r.*, u.username FROM reviews r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.product_id = ${productId} 
             ORDER BY r.created_at DESC`
        );

        let cartCount = 0;
        if (isLoggedIn(req)) {
            const cart = await pool.query(
                'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
                [req.session.userId]
            );
            cartCount = cart.rows[0].count || 0;
        }
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>${p.name} - ToyStore</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 32px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 25px; align-items: center; }
        .nav a { color: white; text-decoration: none; font-size: 16px; transition: opacity 0.3s; }
        .nav a:hover { opacity: 0.8; }
        .cart-badge { background: #ff6b6b; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 5px; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .product-detail { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .product-image { width: 100%; height: 500px; object-fit: cover; border-radius: 8px; }
        .product-info { display: flex; flex-direction: column; gap: 20px; }
        .brand { color: #888; font-size: 14px; text-transform: uppercase; }
        .product-name { font-size: 32px; font-weight: bold; color: #333; }
        .price { font-size: 36px; color: #667eea; font-weight: bold; }
        .age-range { display: inline-block; background: #e3f2fd; color: #1976d2; padding: 8px 15px; border-radius: 20px; font-size: 14px; }
        .stock { color: #4caf50; font-weight: bold; }
        .description { color: #666; line-height: 1.6; padding: 20px 0; }
        .quantity-selector { display: flex; align-items: center; gap: 15px; margin: 20px 0; }
        .quantity-btn { width: 40px; height: 40px; border: 2px solid #667eea; background: white; color: #667eea; font-size: 20px; border-radius: 6px; cursor: pointer; transition: all 0.3s; }
        .quantity-btn:hover { background: #667eea; color: white; }
        .quantity-input { width: 60px; height: 40px; text-align: center; border: 2px solid #ddd; border-radius: 6px; font-size: 18px; }
        .add-to-cart-btn { width: 100%; padding: 18px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; transition: all 0.3s; }
        .add-to-cart-btn:hover { background: #764ba2; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
        .reviews-section { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .review { border-bottom: 1px solid #eee; padding: 20px 0; }
        .review:last-child { border-bottom: none; }
        .review-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .reviewer { font-weight: bold; color: #333; }
        .rating { color: #ffa500; }
        .review-title { font-weight: bold; margin-bottom: 5px; }
        .review-comment { color: #666; line-height: 1.6; }
        .success-msg { background: #4caf50; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; display: none; }
        .login-required { background: #ff9800; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/shop">Shop</a>
                <a href="/deals">Deals</a>
                ${isLoggedIn(req) ? `
                    <a href="/cart">🛒 Cart <span class="cart-badge">${cartCount}</span></a>
                    <a href="/orders">Orders</a>
                    <a href="/profile/${req.session.userId}">Profile</a>
                    ${isAdmin(req) ? '<a href="/admin">Admin</a>' : ''}
                    <a href="/logout">Logout</a>
                ` : `
                    <a href="/login">Login</a>
                    <a href="/register">Register</a>
                `}
            </div>
        </div>
    </div>

    <div class="container">
        <div id="successMsg" class="success-msg"></div>
        
        <div class="product-detail">
            <div>
                <img src="${p.image_url}" alt="${p.name}" class="product-image">
            </div>
            <div class="product-info">
                <div class="brand">${p.brand}</div>
                <h1 class="product-name">${p.name}</h1>
                <div class="price">$${p.price}</div>
                <div class="age-range">Ages ${p.age_range}</div>
                <div class="stock">In Stock: ${p.stock} units</div>
                <div class="description">${p.description}</div>
                
                ${isLoggedIn(req) ? `
                    <div class="quantity-selector">
                        <span style="font-weight: bold;">Quantity:</span>
                        <button class="quantity-btn" onclick="decreaseQty()">−</button>
                        <input type="number" id="quantity" class="quantity-input" value="1" min="1" max="${p.stock}">
                        <button class="quantity-btn" onclick="increaseQty()">+</button>
                    </div>
                    <button class="add-to-cart-btn" onclick="addToCart(${p.id})">🛒 Add to Cart</button>
                ` : `
                    <div class="login-required">
                        Please <a href="/login" style="color: white; text-decoration: underline;">login</a> to add items to cart
                    </div>
                `}
            </div>
        </div>

        <div class="reviews-section">
            <h2 style="margin-bottom: 25px;">Customer Reviews</h2>
            ${reviews.rows.length > 0 ? reviews.rows.map(r => `
                <div class="review">
                    <div class="review-header">
                        <span class="reviewer">${r.username}</span>
                        <span class="rating">${'⭐'.repeat(r.rating)}</span>
                    </div>
                    <div class="review-title">${r.title}</div>
                    <div class="review-comment">${r.comment}</div>
                </div>
            `).join('') : '<p style="color: #888;">No reviews yet. Be the first to review!</p>'}
        </div>
    </div>

    <script>
        function increaseQty() {
            const input = document.getElementById('quantity');
            const max = parseInt(input.max);
            const current = parseInt(input.value);
            if (current < max) {
                input.value = current + 1;
            }
        }
        
        function decreaseQty() {
            const input = document.getElementById('quantity');
            const current = parseInt(input.value);
            if (current > 1) {
                input.value = current - 1;
            }
        }
        
        async function addToCart(productId) {
            const quantity = parseInt(document.getElementById('quantity').value);
            
            try {
                const response = await fetch('/api/cart/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ productId, quantity })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const msg = document.getElementById('successMsg');
                    msg.textContent = '✓ Added to cart successfully!';
                    msg.style.display = 'block';
                    
                    // Update cart badge
                    const badge = document.querySelector('.cart-badge');
                    if (badge) {
                        badge.textContent = data.cartCount;
                    }
                    
                    setTimeout(() => {
                        msg.style.display = 'none';
                    }, 3000);
                } else {
                    alert('Error: ' + data.message);
                }
            } catch (err) {
                alert('Error adding to cart');
            }
        }
    </script>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// CART API - ADD TO CART
// ═══════════════════════════════════
app.post('/api/cart/add', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.json({ success: false, message: 'Please login first' });
    }
    
    try {
        const { productId, quantity } = req.body;
        const userId = req.session.userId;
        
        // Check if product exists
        const product = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
        if (product.rows.length === 0) {
            return res.json({ success: false, message: 'Product not found' });
        }
        
        // Check stock
        if (product.rows[0].stock < quantity) {
            return res.json({ success: false, message: 'Insufficient stock' });
        }
        
        // Check if item already in cart
        const existing = await pool.query(
            'SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2',
            [userId, productId]
        );
        
        if (existing.rows.length > 0) {
            // Update quantity
            await pool.query(
                'UPDATE cart_items SET quantity = quantity + $1 WHERE user_id = $2 AND product_id = $3',
                [quantity, userId, productId]
            );
        } else {
            // Insert new item
            await pool.query(
                'INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1, $2, $3)',
                [userId, productId, quantity]
            );
        }
        
        // Get updated cart count
        const cartCount = await pool.query(
            'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
            [userId]
        );
        
        res.json({ 
            success: true, 
            cartCount: cartCount.rows[0].count || 0 
        });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ═══════════════════════════════════
// CART PAGE
// ═══════════════════════════════════
app.get('/cart', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const userId = req.session.userId;
        
        // Get cart items with product details
        const cartItems = await pool.query(`
            SELECT c.id, c.quantity, c.product_id,
                   p.name, p.price, p.image_url, p.stock, p.brand
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1
            ORDER BY c.added_at DESC
        `, [userId]);
        
        let total = 0;
        cartItems.rows.forEach(item => {
            total += parseFloat(item.price) * item.quantity;
        });

        let cartCount = 0;
        const cart = await pool.query(
            'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
            [req.session.userId]
        );
        cartCount = cart.rows[0].count || 0;
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Shopping Cart - ToyStore</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 32px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 25px; align-items: center; }
        .nav a { color: white; text-decoration: none; font-size: 16px; transition: opacity 0.3s; }
        .nav a:hover { opacity: 0.8; }
        .cart-badge { background: #ff6b6b; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 5px; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .cart-content { display: grid; grid-template-columns: 2fr 1fr; gap: 30px; }
        .cart-items { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .cart-item { display: grid; grid-template-columns: 120px 1fr auto; gap: 20px; padding: 20px 0; border-bottom: 1px solid #eee; }
        .cart-item:last-child { border-bottom: none; }
        .item-image { width: 120px; height: 120px; object-fit: cover; border-radius: 8px; }
        .item-details { display: flex; flex-direction: column; gap: 8px; }
        .item-name { font-size: 18px; font-weight: bold; color: #333; }
        .item-brand { color: #888; font-size: 14px; }
        .item-price { font-size: 20px; color: #667eea; font-weight: bold; }
        .item-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 15px; }
        .quantity-control { display: flex; align-items: center; gap: 10px; }
        .qty-btn { width: 32px; height: 32px; border: 2px solid #667eea; background: white; color: #667eea; border-radius: 4px; cursor: pointer; font-size: 16px; }
        .qty-btn:hover { background: #667eea; color: white; }
        .qty-display { font-size: 16px; font-weight: bold; min-width: 30px; text-align: center; }
        .remove-btn { color: #ff6b6b; cursor: pointer; font-size: 14px; text-decoration: underline; }
        .remove-btn:hover { color: #ff5252; }
        .cart-summary { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); height: fit-content; position: sticky; top: 20px; }
        .summary-row { display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #eee; }
        .summary-total { font-size: 24px; font-weight: bold; color: #333; padding-top: 20px; }
        .checkout-btn { width: 100%; padding: 18px; background: #4caf50; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: 20px; transition: all 0.3s; }
        .checkout-btn:hover { background: #45a049; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4); }
        .empty-cart { text-align: center; padding: 60px 20px; color: #888; }
        .continue-shopping { display: inline-block; margin-top: 20px; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/shop">Shop</a>
                <a href="/deals">Deals</a>
                <a href="/cart">🛒 Cart <span class="cart-badge">${cartCount}</span></a>
                <a href="/orders">Orders</a>
                <a href="/profile/${req.session.userId}">Profile</a>
                ${isAdmin(req) ? '<a href="/admin">Admin</a>' : ''}
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <h1 style="margin-bottom: 30px; font-size: 32px;">🛒 Shopping Cart</h1>
        
        ${cartItems.rows.length === 0 ? `
            <div class="empty-cart">
                <h2 style="font-size: 28px; margin-bottom: 15px;">Your cart is empty</h2>
                <p style="font-size: 16px; margin-bottom: 20px;">Add some awesome toys to get started!</p>
                <a href="/shop" class="continue-shopping">Continue Shopping</a>
            </div>
        ` : `
            <div class="cart-content">
                <div class="cart-items">
                    ${cartItems.rows.map(item => `
                        <div class="cart-item" id="item-${item.id}">
                            <img src="${item.image_url}" alt="${item.name}" class="item-image">
                            <div class="item-details">
                                <div class="item-brand">${item.brand}</div>
                                <div class="item-name">${item.name}</div>
                                <div class="item-price">$${item.price} each</div>
                                <div style="color: #4caf50; font-size: 14px;">In stock: ${item.stock}</div>
                            </div>
                            <div class="item-actions">
                                <div class="quantity-control">
                                    <button class="qty-btn" onclick="updateQuantity(${item.id}, ${item.product_id}, -1, ${item.quantity})">−</button>
                                    <span class="qty-display" id="qty-${item.id}">${item.quantity}</span>
                                    <button class="qty-btn" onclick="updateQuantity(${item.id}, ${item.product_id}, 1, ${item.quantity})">+</button>
                                </div>
                                <div style="font-size: 18px; font-weight: bold; color: #333;">$${(parseFloat(item.price) * item.quantity).toFixed(2)}</div>
                                <div class="remove-btn" onclick="removeItem(${item.id})">Remove</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="cart-summary">
                    <h2 style="margin-bottom: 20px;">Order Summary</h2>
                    <div class="summary-row">
                        <span>Subtotal</span>
                        <span id="subtotal">$${total.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Shipping</span>
                        <span>${total >= 50 ? 'FREE' : '$9.99'}</span>
                    </div>
                    <div class="summary-row">
                        <span>Tax (8%)</span>
                        <span id="tax">$${(total * 0.08).toFixed(2)}</span>
                    </div>
                    <div class="summary-total">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Total</span>
                            <span id="total">$${(total + (total >= 50 ? 0 : 9.99) + (total * 0.08)).toFixed(2)}</span>
                        </div>
                    </div>
                    <button class="checkout-btn" onclick="checkout()">Proceed to Checkout</button>
                    <a href="/shop" style="display: block; text-align: center; margin-top: 15px; color: #667eea; text-decoration: none;">Continue Shopping</a>
                </div>
            </div>
        `}
    </div>

    <script>
        async function updateQuantity(cartId, productId, change, currentQty) {
            const newQty = currentQty + change;
            if (newQty < 1) return;
            
            try {
                const response = await fetch('/api/cart/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cartId, quantity: newQty })
                });
                
                const data = await response.json();
                if (data.success) {
                    location.reload();
                }
            } catch (err) {
                alert('Error updating cart');
            }
        }
        
        async function removeItem(cartId) {
            if (!confirm('Remove this item from cart?')) return;
            
            try {
                const response = await fetch('/api/cart/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cartId })
                });
                
                const data = await response.json();
                if (data.success) {
                    location.reload();
                }
            } catch (err) {
                alert('Error removing item');
            }
        }
        
        function checkout() {
            window.location.href = '/checkout';
        }
    </script>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// CART API - UPDATE QUANTITY
// ═══════════════════════════════════
app.post('/api/cart/update', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.json({ success: false, message: 'Please login first' });
    }
    
    try {
        const { cartId, quantity } = req.body;
        const userId = req.session.userId;
        
        await pool.query(
            'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3',
            [quantity, cartId, userId]
        );
        
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ═══════════════════════════════════
// CART API - REMOVE ITEM
// ═══════════════════════════════════
app.post('/api/cart/remove', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.json({ success: false, message: 'Please login first' });
    }
    
    try {
        const { cartId } = req.body;
        const userId = req.session.userId;
        
        await pool.query(
            'DELETE FROM cart_items WHERE id = $1 AND user_id = $2',
            [cartId, userId]
        );
        
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

// ═══════════════════════════════════
// CHECKOUT PAGE
// ═══════════════════════════════════
app.get('/checkout', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const userId = req.session.userId;
        
        // Get cart items
        const cartItems = await pool.query(`
            SELECT c.id, c.quantity, c.product_id,
                   p.name, p.price, p.image_url
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1
        `, [userId]);
        
        if (cartItems.rows.length === 0) {
            return res.redirect('/cart');
        }
        
        let subtotal = 0;
        cartItems.rows.forEach(item => {
            subtotal += parseFloat(item.price) * item.quantity;
        });
        
        const shipping = subtotal >= 50 ? 0 : 9.99;
        const tax = subtotal * 0.08;
        const total = subtotal + shipping + tax;
        
        // Get user info
        const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const u = user.rows[0];

        let cartCount = 0;
        const cart = await pool.query(
            'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
            [req.session.userId]
        );
        cartCount = cart.rows[0].count || 0;
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Checkout - ToyStore</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 32px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 25px; align-items: center; }
        .nav a { color: white; text-decoration: none; font-size: 16px; transition: opacity 0.3s; }
        .nav a:hover { opacity: 0.8; }
        .cart-badge { background: #ff6b6b; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 5px; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .checkout-content { display: grid; grid-template-columns: 1.5fr 1fr; gap: 30px; }
        .checkout-form { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .form-section { margin-bottom: 30px; }
        .section-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #555; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
        .form-group input:focus, .form-group textarea:focus { border-color: #667eea; outline: none; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 15px; }
        .order-summary { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); height: fit-content; position: sticky; top: 20px; }
        .summary-item { display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #eee; }
        .summary-total { font-size: 24px; font-weight: bold; padding-top: 20px; }
        .place-order-btn { width: 100%; padding: 18px; background: #4caf50; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: 30px; transition: all 0.3s; }
        .place-order-btn:hover { background: #45a049; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4); }
        .security-note { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 6px; margin-top: 20px; font-size: 14px; color: #856404; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/shop">Shop</a>
                <a href="/deals">Deals</a>
                <a href="/cart">🛒 Cart <span class="cart-badge">${cartCount}</span></a>
                <a href="/orders">Orders</a>
                <a href="/profile/${req.session.userId}">Profile</a>
                ${isAdmin(req) ? '<a href="/admin">Admin</a>' : ''}
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <h1 style="margin-bottom: 30px; font-size: 32px;">🔒 Secure Checkout</h1>
        
        <div class="checkout-content">
            <div class="checkout-form">
                <form id="checkoutForm" method="POST" action="/process-payment">
                    <div class="form-section">
                        <div class="section-title">📦 Shipping Information</div>
                        <div class="form-group">
                            <label>Full Name *</label>
                            <input type="text" name="fullName" value="${u.full_name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Email *</label>
                            <input type="email" name="email" value="${u.email}" required>
                        </div>
                        <div class="form-group">
                            <label>Phone Number *</label>
                            <input type="tel" name="phone" value="${u.phone || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>Shipping Address *</label>
                            <textarea name="address" rows="3" required>${u.address || ''}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>City *</label>
                                <input type="text" name="city" required>
                            </div>
                            <div class="form-group">
                                <label>Zip Code *</label>
                                <input type="text" name="zipCode" required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="section-title">💳 Payment Information</div>
                        <div class="form-group">
                            <label>Card Holder Name *</label>
                            <input type="text" name="cardHolder" required>
                        </div>
                        <div class="form-group">
                            <label>Card Number *</label>
                            <input type="text" name="cardNumber" placeholder="1234 5678 9012 3456" maxlength="16" required>
                        </div>
                        <div class="card-row">
                            <div class="form-group">
                                <label>Expiration Date *</label>
                                <input type="text" name="expiryDate" placeholder="MM/YY" required>
                            </div>
                            <div class="form-group">
                                <label>CVV *</label>
                                <input type="text" name="cvv" placeholder="123" maxlength="4" required>
                            </div>
                            <div class="form-group">
                                <label>Billing Zip *</label>
                                <input type="text" name="billingZip" required>
                            </div>
                        </div>
                        <div class="security-note">
                            ⚠️ <strong>Note:</strong> This is a demonstration site. Please use fake card details for testing purposes only.
                        </div>
                    </div>
                    
                    <button type="submit" class="place-order-btn">Place Order - $${total.toFixed(2)}</button>
                </form>
            </div>
            
            <div class="order-summary">
                <h2 style="margin-bottom: 20px;">Order Summary</h2>
                ${cartItems.rows.map(item => `
                    <div class="summary-item">
                        <span>${item.name} (×${item.quantity})</span>
                        <span>$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <div class="summary-item">
                    <span>Subtotal</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Shipping</span>
                    <span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
                </div>
                <div class="summary-item">
                    <span>Tax (8%)</span>
                    <span>$${tax.toFixed(2)}</span>
                </div>
                <div class="summary-total">
                    <div style="display: flex; justify-content: space-between;">
                        <span>Total</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// PROCESS PAYMENT
// ═══════════════════════════════════
app.post('/process-payment', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const userId = req.session.userId;
        const {
            fullName, email, phone, address, city, zipCode,
            cardHolder, cardNumber, expiryDate, cvv, billingZip
        } = req.body;
        
        // Get cart items
        const cartItems = await pool.query(`
            SELECT c.id, c.quantity, c.product_id,
                   p.name, p.price
            FROM cart_items c
            JOIN products p ON c.product_id = p.id
            WHERE c.user_id = $1
        `, [userId]);
        
        if (cartItems.rows.length === 0) {
            return res.redirect('/cart');
        }
        
        // Calculate total
        let subtotal = 0;
        cartItems.rows.forEach(item => {
            subtotal += parseFloat(item.price) * item.quantity;
        });
        
        const shipping = subtotal >= 50 ? 0 : 9.99;
        const tax = subtotal * 0.08;
        const total = subtotal + shipping + tax;
        
        // Create order
        const shippingAddress = `${address}, ${city}, ${zipCode}`;
        const order = await pool.query(
            'INSERT INTO orders (user_id, total, status, shipping_address) VALUES ($1, $2, $3, $4) RETURNING id',
            [userId, total, 'processing', shippingAddress]
        );
        
        const orderId = order.rows[0].id;
        
        // Add order items
        for (const item of cartItems.rows) {
            await pool.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [orderId, item.product_id, item.quantity, item.price]
            );
            
            // Update product stock
            await pool.query(
                'UPDATE products SET stock = stock - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }
        
        // VULNERABILITY: Store payment details in PLAINTEXT
        try {
            await pool.query(
                'INSERT INTO payments (order_id, amount, card_number, card_holder, cvv, expiry_date, billing_zip, method, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [orderId, total, cardNumber, cardHolder, cvv, expiryDate, billingZip, 'card', 'completed']
            );
        } catch (colErr) {
            // If expiry_date/billing_zip columns don't exist, insert without them
            await pool.query(
                'INSERT INTO payments (order_id, amount, card_number, card_holder, cvv, method, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [orderId, total, cardNumber, cardHolder, cvv, 'card', 'completed']
            );
        }
        
        // Clear cart
        await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
        
        // Redirect to order confirmation
        res.redirect(`/order-confirmation/${orderId}`);
    } catch (err) {
        res.status(500).send('Error processing payment: ' + err.message);
    }
});

// ═══════════════════════════════════
// ORDER CONFIRMATION
// ═══════════════════════════════════
app.get('/order-confirmation/:orderId', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const orderId = req.params.orderId;
        const userId = req.session.userId;
        
        // Get order details
        const order = await pool.query(
            'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
            [orderId, userId]
        );
        
        if (order.rows.length === 0) {
            return res.status(404).send('Order not found');
        }
        
        const o = order.rows[0];
        
        // Get order items
        const orderItems = await pool.query(`
            SELECT oi.quantity, oi.price, p.name, p.image_url
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
        `, [orderId]);

        let cartCount = 0;
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Order Confirmation - ToyStore</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 32px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 25px; align-items: center; }
        .nav a { color: white; text-decoration: none; font-size: 16px; transition: opacity 0.3s; }
        .nav a:hover { opacity: 0.8; }
        .cart-badge { background: #ff6b6b; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 5px; }
        .container { max-width: 800px; margin: 50px auto; padding: 0 20px; }
        .confirmation-box { background: white; padding: 50px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; }
        .success-icon { font-size: 80px; margin-bottom: 20px; }
        .order-number { font-size: 24px; color: #667eea; font-weight: bold; margin: 20px 0; }
        .order-details { text-align: left; margin-top: 40px; padding-top: 30px; border-top: 2px solid #eee; }
        .detail-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
        .btn-group { display: flex; gap: 15px; justify-content: center; margin-top: 30px; }
        .btn { padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; transition: all 0.3s; }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #764ba2; }
        .btn-secondary { background: white; color: #667eea; border: 2px solid #667eea; }
        .btn-secondary:hover { background: #f5f5f5; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/shop">Shop</a>
                <a href="/deals">Deals</a>
                <a href="/cart">🛒 Cart <span class="cart-badge">${cartCount}</span></a>
                <a href="/orders">Orders</a>
                <a href="/profile/${req.session.userId}">Profile</a>
                ${isAdmin(req) ? '<a href="/admin">Admin</a>' : ''}
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="confirmation-box">
            <div class="success-icon">✅</div>
            <h1 style="font-size: 32px; margin-bottom: 15px;">Order Placed Successfully!</h1>
            <p style="color: #888; font-size: 16px;">Thank you for your purchase. We're processing your order now.</p>
            <div class="order-number">Order #${orderId}</div>
            
            <div class="order-details">
                <h2 style="margin-bottom: 20px;">Order Details</h2>
                ${orderItems.rows.map(item => `
                    <div class="detail-row">
                        <span>${item.name} (×${item.quantity})</span>
                        <span>$${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
                <div class="detail-row" style="font-size: 18px; font-weight: bold; border-bottom: none; padding-top: 20px;">
                    <span>Total</span>
                    <span>$${parseFloat(o.total).toFixed(2)}</span>
                </div>
                
                <div style="margin-top: 30px;">
                    <h3 style="margin-bottom: 10px;">Shipping Address</h3>
                    <p style="color: #666;">${o.shipping_address}</p>
                </div>
                
                <div style="margin-top: 20px;">
                    <h3 style="margin-bottom: 10px;">Status</h3>
                    <p style="color: #4caf50; font-weight: bold;">${o.status.toUpperCase()}</p>
                </div>
            </div>
            
            <div class="btn-group">
                <a href="/orders" class="btn btn-primary">View All Orders</a>
                <a href="/shop" class="btn btn-secondary">Continue Shopping</a>
            </div>
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// ORDERS PAGE
// ═══════════════════════════════════
app.get('/orders', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const userId = req.session.userId;
        
        // Get user's orders
        const orders = await pool.query(
            'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
            [userId]
        );

        let cartCount = 0;
        const cart = await pool.query(
            'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
            [req.session.userId]
        );
        cartCount = cart.rows[0].count || 0;
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>My Orders - ToyStore</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 32px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 25px; align-items: center; }
        .nav a { color: white; text-decoration: none; font-size: 16px; transition: opacity 0.3s; }
        .nav a:hover { opacity: 0.8; }
        .cart-badge { background: #ff6b6b; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 5px; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .order-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #eee; }
        .order-id { font-size: 20px; font-weight: bold; color: #333; }
        .order-date { color: #888; font-size: 14px; }
        .order-status { padding: 6px 15px; border-radius: 15px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-processing { background: #cfe2ff; color: #084298; }
        .status-shipped { background: #d1ecf1; color: #0c5460; }
        .status-delivered { background: #d4edda; color: #155724; }
        .order-details { display: flex; justify-content: space-between; align-items: center; }
        .order-total { font-size: 24px; font-weight: bold; color: #667eea; }
        .view-details-btn { padding: 10px 25px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; transition: all 0.3s; }
        .view-details-btn:hover { background: #764ba2; }
        .empty-orders { text-align: center; padding: 60px 20px; color: #888; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/shop">Shop</a>
                <a href="/deals">Deals</a>
                <a href="/cart">🛒 Cart <span class="cart-badge">${cartCount}</span></a>
                <a href="/orders">Orders</a>
                <a href="/profile/${req.session.userId}">Profile</a>
                ${isAdmin(req) ? '<a href="/admin">Admin</a>' : ''}
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <h1 style="margin-bottom: 30px; font-size: 32px;">📦 My Orders</h1>
        
        ${orders.rows.length === 0 ? `
            <div class="empty-orders">
                <h2 style="font-size: 28px; margin-bottom: 15px;">No orders yet</h2>
                <p style="font-size: 16px; margin-bottom: 20px;">Start shopping to place your first order!</p>
                <a href="/shop" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">Browse Products</a>
            </div>
        ` : orders.rows.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-id">Order #${order.id}</div>
                        <div class="order-date">Placed on ${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <span class="order-status status-${order.status}">${order.status}</span>
                </div>
                <div class="order-details">
                    <div>
                        <div style="color: #666; margin-bottom: 5px;">Shipping to:</div>
                        <div style="font-weight: bold;">${order.shipping_address}</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="order-total">$${parseFloat(order.total).toFixed(2)}</div>
                        <a href="/order-confirmation/${order.id}" class="view-details-btn">View Details</a>
                    </div>
                </div>
            </div>
        `).join('')}
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// REGISTER
// ═══════════════════════════════════
app.get('/register', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Register - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .register-box { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); width: 100%; max-width: 450px; }
        .register-box h2 { color: #333; margin-bottom: 30px; text-align: center; font-size: 28px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #555; font-weight: bold; }
        .form-group input, .form-group textarea { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; transition: border 0.3s; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #667eea; }
        .form-group textarea { resize: vertical; min-height: 80px; }
        .submit-btn { width: 100%; padding: 14px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; transition: background 0.3s; }
        .submit-btn:hover { background: #764ba2; }
        .login-link { text-align: center; margin-top: 20px; color: #555; }
        .login-link a { color: #667eea; text-decoration: none; font-weight: bold; }
        .error { background: #ffebee; color: #c62828; padding: 12px; border-radius: 6px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="register-box">
        <h2>🧸 Create Account</h2>
        <form method="POST" action="/register">
            <div class="form-group">
                <label>Username</label>
                <input type="text" name="username" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" name="email" required>
            </div>
            <div class="form-group">
                <label>Password (6 characters)</label>
                <input type="password" name="password" required>
            </div>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" name="full_name">
            </div>
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" name="phone">
            </div>
            <div class="form-group">
                <label>Address</label>
                <textarea name="address"></textarea>
            </div>
            <button type="submit" class="submit-btn">Register</button>
        </form>
        <div class="login-link">
            Already have an account? <a href="/login">Login here</a>
        </div>
    </div>
</body>
</html>
    `);
});

app.post('/register', async (req, res) => {
    // Vulnerability: Weak password policy
    const { username, email, password, full_name, phone, address } = req.body;
    
    if (password.length !== 6) {
        return res.send('<h2>Password must be exactly 6 characters</h2><a href="/register">Back</a>');
    }
    
    try {
        // Vulnerability: MD5 password hashing
        const passwordHash = md5(password);
        
        await pool.query(
            'INSERT INTO users (username, email, password_md5, full_name, phone, address) VALUES ($1, $2, $3, $4, $5, $6)',
            [username, email, passwordHash, full_name, phone, address]
        );
        
        res.redirect('/login?registered=1');
    } catch (err) {
        res.send(`<h2>Registration failed: ${err.message}</h2><a href="/register">Back</a>`);
    }
});

// ═══════════════════════════════════
// LOGIN
// ═══════════════════════════════════
app.get('/login', (req, res) => {
    const message = req.query.registered ? '<div class="success">Registration successful! Please login.</div>' : '';
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Login - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .login-box { background: white; padding: 40px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); width: 100%; max-width: 400px; }
        .login-box h2 { color: #333; margin-bottom: 30px; text-align: center; font-size: 28px; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; color: #555; font-weight: bold; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
        .form-group input:focus { outline: none; border-color: #667eea; }
        .submit-btn { width: 100%; padding: 14px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; }
        .submit-btn:hover { background: #764ba2; }
        .register-link { text-align: center; margin-top: 20px; color: #555; }
        .register-link a { color: #667eea; text-decoration: none; font-weight: bold; }
        .success { background: #e8f5e9; color: #2e7d32; padding: 12px; border-radius: 6px; margin-bottom: 20px; text-align: center; }
    </style>
</head>
<body>
    <div class="login-box">
        <h2>🧸 ToyStore Login</h2>
        ${message}
        <form method="POST" action="/login">
            <div class="form-group">
                <label>Username</label>
                <input type="text" name="username" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" name="password" required>
            </div>
            <button type="submit" class="submit-btn">Login</button>
        </form>
        <div class="register-link">
            Don't have an account? <a href="/register">Register here</a>
        </div>
    </div>
</body>
</html>
    `);
});

app.post('/login', async (req, res) => {
    // Vulnerability: No rate limiting (brute force)
    const { username, password } = req.body;
    
    try {
        // Vulnerability: MD5 password comparison
        const passwordHash = md5(password);
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password_md5 = $2',
            [username, passwordHash]
        );
        
        if (result.rows.length === 0) {
            return res.send('<h2>Invalid credentials</h2><a href="/login">Back</a>');
        }
        
        const user = result.rows[0];
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        // Vulnerability: Incomplete audit logging
        // No logging of failed login attempts
        await pool.query(
            'INSERT INTO audit_logs (event_type, user_id, details) VALUES ($1, $2, $3)',
            ['login', user.id, 'User logged in']
        );
        
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Login error: ' + err.message);
    }
});

// ═══════════════════════════════════
// LOGOUT
// ═══════════════════════════════════
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Continue in next part...

// ═══════════════════════════════════
// PRODUCT DETAILS & REVIEWS
// ═══════════════════════════════════
app.get('/product/:id', async (req, res) => {
    try {
        // Vulnerability: SQL Injection possible if not parameterized
        const productResult = await pool.query(
            'SELECT * FROM products WHERE id = $1',
            [req.params.id]
        );
        
        if (productResult.rows.length === 0) {
            return res.send('<h2>Product not found</h2>');
        }
        
        const product = productResult.rows[0];
        
        // Vulnerability: Stored XSS - reviews not sanitized
        const reviewsResult = await pool.query(
            `SELECT r.*, u.username FROM reviews r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.product_id = $1 
             ORDER BY r.created_at DESC`,
            [req.params.id]
        );

        let cartCount = 0;
        if (isLoggedIn(req)) {
            const cart = await pool.query(
                'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
                [req.session.userId]
            );
            cartCount = cart.rows[0].count || 0;
        }
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>${product.name} - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 28px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .product-detail { background: white; border-radius: 12px; padding: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px; }
        .product-image { width: 100%; border-radius: 12px; }
        .product-name { font-size: 32px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .product-brand { color: #667eea; font-size: 18px; margin-bottom: 15px; }
        .product-price { font-size: 36px; color: #667eea; font-weight: bold; margin: 20px 0; }
        .age-range { background: #e3f2fd; color: #1976d2; padding: 8px 15px; border-radius: 20px; display: inline-block; margin: 10px 0; }
        .stock { color: #4caf50; font-weight: bold; margin: 10px 0; }
        .description { color: #666; line-height: 1.8; margin: 20px 0; }
        .add-cart-btn { padding: 15px 40px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; margin-top: 20px; width: 100%; }
        .add-cart-btn:hover { background: #764ba2; }
        .reviews-section { background: white; border-radius: 12px; padding: 30px; }
        .review { border-bottom: 1px solid #eee; padding: 20px 0; }
        .review:last-child { border-bottom: none; }
        .review-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .reviewer { font-weight: bold; color: #333; }
        .rating { color: #ffa726; }
        .review-comment { color: #666; line-height: 1.6; }
        .review-form { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .review-form input, .review-form textarea, .review-form select { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ddd; border-radius: 4px; }
        .submit-review-btn { background: #667eea; color: white; padding: 12px 30px; border: none; border-radius: 6px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/">Home</a>
                <a href="/shop">Shop</a>
                ${isLoggedIn(req) ? `
                    <a href="/cart">🛒 Cart (${cartCount})</a>
                    <a href="/logout">Logout</a>
                ` : `<a href="/login">Login</a>`}
            </div>
        </div>
    </div>

    <div class="container">
        <div class="product-detail">
            <div>
                <img src="${product.image_url}" alt="${product.name}" class="product-image">
            </div>
            <div>
                <div class="product-brand">${product.brand}</div>
                <h1 class="product-name">${product.name}</h1>
                <div class="age-range">Ages ${product.age_range}</div>
                <div class="product-price">$${product.price}</div>
                <div class="stock">✓ ${product.stock} in stock</div>
                <div class="description">${product.description}</div>
                
                ${isLoggedIn(req) ? `
                    <form method="POST" action="/cart/add">
                        <input type="hidden" name="product_id" value="${product.id}">
                        <label>Quantity: <input type="number" name="quantity" value="1" min="1" max="10" style="width: 80px; padding: 8px;"></label>
                        <button type="submit" class="add-cart-btn">🛒 Add to Cart</button>
                    </form>
                ` : `
                    <p style="color: #888; margin-top: 20px;"><a href="/login">Login</a> to purchase</p>
                `}
            </div>
        </div>

        <div class="reviews-section">
            <h2 style="margin-bottom: 20px;">Customer Reviews</h2>
            ${reviewsResult.rows.length > 0 ? reviewsResult.rows.map(r => `
                <div class="review">
                    <div class="review-header">
                        <span class="reviewer">${r.username}</span>
                        <span class="rating">${'⭐'.repeat(r.rating)}</span>
                    </div>
                    <div style="font-weight: bold; color: #333; margin: 5px 0;">${r.title || ''}</div>
                    <div class="review-comment">${r.comment}</div>
                    <div style="font-size: 12px; color: #999; margin-top: 5px;">${new Date(r.created_at).toLocaleDateString()}</div>
                </div>
            `).join('') : '<p style="color: #888;">No reviews yet. Be the first to review!</p>'}
            
            ${isLoggedIn(req) ? `
                <div class="review-form">
                    <h3 style="margin-bottom: 15px;">Write a Review</h3>
                    <form method="POST" action="/product/${product.id}/review">
                        <input type="text" name="title" placeholder="Review Title" required>
                        <select name="rating" required>
                            <option value="">Select Rating</option>
                            <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                            <option value="4">⭐⭐⭐⭐ Good</option>
                            <option value="3">⭐⭐⭐ Average</option>
                            <option value="2">⭐⭐ Below Average</option>
                            <option value="1">⭐ Poor</option>
                        </select>
                        <textarea name="comment" placeholder="Write your review here..." rows="4" required></textarea>
                        <button type="submit" class="submit-review-btn">Submit Review</button>
                    </form>
                </div>
            ` : '<p style="margin-top: 20px;"><a href="/login">Login</a> to write a review</p>'}
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

app.post('/product/:id/review', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    // Vulnerability: Stored XSS - no sanitization of title/comment
    const { title, rating, comment } = req.body;
    
    try {
        await pool.query(
            'INSERT INTO reviews (user_id, product_id, rating, title, comment) VALUES ($1, $2, $3, $4, $5)',
            [req.session.userId, req.params.id, rating, title, comment]
        );
        res.redirect('/product/' + req.params.id);
    } catch (err) {
        res.status(500).send('Error submitting review: ' + err.message);
    }
});

// ═══════════════════════════════════
// SHOP / BROWSE
// ═══════════════════════════════════
app.get('/shop', async (req, res) => {
    const category = req.query.category;
    
    try {
        let query = 'SELECT * FROM products';
        let params = [];
        
        if (category) {
            query += ' WHERE category = $1';
            params.push(category);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const products = await pool.query(query, params);
        
        let cartCount = 0;
        if (isLoggedIn(req)) {
            const cart = await pool.query(
                'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
                [req.session.userId]
            );
            cartCount = cart.rows[0].count || 0;
        }
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Shop Toys - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 28px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; margin-top: 20px; }
        .product-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.3s; }
        .product-card:hover { transform: translateY(-5px); }
        .product-image { width: 100%; height: 250px; object-fit: cover; }
        .product-info { padding: 15px; }
        .product-name { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 8px; }
        .product-price { font-size: 24px; color: #667eea; font-weight: bold; margin: 10px 0; }
        .view-btn { display: block; width: 100%; padding: 12px; background: #667eea; color: white; text-align: center; text-decoration: none; border-radius: 6px; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/">Home</a>
                <a href="/shop">Shop</a>
                ${isLoggedIn(req) ? `
                    <a href="/cart">🛒 Cart (${cartCount})</a>
                    <a href="/orders">Orders</a>
                    <a href="/logout">Logout</a>
                ` : `<a href="/login">Login</a>`}
            </div>
        </div>
    </div>

    <div class="container">
        <h1>${category ? category : 'All Toys'}</h1>
        <p style="color: #666; margin: 10px 0;">${products.rows.length} products found</p>
        
        <div class="products-grid">
            ${products.rows.map(p => `
                <div class="product-card">
                    <img src="${p.image_url}" alt="${p.name}" class="product-image">
                    <div class="product-info">
                        <div style="font-size: 13px; color: #888;">${p.brand}</div>
                        <div class="product-name">${p.name}</div>
                        <div class="product-price">$${p.price}</div>
                        <a href="/product/${p.id}" class="view-btn">View Details</a>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// SEARCH (SQL Injection Vulnerability)
// ═══════════════════════════════════
app.get('/search', async (req, res) => {
    const query = req.query.q || '';
    
    try {
        // Vulnerability: SQL Injection - query directly concatenated
        const sqlQuery = `SELECT * FROM products WHERE name ILIKE '%${query}%' OR description ILIKE '%${query}%' OR category ILIKE '%${query}%'`;
        const results = await pool.query(sqlQuery);
        
        let cartCount = 0;
        if (isLoggedIn(req)) {
            const cart = await pool.query(
                'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
                [req.session.userId]
            );
            cartCount = cart.rows[0].count || 0;
        }
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Search: ${query} - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 28px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .search-bar { margin: 20px 0; }
        .search-input { width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; }
        .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; margin-top: 20px; }
        .product-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .product-image { width: 100%; height: 250px; object-fit: cover; }
        .product-info { padding: 15px; }
        .product-name { font-size: 18px; font-weight: bold; color: #333; }
        .product-price { font-size: 24px; color: #667eea; font-weight: bold; margin: 10px 0; }
        .view-btn { display: block; width: 100%; padding: 12px; background: #667eea; color: white; text-align: center; text-decoration: none; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/">Home</a>
                <a href="/shop">Shop</a>
                ${isLoggedIn(req) ? `
                    <a href="/cart">🛒 Cart (${cartCount})</a>
                    <a href="/logout">Logout</a>
                ` : `<a href="/login">Login</a>`}
            </div>
        </div>
    </div>

    <div class="container">
        <h1>Search Results for "${query}"</h1>
        <div class="search-bar">
            <form action="/search" method="GET">
                <input type="text" name="q" class="search-input" placeholder="Search..." value="${query}">
            </form>
        </div>
        
        <p style="color: #666;">${results.rows.length} products found</p>
        
        <div class="products-grid">
            ${results.rows.map(p => `
                <div class="product-card">
                    <img src="${p.image_url}" alt="${p.name}" class="product-image">
                    <div class="product-info">
                        <div class="product-name">${p.name}</div>
                        <div class="product-price">$${p.price}</div>
                        <a href="/product/${p.id}" class="view-btn">View Details</a>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Search error: ' + err.message);
    }
});


// ═══════════════════════════════════
// SHOPPING CART
// ═══════════════════════════════════
app.get('/cart', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const cartItems = await pool.query(
            `SELECT c.*, p.name, p.price, p.image_url, p.brand, (c.quantity * p.price) as subtotal
             FROM cart_items c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1`,
            [req.session.userId]
        );
        
        const total = cartItems.rows.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Shopping Cart - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 28px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; }
        .container { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
        .cart-item { background: white; border-radius: 12px; padding: 20px; margin-bottom: 15px; display: flex; gap: 20px; align-items: center; }
        .item-image { width: 120px; height: 120px; object-fit: cover; border-radius: 8px; }
        .item-details { flex: 1; }
        .item-name { font-size: 20px; font-weight: bold; color: #333; }
        .item-brand { color: #888; font-size: 14px; }
        .item-price { font-size: 18px; color: #667eea; margin: 10px 0; }
        .quantity-controls { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
        .qty-btn { padding: 5px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .remove-btn { padding: 8px 15px; background: #ff6b6b; color: white; border: none; border-radius: 6px; cursor: pointer; }
        .cart-summary { background: white; border-radius: 12px; padding: 25px; margin-top: 20px; }
        .summary-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 18px; }
        .total-row { font-size: 24px; font-weight: bold; color: #667eea; padding-top: 15px; border-top: 2px solid #eee; }
        .checkout-btn { width: 100%; padding: 15px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: 20px; }
        .checkout-btn:hover { background: #764ba2; }
        .empty-cart { text-align: center; padding: 60px 20px; color: #888; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/">Home</a>
                <a href="/shop">Shop</a>
                <a href="/cart">🛒 Cart</a>
                <a href="/orders">Orders</a>
                <a href="/profile/${req.session.userId}">Profile</a>
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <h1 style="margin-bottom: 20px;">🛒 Shopping Cart</h1>
        
        ${cartItems.rows.length === 0 ? `
            <div class="empty-cart">
                <h2>Your cart is empty</h2>
                <p style="margin: 20px 0;">Start shopping and add some toys!</p>
                <a href="/shop" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px;">Shop Now</a>
            </div>
        ` : `
            ${cartItems.rows.map(item => `
                <div class="cart-item">
                    <img src="${item.image_url}" class="item-image">
                    <div class="item-details">
                        <div class="item-brand">${item.brand}</div>
                        <div class="item-name">${item.name}</div>
                        <div class="item-price">$${item.price} each</div>
                        <div class="quantity-controls">
                            <form method="POST" action="/cart/update" style="display: inline;">
                                <input type="hidden" name="product_id" value="${item.product_id}">
                                <input type="hidden" name="action" value="decrease">
                                <button type="submit" class="qty-btn">−</button>
                            </form>
                            <span style="padding: 0 15px; font-weight: bold;">${item.quantity}</span>
                            <form method="POST" action="/cart/update" style="display: inline;">
                                <input type="hidden" name="product_id" value="${item.product_id}">
                                <input type="hidden" name="action" value="increase">
                                <button type="submit" class="qty-btn">+</button>
                            </form>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 22px; font-weight: bold; color: #667eea;">$${item.subtotal.toFixed(2)}</div>
                        <form method="POST" action="/cart/remove" style="margin-top: 10px;">
                            <input type="hidden" name="product_id" value="${item.product_id}">
                            <button type="submit" class="remove-btn">Remove</button>
                        </form>
                    </div>
                </div>
            `).join('')}
            
            <div class="cart-summary">
                <div class="summary-row">
                    <span>Subtotal (${cartItems.rows.length} items):</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
                <div class="summary-row">
                    <span>Shipping:</span>
                    <span>${total >= 50 ? 'FREE' : '$5.99'}</span>
                </div>
                <div class="summary-row total-row">
                    <span>Total:</span>
                    <span>$${(total >= 50 ? total : total + 5.99).toFixed(2)}</span>
                </div>
                <form method="POST" action="/checkout">
                    <button type="submit" class="checkout-btn">Proceed to Checkout</button>
                </form>
            </div>
        `}
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

app.post('/cart/add', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    const { product_id, quantity } = req.body;
    
    try {
        await pool.query(
            `INSERT INTO cart_items (user_id, product_id, quantity) 
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, product_id) 
             DO UPDATE SET quantity = cart_items.quantity + $3`,
            [req.session.userId, product_id, quantity || 1]
        );
        res.redirect('/cart');
    } catch (err) {
        res.status(500).send('Error adding to cart: ' + err.message);
    }
});

app.post('/cart/update', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    const { product_id, action } = req.body;
    
    try {
        if (action === 'increase') {
            await pool.query(
                'UPDATE cart_items SET quantity = quantity + 1 WHERE user_id = $1 AND product_id = $2',
                [req.session.userId, product_id]
            );
        } else if (action === 'decrease') {
            await pool.query(
                'UPDATE cart_items SET quantity = GREATEST(quantity - 1, 1) WHERE user_id = $1 AND product_id = $2',
                [req.session.userId, product_id]
            );
        }
        res.redirect('/cart');
    } catch (err) {
        res.status(500).send('Error updating cart: ' + err.message);
    }
});

app.post('/cart/remove', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    const { product_id } = req.body;
    
    try {
        await pool.query(
            'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
            [req.session.userId, product_id]
        );
        res.redirect('/cart');
    } catch (err) {
        res.status(500).send('Error removing from cart: ' + err.message);
    }
});

// ═══════════════════════════════════
// CHECKOUT & PAYMENT (Price Manipulation)
// ═══════════════════════════════════
app.post('/checkout', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const cartItems = await pool.query(
            `SELECT c.*, p.name, p.price, (c.quantity * p.price) as subtotal
             FROM cart_items c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1`,
            [req.session.userId]
        );
        
        if (cartItems.rows.length === 0) {
            return res.redirect('/cart');
        }
        
        const total = cartItems.rows.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
        const shipping = total >= 50 ? 0 : 5.99;
        const finalTotal = total + shipping;
        
        const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Checkout - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; }
        .logo { font-size: 28px; font-weight: bold; color: white; text-decoration: none; }
        .container { max-width: 800px; margin: 30px auto; padding: 0 20px; }
        .checkout-box { background: white; border-radius: 12px; padding: 30px; }
        .section-title { font-size: 22px; font-weight: bold; color: #333; margin: 25px 0 15px 0; padding-bottom: 10px; border-bottom: 2px solid #eee; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; color: #555; font-weight: bold; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
        .order-summary { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .summary-item { display: flex; justify-content: space-between; margin: 10px 0; }
        .total-amount { font-size: 24px; font-weight: bold; color: #667eea; padding-top: 15px; border-top: 2px solid #ddd; }
        .place-order-btn { width: 100%; padding: 15px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; margin-top: 20px; }
        .place-order-btn:hover { background: #764ba2; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
        </div>
    </div>

    <div class="container">
        <div class="checkout-box">
            <h1>Checkout</h1>
            
            <div class="section-title">📦 Shipping Address</div>
            <form method="POST" action="/process-payment" id="paymentForm">
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" name="full_name" value="${user.rows[0].full_name || ''}" required>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <input type="text" name="address" value="${user.rows[0].address || ''}" required>
                </div>
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" name="phone" value="${user.rows[0].phone || ''}" required>
                </div>
                
                <div class="section-title">💳 Payment Information</div>
                <div class="form-group">
                    <label>Card Number</label>
                    <input type="text" name="card_number" placeholder="1234 5678 9012 3456" maxlength="16" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label>Card Holder Name</label>
                        <input type="text" name="card_holder" required>
                    </div>
                    <div class="form-group">
                        <label>CVV</label>
                        <input type="text" name="cvv" placeholder="123" maxlength="4" required>
                    </div>
                </div>
                
                <div class="order-summary">
                    <h3 style="margin-bottom: 15px;">Order Summary</h3>
                    ${cartItems.rows.map(item => `
                        <div class="summary-item">
                            <span>${item.name} (x${item.quantity})</span>
                            <span>$${item.subtotal.toFixed(2)}</span>
                        </div>
                    `).join('')}
                    <div class="summary-item" style="padding-top: 10px; border-top: 1px solid #ddd;">
                        <span>Subtotal:</span>
                        <span>$${total.toFixed(2)}</span>
                    </div>
                    <div class="summary-item">
                        <span>Shipping:</span>
                        <span>${shipping === 0 ? 'FREE' : '$' + shipping.toFixed(2)}</span>
                    </div>
                    <div class="summary-item total-amount">
                        <span>Total:</span>
                        <span>$${finalTotal.toFixed(2)}</span>
                    </div>
                </div>
                
                <!-- Vulnerability: Client-side amount (can be manipulated) -->
                <input type="hidden" name="amount" value="${finalTotal.toFixed(2)}" id="hiddenAmount">
                
                <button type="submit" class="place-order-btn">🔒 Place Order</button>
            </form>
        </div>
    </div>
    
    <script>
    // Vulnerability: Amount is visible in client-side code
    console.log('Order total: $' + document.getElementById('hiddenAmount').value);
    </script>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

app.post('/process-payment', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    // Vulnerability: Trust client-side amount without verification
    const { amount, card_number, card_holder, cvv, address, phone } = req.body;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get cart items
        const cartItems = await client.query(
            `SELECT c.*, p.price FROM cart_items c
             JOIN products p ON c.product_id = p.id
             WHERE c.user_id = $1`,
            [req.session.userId]
        );
        
        if (cartItems.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.redirect('/cart');
        }
        
        // Create order
        const orderResult = await client.query(
            'INSERT INTO orders (user_id, total, shipping_address, status) VALUES ($1, $2, $3, $4) RETURNING id',
            [req.session.userId, amount, address, 'processing']  // Uses client amount!
        );
        
        const orderId = orderResult.rows[0].id;
        
        // Create order items
        for (const item of cartItems.rows) {
            await client.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [orderId, item.product_id, item.quantity, item.price]
            );
        }
        
        // Vulnerability: Store sensitive payment data in plain text
        // Try to insert with all columns, fall back to basic columns if schema is missing expiry/zip
        try {
            await client.query(
                'INSERT INTO payments (order_id, amount, card_number, card_holder, cvv, expiry_date, billing_zip, method, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [orderId, amount, card_number, card_holder, cvv, 'N/A', 'N/A', 'card', 'completed']
            );
        } catch (colErr) {
            // If expiry_date/billing_zip columns don't exist, insert without them
            await client.query(
                'INSERT INTO payments (order_id, amount, card_number, card_holder, cvv, method, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                [orderId, amount, card_number, card_holder, cvv, 'card', 'completed']
            );
        }
        
        // Clear cart
        await client.query('DELETE FROM cart_items WHERE user_id = $1', [req.session.userId]);
        
        // Vulnerability: Incomplete audit logging (no IP, minimal details)
        await client.query(
            'INSERT INTO audit_logs (event_type, user_id, details) VALUES ($1, $2, $3)',
            ['purchase', req.session.userId, `Order #${orderId} placed`]
        );
        
        await client.query('COMMIT');
        
        res.redirect('/order-success?id=' + orderId);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).send('Payment processing error: ' + err.message);
    } finally {
        client.release();
    }
});

app.get('/order-success', (req, res) => {
    const orderId = req.query.id;
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Order Confirmed - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .success-box { background: white; padding: 60px; border-radius: 15px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-width: 500px; }
        .checkmark { font-size: 80px; color: #4caf50; margin-bottom: 20px; }
        h1 { color: #333; margin-bottom: 15px; }
        p { color: #666; margin: 10px 0; line-height: 1.6; }
        .order-number { font-size: 24px; font-weight: bold; color: #667eea; margin: 20px 0; }
        .btn { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="success-box">
        <div class="checkmark">✓</div>
        <h1>Order Confirmed!</h1>
        <p>Thank you for your purchase!</p>
        <div class="order-number">Order #${orderId}</div>
        <p>We've sent a confirmation email with order details.</p>
        <p>Your toys will be shipped within 2-3 business days.</p>
        <a href="/orders" class="btn">View Orders</a>
        <a href="/" class="btn" style="background: #f5f5f5; color: #333; margin-left: 10px;">Continue Shopping</a>
    </div>
</body>
</html>
    `);
});


// ═══════════════════════════════════
// ORDERS
// ═══════════════════════════════════
app.get('/orders', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const orders = await pool.query(
            `SELECT o.*, 
                    (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
             FROM orders o
             WHERE o.user_id = $1
             ORDER BY o.created_at DESC`,
            [req.session.userId]
        );
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>My Orders - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 28px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; }
        .container { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
        .order-card { background: white; border-radius: 12px; padding: 25px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .order-header { display: flex; justify-content: space-between; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 2px solid #eee; }
        .order-number { font-size: 20px; font-weight: bold; color: #333; }
        .order-date { color: #888; font-size: 14px; }
        .order-status { padding: 6px 15px; border-radius: 20px; font-size: 13px; font-weight: bold; }
        .status-processing { background: #fff3e0; color: #f57c00; }
        .status-shipped { background: #e3f2fd; color: #1976d2; }
        .status-delivered { background: #e8f5e9; color: #388e3c; }
        .order-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
        .info-item { color: #666; }
        .info-label { font-weight: bold; color: #333; margin-right: 5px; }
        .view-details-btn { display: inline-block; padding: 10px 25px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/">Home</a>
                <a href="/shop">Shop</a>
                <a href="/cart">🛒 Cart</a>
                <a href="/orders">Orders</a>
                <a href="/profile/${req.session.userId}">Profile</a>
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <h1 style="margin-bottom: 25px;">My Orders</h1>
        
        ${orders.rows.length === 0 ? `
            <div style="text-align: center; padding: 60px 20px; background: white; border-radius: 12px;">
                <h2 style="color: #888;">No orders yet</h2>
                <p style="color: #999; margin: 15px 0;">Start shopping to see your orders here!</p>
                <a href="/shop" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 10px;">Shop Now</a>
            </div>
        ` : orders.rows.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <div>
                        <div class="order-number">Order #${order.id}</div>
                        <div class="order-date">${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    </div>
                    <span class="order-status status-${order.status}">${order.status.toUpperCase()}</span>
                </div>
                <div class="order-info">
                    <div class="info-item">
                        <span class="info-label">Total:</span>
                        <span style="font-size: 20px; color: #667eea; font-weight: bold;">$${order.total}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Items:</span>
                        <span>${order.item_count} item(s)</span>
                    </div>
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <span class="info-label">Shipping Address:</span>
                        <span>${order.shipping_address}</span>
                    </div>
                </div>
                <a href="/order/${order.id}" class="view-details-btn">View Details</a>
            </div>
        `).join('')}
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

app.get('/order/:id', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        // Vulnerability: IDOR - no verification that order belongs to user
        const order = await pool.query(
            'SELECT * FROM orders WHERE id = $1',
            [req.params.id]
        );
        
        if (order.rows.length === 0) {
            return res.send('<h2>Order not found</h2>');
        }
        
        const orderItems = await pool.query(
            `SELECT oi.*, p.name, p.image_url, p.brand
             FROM order_items oi
             JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = $1`,
            [req.params.id]
        );
        
        const orderData = order.rows[0];
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Order #${orderData.id} - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; }
        .logo { font-size: 28px; font-weight: bold; text-decoration: none; color: white; }
        .container { max-width: 900px; margin: 30px auto; padding: 0 20px; }
        .order-details { background: white; border-radius: 12px; padding: 30px; }
        .order-header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 25px; }
        .order-number { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .order-status { display: inline-block; padding: 8px 20px; border-radius: 20px; font-weight: bold; }
        .status-processing { background: #fff3e0; color: #f57c00; }
        .status-shipped { background: #e3f2fd; color: #1976d2; }
        .status-delivered { background: #e8f5e9; color: #388e3c; }
        .section-title { font-size: 20px; font-weight: bold; margin: 25px 0 15px 0; color: #333; }
        .item { display: flex; gap: 20px; padding: 15px 0; border-bottom: 1px solid #eee; }
        .item:last-child { border-bottom: none; }
        .item-image { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; }
        .item-info { flex: 1; }
        .item-name { font-size: 18px; font-weight: bold; color: #333; }
        .item-brand { color: #888; font-size: 14px; }
        .summary { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .summary-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 16px; }
        .total-row { font-size: 22px; font-weight: bold; color: #667eea; padding-top: 15px; border-top: 2px solid #ddd; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
        </div>
    </div>

    <div class="container">
        <a href="/orders" style="color: #667eea; text-decoration: none; margin-bottom: 20px; display: inline-block;">← Back to Orders</a>
        
        <div class="order-details">
            <div class="order-header">
                <div class="order-number">Order #${orderData.id}</div>
                <div style="color: #888; margin: 10px 0;">Placed on ${new Date(orderData.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                <span class="order-status status-${orderData.status}">${orderData.status.toUpperCase()}</span>
            </div>
            
            <div>
                <strong style="color: #333;">Shipping Address:</strong>
                <p style="color: #666; margin-top: 5px;">${orderData.shipping_address}</p>
            </div>
            
            <div class="section-title">Order Items</div>
            ${orderItems.rows.map(item => `
                <div class="item">
                    <img src="${item.image_url}" class="item-image">
                    <div class="item-info">
                        <div class="item-brand">${item.brand}</div>
                        <div class="item-name">${item.name}</div>
                        <div style="color: #888; margin-top: 5px;">Quantity: ${item.quantity}</div>
                        <div style="color: #667eea; font-weight: bold; margin-top: 5px;">$${item.price} each</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 20px; font-weight: bold; color: #667eea;">$${(item.quantity * parseFloat(item.price)).toFixed(2)}</div>
                    </div>
                </div>
            `).join('')}
            
            <div class="summary">
                <div class="summary-row total-row">
                    <span>Total Paid:</span>
                    <span>$${orderData.total}</span>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// PROFILE (IDOR Vulnerability)
// ═══════════════════════════════════

// ═══════════════════════════════════
// EDIT PROFILE
// ═══════════════════════════════════
app.get('/profile/edit', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const user = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [req.session.userId]
        );
        
        if (user.rows.length === 0) {
            return res.send('<h2>User not found</h2>');
        }
        
        const userData = user.rows[0];

        let cartCount = 0;
        const cart = await pool.query(
            'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
            [req.session.userId]
        );
        cartCount = cart.rows[0].count || 0;
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Edit Profile - ToyStore</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 32px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 25px; align-items: center; }
        .nav a { color: white; text-decoration: none; font-size: 16px; transition: opacity 0.3s; }
        .nav a:hover { opacity: 0.8; }
        .cart-badge { background: #ff6b6b; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 5px; }
        .container { max-width: 800px; margin: 30px auto; padding: 0 20px; }
        .form-box { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { margin-bottom: 30px; color: #333; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #555; }
        .form-group input, .form-group textarea { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; font-family: Arial; }
        .form-group input:focus, .form-group textarea:focus { border-color: #667eea; outline: none; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .btn-group { display: flex; gap: 15px; margin-top: 30px; }
        .btn { padding: 14px 30px; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; text-align: center; }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #764ba2; }
        .btn-secondary { background: #e0e0e0; color: #333; }
        .btn-secondary:hover { background: #d0d0d0; }
        .success-msg { background: #4caf50; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: none; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/shop">Shop</a>
                <a href="/deals">Deals</a>
                <a href="/cart">🛒 Cart <span class="cart-badge">${cartCount}</span></a>
                <a href="/orders">Orders</a>
                <a href="/profile/${req.session.userId}">Profile</a>
                ${isAdmin(req) ? '<a href="/admin">Admin</a>' : ''}
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="form-box">
            <h1>✏️ Edit Profile</h1>
            
            <div id="successMsg" class="success-msg"></div>
            
            <form method="POST" action="/profile/update">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" name="username" value="${userData.username}" required>
                </div>
                
                <div class="form-group">
                    <label>Email Address *</label>
                    <input type="email" name="email" value="${userData.email}" required>
                </div>
                
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" name="fullName" value="${userData.full_name || ''}">
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="tel" name="phone" value="${userData.phone || ''}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Address</label>
                    <textarea name="address" rows="3">${userData.address || ''}</textarea>
                </div>
                
                <div class="btn-group">
                    <button type="submit" class="btn btn-primary">💾 Save Changes</button>
                    <a href="/profile/${req.session.userId}" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

app.post('/profile/update', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const { username, email, fullName, phone, address } = req.body;
        
        await pool.query(
            'UPDATE users SET username = $1, email = $2, full_name = $3, phone = $4, address = $5 WHERE id = $6',
            [username, email, fullName, phone, address, req.session.userId]
        );
        
        req.session.username = username;
        
        res.redirect('/profile/' + req.session.userId + '?updated=1');
    } catch (err) {
        res.status(500).send('Error updating profile: ' + err.message);
    }
});

// ═══════════════════════════════════
// CHANGE PASSWORD
// ═══════════════════════════════════
app.get('/profile/change-password', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }

    let cartCount = 0;
    try {
        const cart = await pool.query(
            'SELECT SUM(quantity) as count FROM cart_items WHERE user_id = $1',
            [req.session.userId]
        );
        cartCount = cart.rows[0].count || 0;
    } catch (err) {}
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Change Password - ToyStore</title>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 32px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 25px; align-items: center; }
        .nav a { color: white; text-decoration: none; font-size: 16px; transition: opacity 0.3s; }
        .nav a:hover { opacity: 0.8; }
        .cart-badge { background: #ff6b6b; padding: 2px 8px; border-radius: 10px; font-size: 12px; margin-left: 5px; }
        .container { max-width: 600px; margin: 50px auto; padding: 0 20px; }
        .form-box { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { margin-bottom: 30px; color: #333; text-align: center; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #555; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
        .form-group input:focus { border-color: #667eea; outline: none; }
        .btn-group { display: flex; gap: 15px; margin-top: 30px; }
        .btn { padding: 14px 30px; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; text-align: center; flex: 1; }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #764ba2; }
        .btn-secondary { background: #e0e0e0; color: #333; }
        .btn-secondary:hover { background: #d0d0d0; }
        .error-msg { background: #ff6b6b; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 20px; color: #1976d2; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/shop">Shop</a>
                <a href="/deals">Deals</a>
                <a href="/cart">🛒 Cart <span class="cart-badge">${cartCount}</span></a>
                <a href="/orders">Orders</a>
                <a href="/profile/${req.session.userId}">Profile</a>
                ${isAdmin(req) ? '<a href="/admin">Admin</a>' : ''}
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="form-box">
            <h1>🔒 Change Password</h1>
            
            <div class="info-box">
                ℹ️ For security, please enter your current password to make changes.
            </div>
            
            <form method="POST" action="/profile/update-password">
                <div class="form-group">
                    <label>Current Password *</label>
                    <input type="password" name="currentPassword" required>
                </div>
                
                <div class="form-group">
                    <label>New Password *</label>
                    <input type="password" name="newPassword" minlength="6" required>
                </div>
                
                <div class="form-group">
                    <label>Confirm New Password *</label>
                    <input type="password" name="confirmPassword" minlength="6" required>
                </div>
                
                <div class="btn-group">
                    <button type="submit" class="btn btn-primary">🔐 Update Password</button>
                    <a href="/profile/${req.session.userId}" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
    `);
});

app.post('/profile/update-password', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            return res.send('<h2>Error: New passwords do not match</h2><a href="/profile/change-password">Back</a>');
        }
        
        // Verify current password
        const currentHash = md5(currentPassword);
        const user = await pool.query(
            'SELECT * FROM users WHERE id = $1 AND password_md5 = $2',
            [req.session.userId, currentHash]
        );
        
        if (user.rows.length === 0) {
            return res.send('<h2>Error: Current password is incorrect</h2><a href="/profile/change-password">Back</a>');
        }
        
        // Update password
        const newHash = md5(newPassword);
        await pool.query(
            'UPDATE users SET password_md5 = $1 WHERE id = $2',
            [newHash, req.session.userId]
        );
        
        res.send(`
            <h2>✅ Password Updated Successfully!</h2>
            <p>Your password has been changed.</p>
            <a href="/profile/${req.session.userId}">Back to Profile</a>
        `);
    } catch (err) {
        res.status(500).send('Error updating password: ' + err.message);
    }
});

// ═══════════════════════════════════
// VIEW PROFILE (must be AFTER specific routes)
// ═══════════════════════════════════
app.get('/profile/:id', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    try {
        // Vulnerability: IDOR - can view any user's profile
        const user = await pool.query(
            'SELECT id, username, email, full_name, address, phone, role, created_at FROM users WHERE id = $1',
            [req.params.id]
        );
        
        if (user.rows.length === 0) {
            return res.send('<h2>User not found</h2>');
        }
        
        const userData = user.rows[0];
        const isOwnProfile = parseInt(req.params.id) === req.session.userId;
        
        const orderCount = await pool.query(
            'SELECT COUNT(*) as count FROM orders WHERE user_id = $1',
            [req.params.id]
        );
        
        const reviewCount = await pool.query(
            'SELECT COUNT(*) as count FROM reviews WHERE user_id = $1',
            [req.params.id]
        );
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Profile - ${userData.username}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 28px; font-weight: bold; text-decoration: none; color: white; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; }
        .container { max-width: 800px; margin: 30px auto; padding: 0 20px; }
        .profile-box { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .profile-header { text-align: center; margin-bottom: 30px; padding-bottom: 25px; border-bottom: 2px solid #eee; }
        .profile-avatar { width: 100px; height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 48px; color: white; margin: 0 auto 15px; }
        .username { font-size: 28px; font-weight: bold; color: #333; margin-bottom: 5px; }
        .role-badge { display: inline-block; padding: 6px 15px; background: ${userData.role === 'admin' ? '#ff6b6b' : '#667eea'}; color: white; border-radius: 15px; font-size: 14px; font-weight: bold; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 25px 0; }
        .info-item { }
        .info-label { font-size: 13px; color: #888; margin-bottom: 5px; }
        .info-value { font-size: 16px; color: #333; font-weight: 500; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .stat-item { text-align: center; }
        .stat-number { font-size: 32px; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 14px; color: #888; margin-top: 5px; }
        .edit-btn { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <a href="/" class="logo">🧸 ToyStore</a>
            <div class="nav">
                <a href="/">Home</a>
                <a href="/shop">Shop</a>
                <a href="/cart">🛒 Cart</a>
                <a href="/orders">Orders</a>
                <a href="/profile/${req.session.userId}">Profile</a>
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        ${!isOwnProfile ? '<div style="background: #fff3cd; color: #856404; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px;">⚠️ You are viewing another user\'s profile</div>' : ''}
        
        <div class="profile-box">
            <div class="profile-header">
                <div class="profile-avatar">${userData.username.charAt(0).toUpperCase()}</div>
                <div class="username">${userData.username}</div>
                <span class="role-badge">${userData.role.toUpperCase()}</span>
            </div>
            
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Email</div>
                    <div class="info-value">${userData.email}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Full Name</div>
                    <div class="info-value">${userData.full_name || 'Not provided'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Phone</div>
                    <div class="info-value">${userData.phone || 'Not provided'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Member Since</div>
                    <div class="info-value">${new Date(userData.created_at).toLocaleDateString()}</div>
                </div>
                <div class="info-item" style="grid-column: 1 / -1;">
                    <div class="info-label">Address</div>
                    <div class="info-value">${userData.address || 'Not provided'}</div>
                </div>
            </div>
            
            <div class="stats">
                <div class="stat-item">
                    <div class="stat-number">${orderCount.rows[0].count}</div>
                    <div class="stat-label">Orders</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${reviewCount.rows[0].count}</div>
                    <div class="stat-label">Reviews</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">${userData.role === 'admin' ? '∞' : '0'}</div>
                    <div class="stat-label">Privileges</div>
                </div>
            </div>
            
            ${isOwnProfile ? `
                <a href="/profile/edit" class="edit-btn">✏️ Edit Profile</a>
                <a href="/profile/change-password" class="edit-btn" style="background: #ff6b6b; margin-left: 10px;">🔒 Change Password</a>
            ` : ''}
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// ADMIN PANEL (Broken Access Control)
// ═══════════════════════════════════
app.get('/admin', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    // Vulnerability: Can bypass with ?role=admin query parameter
    const bypassRole = req.query.role;
    if (bypassRole !== 'admin' && !isAdmin(req)) {
        return res.send('<h2>Access Denied</h2><p>Admin access required.</p>');
    }
    
    try {
        const users = await pool.query('SELECT COUNT(*) as count FROM users');
        const products = await pool.query('SELECT COUNT(*) as count FROM products');
        const orders = await pool.query('SELECT COUNT(*) as count FROM orders');
        const revenue = await pool.query('SELECT SUM(total) as total FROM orders WHERE status != \'pending\'');
        const payments = await pool.query('SELECT COUNT(*) as count FROM payments');
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Admin Dashboard - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: #212121; padding: 20px; color: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: bold; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; transition: background 0.3s; }
        .nav a:hover { background: rgba(255,255,255,0.1); }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .stat-number { font-size: 42px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
        .stat-label { color: #888; font-size: 16px; }
        .menu-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .menu-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; transition: transform 0.3s; cursor: pointer; }
        .menu-card:hover { transform: translateY(-5px); box-shadow: 0 8px 15px rgba(0,0,0,0.2); }
        .menu-icon { font-size: 64px; margin-bottom: 20px; }
        .menu-title { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .menu-desc { color: #888; font-size: 14px; }
        .menu-link { text-decoration: none; color: inherit; display: block; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">🔐 Admin Dashboard</div>
            <div class="nav">
                <a href="/">🏠 Store</a>
                <a href="/admin">📊 Dashboard</a>
                <a href="/logout">🚪 Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <h1 style="margin-bottom: 25px; font-size: 32px;">Dashboard Overview</h1>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${users.rows[0].count}</div>
                <div class="stat-label">Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${products.rows[0].count}</div>
                <div class="stat-label">Total Products</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${orders.rows[0].count}</div>
                <div class="stat-label">Total Orders</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">$${(revenue.rows[0].total || 0).toLocaleString()}</div>
                <div class="stat-label">Total Revenue</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${payments.rows[0].count}</div>
                <div class="stat-label">Payments Processed</div>
            </div>
        </div>
        
        <h2 style="margin: 40px 0 25px; font-size: 28px;">Management Sections</h2>
        
        <div class="menu-grid">
            <a href="/admin/users" class="menu-link">
                <div class="menu-card">
                    <div class="menu-icon">👥</div>
                    <div class="menu-title">User Management</div>
                    <div class="menu-desc">View, edit, and delete user accounts</div>
                </div>
            </a>
            
            <a href="/admin/payments" class="menu-link">
                <div class="menu-card">
                    <div class="menu-icon">💳</div>
                    <div class="menu-title">Payment Details</div>
                    <div class="menu-desc">View payment information (PLAINTEXT)</div>
                </div>
            </a>
            
            <a href="/admin/orders" class="menu-link">
                <div class="menu-card">
                    <div class="menu-icon">📦</div>
                    <div class="menu-title">Order Management</div>
                    <div class="menu-desc">View and manage customer orders</div>
                </div>
            </a>
            
            <a href="/admin/change-password" class="menu-link">
                <div class="menu-card">
                    <div class="menu-icon">🔒</div>
                    <div class="menu-title">Change Password</div>
                    <div class="menu-desc">Update admin password</div>
                </div>
            </a>
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// ADMIN - USER MANAGEMENT
// ═══════════════════════════════════
app.get('/admin/users', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    if (!isAdmin(req)) {
        return res.send('<h2>Access Denied</h2><p>Admin access required.</p>');
    }
    
    try {
        const users = await pool.query('SELECT id, username, email, full_name, role, created_at FROM users ORDER BY id');
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>User Management - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: #212121; padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: bold; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; }
        .nav a:hover { background: rgba(255,255,255,0.1); }
        .container { max-width: 1400px; margin: 30px auto; padding: 0 20px; }
        .data-table { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: bold; color: #333; border-bottom: 2px solid #ddd; }
        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
        tr:hover { background: #f9f9f9; }
        .role-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
        .role-admin { background: #ffebee; color: #c62828; }
        .role-user { background: #e3f2fd; color: #1976d2; }
        .action-btn { padding: 6px 12px; margin: 0 3px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; text-decoration: none; display: inline-block; }
        .btn-edit { background: #667eea; color: white; }
        .btn-edit:hover { background: #764ba2; }
        .btn-delete { background: #ff6b6b; color: white; }
        .btn-delete:hover { background: #ff5252; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">🔐 Admin - User Management</div>
            <div class="nav">
                <a href="/admin">← Dashboard</a>
                <a href="/">Store</a>
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="data-table">
            <h2>👥 All Users (${users.rows.length})</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Full Name</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.rows.map(u => `
                        <tr>
                            <td>${u.id}</td>
                            <td>${u.username}</td>
                            <td>${u.email}</td>
                            <td>${u.full_name || 'N/A'}</td>
                            <td><span class="role-badge role-${u.role}">${u.role.toUpperCase()}</span></td>
                            <td>${new Date(u.created_at).toLocaleDateString()}</td>
                            <td>
                                <a href="/admin/users/edit/${u.id}" class="action-btn btn-edit">✏️ Edit</a>
                                <button onclick="deleteUser(${u.id}, '${u.username}')" class="action-btn btn-delete">🗑️ Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>

    <script>
        function deleteUser(userId, username) {
            if (!confirm(\`Are you sure you want to delete user "\${username}"? This action cannot be undone.\`)) {
                return;
            }
            
            fetch('/admin/users/delete/' + userId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('User deleted successfully');
                    location.reload();
                } else {
                    alert('Error: ' + data.message);
                }
            })
            .catch(err => {
                alert('Error deleting user');
            });
        }
    </script>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// ADMIN - EDIT USER
// ═══════════════════════════════════
app.get('/admin/users/edit/:id', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    if (!isAdmin(req)) {
        return res.send('<h2>Access Denied</h2>');
    }
    
    try {
        const user = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
        
        if (user.rows.length === 0) {
            return res.send('<h2>User not found</h2>');
        }
        
        const userData = user.rows[0];
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Edit User - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: #212121; padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; }
        .logo { font-size: 24px; font-weight: bold; }
        .container { max-width: 800px; margin: 30px auto; padding: 0 20px; }
        .form-box { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { margin-bottom: 30px; color: #333; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #555; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: #667eea; outline: none; }
        .btn-group { display: flex; gap: 15px; margin-top: 30px; }
        .btn { padding: 14px 30px; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; text-align: center; }
        .btn-primary { background: #667eea; color: white; }
        .btn-secondary { background: #e0e0e0; color: #333; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">🔐 Admin - Edit User</div>
        </div>
    </div>

    <div class="container">
        <div class="form-box">
            <h1>✏️ Edit User: ${userData.username}</h1>
            
            <form method="POST" action="/admin/users/update/${userData.id}">
                <div class="form-group">
                    <label>Username *</label>
                    <input type="text" name="username" value="${userData.username}" required>
                </div>
                
                <div class="form-group">
                    <label>Email *</label>
                    <input type="email" name="email" value="${userData.email}" required>
                </div>
                
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" name="fullName" value="${userData.full_name || ''}">
                </div>
                
                <div class="form-group">
                    <label>Phone</label>
                    <input type="text" name="phone" value="${userData.phone || ''}">
                </div>
                
                <div class="form-group">
                    <label>Address</label>
                    <textarea name="address" rows="3">${userData.address || ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Role *</label>
                    <select name="role" required>
                        <option value="user" ${userData.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${userData.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </div>
                
                <div class="btn-group">
                    <button type="submit" class="btn btn-primary">💾 Save Changes</button>
                    <a href="/admin/users" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

app.post('/admin/users/update/:id', async (req, res) => {
    if (!isLoggedIn(req) || !isAdmin(req)) {
        return res.redirect('/login');
    }
    
    try {
        const { username, email, fullName, phone, address, role } = req.body;
        
        await pool.query(
            'UPDATE users SET username = $1, email = $2, full_name = $3, phone = $4, address = $5, role = $6 WHERE id = $7',
            [username, email, fullName, phone, address, role, req.params.id]
        );
        
        res.redirect('/admin/users');
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// ADMIN - DELETE USER
// ═══════════════════════════════════
app.post('/admin/users/delete/:id', async (req, res) => {
    if (!isLoggedIn(req) || !isAdmin(req)) {
        return res.json({ success: false, message: 'Unauthorized' });
    }
    
    try {
        // Don't allow deleting yourself
        if (parseInt(req.params.id) === req.session.userId) {
            return res.json({ success: false, message: 'Cannot delete your own account' });
        }
        
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});
    

// ═══════════════════════════════════
// ADMIN - PAYMENT DETAILS (Password Protected)
// ═══════════════════════════════════
app.get('/admin/payments', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    if (!isAdmin(req)) {
        return res.send('<h2>Access Denied</h2>');
    }
    
    // Check if password verification session exists
    if (!req.session.paymentsVerified) {
        return res.redirect('/admin/payments/verify');
    }
    
    try {
        const payments = await pool.query(`
            SELECT p.*, o.id as order_number, u.username, u.email 
            FROM payments p 
            JOIN orders o ON p.order_id = o.id 
            JOIN users u ON o.user_id = u.id 
            ORDER BY p.created_at DESC
            LIMIT 100
        `);
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Payment Details - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: #212121; padding: 20px; color: white; }
        .header-content { max-width: 1600px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: bold; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; }
        .nav a:hover { background: rgba(255,255,255,0.1); }
        .container { max-width: 1600px; margin: 30px auto; padding: 0 20px; }
        .data-table { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; min-width: 1200px; }
        th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: bold; color: #333; border-bottom: 2px solid #ddd; font-size: 13px; }
        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        tr:hover { background: #f9f9f9; }
        .card-number { font-family: monospace; background: #fff3cd; padding: 4px 8px; border-radius: 4px; color: #856404; font-weight: bold; }
        .cvv { font-family: monospace; background: #f8d7da; padding: 4px 8px; border-radius: 4px; color: #721c24; font-weight: bold; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 20px; color: #856404; }
        .security-notice { background: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin-bottom: 20px; color: #721c24; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">🔐 Admin - Payment Details</div>
            <div class="nav">
                <a href="/admin">← Dashboard</a>
                <a href="/admin/payments/verify?logout=1">🔒 Lock</a>
                <a href="/">Store</a>
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="security-notice">
            <strong>⚠️ CRITICAL SECURITY VULNERABILITY!</strong><br>
            This page displays credit card information stored in PLAINTEXT in the database.<br>
            In a real application, this would be a severe PCI-DSS violation and could result in massive fines and legal action.
        </div>
        
        <div class="data-table">
            <h2>💳 Payment Details - Plaintext Storage (${payments.rows.length} records)</h2>
            <div class="warning">
                🔒 This section is password-protected. You verified your admin password to access this sensitive data.
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Card Number</th>
                        <th>Card Holder</th>
                        <th>Expiry</th>
                        <th>CVV</th>
                        <th>Billing Zip</th>
                        <th>Amount</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${payments.rows.map(p => `
                        <tr>
                            <td>${p.id}</td>
                            <td>#${p.order_number}</td>
                            <td>${p.username}</td>
                            <td>${p.email}</td>
                            <td><span class="card-number">${p.card_number || 'N/A'}</span></td>
                            <td>${p.card_holder || 'N/A'}</td>
                            <td>${p.expiry_date || 'N/A'}</td>
                            <td><span class="cvv">${p.cvv || 'N/A'}</span></td>
                            <td>${p.billing_zip || 'N/A'}</td>
                            <td>$${parseFloat(p.amount).toFixed(2)}</td>
                            <td>${new Date(p.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// ADMIN - PAYMENT VERIFICATION PAGE
// ═══════════════════════════════════
app.get('/admin/payments/verify', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    if (!isAdmin(req)) {
        return res.send('<h2>Access Denied</h2>');
    }
    
    // If logout parameter, clear verification
    if (req.query.logout) {
        req.session.paymentsVerified = false;
        return res.redirect('/admin/payments/verify');
    }
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Verify Password - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .verify-box { background: white; border-radius: 12px; padding: 50px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); max-width: 500px; width: 100%; }
        h1 { text-align: center; margin-bottom: 30px; color: #333; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-bottom: 25px; color: #856404; font-size: 14px; }
        .form-group { margin-bottom: 25px; }
        .form-group label { display: block; margin-bottom: 10px; font-weight: bold; color: #555; }
        .form-group input { width: 100%; padding: 15px; border: 2px solid #ddd; border-radius: 6px; font-size: 16px; }
        .form-group input:focus { border-color: #667eea; outline: none; }
        .btn { width: 100%; padding: 15px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 18px; font-weight: bold; cursor: pointer; }
        .btn:hover { background: #764ba2; }
        .back-link { display: block; text-align: center; margin-top: 20px; color: #667eea; text-decoration: none; }
        .lock-icon { text-align: center; font-size: 64px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="verify-box">
        <div class="lock-icon">🔒</div>
        <h1>Password Verification Required</h1>
        
        <div class="warning">
            <strong>⚠️ Sensitive Data Access</strong><br>
            You are about to view payment card details stored in plaintext. Please verify your admin password to continue.
        </div>
        
        <form method="POST" action="/admin/payments/verify">
            <div class="form-group">
                <label>Admin Password</label>
                <input type="password" name="password" required autofocus>
            </div>
            
            <button type="submit" class="btn">🔓 Verify & Continue</button>
        </form>
        
        <a href="/admin" class="back-link">← Back to Dashboard</a>
    </div>
</body>
</html>
    `);
});

app.post('/admin/payments/verify', async (req, res) => {
    if (!isLoggedIn(req) || !isAdmin(req)) {
        return res.redirect('/login');
    }
    
    try {
        const { password } = req.body;
        const passwordHash = md5(password);
        
        const user = await pool.query(
            'SELECT * FROM users WHERE id = $1 AND password_md5 = $2',
            [req.session.userId, passwordHash]
        );
        
        if (user.rows.length === 0) {
            return res.send('<h2>❌ Incorrect Password</h2><p>Password verification failed.</p><a href="/admin/payments/verify">Try Again</a>');
        }
        
        // Set verification flag
        req.session.paymentsVerified = true;
        
        res.redirect('/admin/payments');
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// ADMIN - ORDERS MANAGEMENT
// ═══════════════════════════════════
app.get('/admin/orders', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    if (!isAdmin(req)) {
        return res.send('<h2>Access Denied</h2>');
    }
    
    try {
        const orders = await pool.query(`
            SELECT o.*, u.username, u.email 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC
            LIMIT 100
        `);
        
        res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Order Management - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: #212121; padding: 20px; color: white; }
        .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
        .logo { font-size: 24px; font-weight: bold; }
        .nav { display: flex; gap: 20px; }
        .nav a { color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; }
        .nav a:hover { background: rgba(255,255,255,0.1); }
        .container { max-width: 1400px; margin: 30px auto; padding: 0 20px; }
        .data-table { background: white; border-radius: 12px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f5f5f5; padding: 12px; text-align: left; font-weight: bold; color: #333; border-bottom: 2px solid #ddd; }
        td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
        tr:hover { background: #f9f9f9; }
        .status-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-processing { background: #cfe2ff; color: #084298; }
        .status-shipped { background: #d1ecf1; color: #0c5460; }
        .status-delivered { background: #d4edda; color: #155724; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">🔐 Admin - Order Management</div>
            <div class="nav">
                <a href="/admin">← Dashboard</a>
                <a href="/">Store</a>
                <a href="/logout">Logout</a>
            </div>
        </div>
    </div>

    <div class="container">
        <div class="data-table">
            <h2>📦 All Orders (${orders.rows.length})</h2>
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Customer</th>
                        <th>Email</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Shipping Address</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${orders.rows.map(o => `
                        <tr>
                            <td>#${o.id}</td>
                            <td>${o.username}</td>
                            <td>${o.email}</td>
                            <td>$${parseFloat(o.total).toFixed(2)}</td>
                            <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                            <td>${o.shipping_address}</td>
                            <td>${new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>
</body>
</html>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});

// ═══════════════════════════════════
// ADMIN - CHANGE PASSWORD
// ═══════════════════════════════════
app.get('/admin/change-password', async (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    if (!isAdmin(req)) {
        return res.send('<h2>Access Denied</h2>');
    }
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Change Admin Password</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; }
        .header { background: #212121; padding: 20px; color: white; }
        .header-content { max-width: 1200px; margin: 0 auto; }
        .logo { font-size: 24px; font-weight: bold; }
        .container { max-width: 600px; margin: 50px auto; padding: 0 20px; }
        .form-box { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        h1 { margin-bottom: 30px; color: #333; text-align: center; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-weight: bold; color: #555; }
        .form-group input { width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; font-size: 14px; }
        .form-group input:focus { border-color: #667eea; outline: none; }
        .btn-group { display: flex; gap: 15px; margin-top: 30px; }
        .btn { padding: 14px 30px; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; text-decoration: none; display: inline-block; text-align: center; flex: 1; }
        .btn-primary { background: #667eea; color: white; }
        .btn-secondary { background: #e0e0e0; color: #333; }
        .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin-bottom: 20px; color: #1976d2; }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="logo">🔐 Admin - Change Password</div>
        </div>
    </div>

    <div class="container">
        <div class="form-box">
            <h1>🔒 Change Admin Password</h1>
            
            <div class="info-box">
                ℹ️ Update your admin password for enhanced security.
            </div>
            
            <form method="POST" action="/admin/update-password">
                <div class="form-group">
                    <label>Current Password *</label>
                    <input type="password" name="currentPassword" required>
                </div>
                
                <div class="form-group">
                    <label>New Password *</label>
                    <input type="password" name="newPassword" minlength="6" required>
                </div>
                
                <div class="form-group">
                    <label>Confirm New Password *</label>
                    <input type="password" name="confirmPassword" minlength="6" required>
                </div>
                
                <div class="btn-group">
                    <button type="submit" class="btn btn-primary">🔐 Update Password</button>
                    <a href="/admin" class="btn btn-secondary">Cancel</a>
                </div>
            </form>
        </div>
    </div>
</body>
</html>
    `);
});

app.post('/admin/update-password', async (req, res) => {
    if (!isLoggedIn(req) || !isAdmin(req)) {
        return res.redirect('/login');
    }
    
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        if (newPassword !== confirmPassword) {
            return res.send('<h2>Error: New passwords do not match</h2><a href="/admin/change-password">Back</a>');
        }
        
        const currentHash = md5(currentPassword);
        const user = await pool.query(
            'SELECT * FROM users WHERE id = $1 AND password_md5 = $2',
            [req.session.userId, currentHash]
        );
        
        if (user.rows.length === 0) {
            return res.send('<h2>Error: Current password is incorrect</h2><a href="/admin/change-password">Back</a>');
        }
        
        const newHash = md5(newPassword);
        await pool.query(
            'UPDATE users SET password_md5 = $1 WHERE id = $2',
            [newHash, req.session.userId]
        );
        
        res.send(`
            <h2>✅ Admin Password Updated Successfully!</h2>
            <p>Your admin password has been changed.</p>
            <a href="/admin">Back to Dashboard</a>
        `);
    } catch (err) {
        res.status(500).send('Error: ' + err.message);
    }
});
// ═══════════════════════════════════
app.get('/upload', (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Upload File - ToyStore</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .upload-box { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); max-width: 500px; width: 100%; }
        h2 { margin-bottom: 20px; color: #333; }
        .upload-area { border: 2px dashed #667eea; border-radius: 8px; padding: 40px; text-align: center; margin: 20px 0; }
        input[type="file"] { margin: 20px 0; }
        button { width: 100%; padding: 14px; background: #667eea; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer; }
    </style>
</head>
<body>
    <div class="upload-box">
        <h2>Upload Profile Picture</h2>
        <form method="POST" action="/upload" enctype="multipart/form-data">
            <div class="upload-area">
                <p style="color: #888; margin-bottom: 15px;">Choose a file to upload</p>
                <input type="file" name="file" required>
            </div>
            <button type="submit">Upload</button>
        </form>
        <a href="/" style="display: block; text-align: center; margin-top: 20px; color: #667eea; text-decoration: none;">Back to Home</a>
    </div>
</body>
</html>
    `);
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!isLoggedIn(req)) {
        return res.redirect('/login');
    }
    
    // Vulnerability: No file type validation, no size limit properly enforced
    if (!req.file) {
        return res.send('<h2>No file uploaded</h2>');
    }
    
    res.send(`
        <h2>File Uploaded Successfully!</h2>
        <p>Filename: ${req.file.originalname}</p>
        <p>Size: ${req.file.size} bytes</p>
        <p>Stored as: ${req.file.filename}</p>
        <a href="/">Back to Home</a>
    `);
});

// ═══════════════════════════════════
// DEBUG PAGE (Information Disclosure)
// ═══════════════════════════════════
app.get('/debug', (req, res) => {
    // Vulnerability: Exposes sensitive environment variables
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Debug Info</title>
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
        h1 { color: #4ec9b0; }
        .info { background: #2d2d2d; padding: 15px; border-radius: 8px; margin: 10px 0; }
        .key { color: #9cdcfe; }
        .value { color: #ce9178; }
    </style>
</head>
<body>
    <h1>🐛 Debug Information</h1>
    <div class="info">
        <div><span class="key">Database Host:</span> <span class="value">${process.env.DB_HOST || 'db'}</span></div>
        <div><span class="key">Database Name:</span> <span class="value">${process.env.DB_NAME || 'vulnlab'}</span></div>
        <div><span class="key">Database User:</span> <span class="value">${process.env.DB_USER || 'vulnuser'}</span></div>
        <div><span class="key">Database Password:</span> <span class="value">${process.env.DB_PASS || 'vulnpass'}</span></div>
        <div><span class="key">Session Secret:</span> <span class="value">weak-secret-key-12345</span></div>
        <div><span class="key">Node Environment:</span> <span class="value">${process.env.NODE_ENV || 'development'}</span></div>
    </div>
    <a href="/" style="color: #4ec9b0;">Back to Home</a>
</body>
</html>
    `);
});

// ═══════════════════════════════════
// SERVER
// ═══════════════════════════════════
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🧸 ToyStore running on port ${PORT}`);
});
