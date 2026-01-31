# ToyStore Application - Updates & New Features

## Overview
This updated version of the ToyStore application includes a fully functional shopping cart system with real-time updates and a complete checkout process with payment handling.

## New Features Added

### 1. **Working Shopping Cart with Real-Time Updates**
- **Add to Cart from Product Details Page**: Users can now add products to their cart directly from the product detail page
- **Real-Time Cart Count**: Cart badge in the header updates automatically when items are added
- **Quantity Management**: Users can increase/decrease quantities directly in the cart
- **Remove Items**: Users can remove individual items from their cart
- **Stock Validation**: System checks product availability before adding to cart
- **Cart Persistence**: Cart items are saved in the database and persist across sessions

### 2. **Complete Checkout & Payment System**
- **Checkout Page**: Comprehensive checkout form with shipping and payment information
- **Payment Form**: Collects full credit card details including:
  - Card Holder Name
  - Card Number (16 digits)
  - Expiration Date (MM/YY format)
  - CVV (3-4 digits)
  - Billing Zip Code
- **Order Creation**: Automatically creates orders and order items
- **Stock Management**: Reduces product stock when orders are placed
- **Order Confirmation**: Displays detailed order confirmation page after successful payment

### 3. **Payment Data Storage (INTENTIONAL VULNERABILITY)**
⚠️ **SECURITY WARNING**: This is an intentionally vulnerable application for educational purposes.

**Payment details are stored in PLAINTEXT in the database**, including:
- Full Card Number
- CVV Code
- Expiration Date
- Card Holder Name
- Billing Zip Code

**Database Table: `payments`**
```sql
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    amount NUMERIC(10,2) NOT NULL,
    card_number VARCHAR(16),    -- PLAINTEXT (vulnerability)
    card_holder VARCHAR(128),   -- PLAINTEXT (vulnerability)
    cvv VARCHAR(4),             -- PLAINTEXT (vulnerability)
    expiry_date VARCHAR(5),     -- PLAINTEXT (vulnerability)
    billing_zip VARCHAR(10),    -- PLAINTEXT
    method VARCHAR(32) DEFAULT 'card',
    status VARCHAR(32) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 4. **Admin Dashboard Enhancements**
- **Payment Details View**: Admin can view all payment information in plaintext
- **Complete Transaction History**: Shows all orders with associated payment details
- **Customer Information**: Displays customer email and username alongside payment data
- **Security Warning**: Dashboard displays a warning about the plaintext storage vulnerability

### 5. **Orders Management**
- **My Orders Page**: Users can view all their past orders
- **Order Status Tracking**: Shows current status (pending, processing, shipped, delivered)
- **Order Details**: View complete order information including items and total

## API Endpoints Added

### Cart Management
- `POST /api/cart/add` - Add item to cart
- `POST /api/cart/update` - Update item quantity
- `POST /api/cart/remove` - Remove item from cart

### Checkout & Payment
- `GET /checkout` - Display checkout page
- `POST /process-payment` - Process payment and create order
- `GET /order-confirmation/:orderId` - Show order confirmation

### Order Management
- `GET /orders` - View user's order history

## How to Use

### For Users:
1. **Browse Products**: Visit the home page or shop page
2. **View Product Details**: Click on any product to see details
3. **Add to Cart**: Select quantity and click "Add to Cart" (requires login)
4. **View Cart**: Click the cart icon in the header
5. **Checkout**: Click "Proceed to Checkout" from the cart page
6. **Enter Payment Details**: Fill in shipping and payment information
7. **Place Order**: Click "Place Order" to complete the purchase
8. **View Confirmation**: See order confirmation with order number
9. **Track Orders**: Visit "My Orders" page to view order history

### For Admins:
1. **Login as Admin**: Use admin credentials
2. **Access Dashboard**: Click "Admin" in the navigation
3. **View Payment Data**: Scroll down to see all payment details in plaintext
4. **Security Note**: Dashboard shows warning about plaintext storage

## Test Cards (For Testing Only)

Use these fake card numbers for testing:
- **Card Number**: 4532123456789012 (Visa)
- **Card Number**: 5425233430109903 (Mastercard)
- **Expiration**: Any future date (e.g., 12/25)
- **CVV**: Any 3 digits (e.g., 123)
- **Billing Zip**: Any zip code (e.g., 10001)

## Database Schema Updates

The database has been updated with:
- Enhanced `payments` table with additional fields
- Sample payment data for demonstration
- Proper foreign key relationships

## Security Vulnerabilities (Educational)

This application intentionally contains the following vulnerabilities:
1. **Plaintext Password Storage** (MD5 hashing only)
2. **SQL Injection** vulnerabilities
3. **Stored XSS** in reviews
4. **Plaintext Credit Card Storage** (NEW)
5. **CVV Storage** (PCI-DSS violation)
6. **Weak Session Management**
7. **Missing Security Headers**

⚠️ **DO NOT USE THIS CODE IN PRODUCTION**

This is a learning tool for security education and penetration testing practice.

## Running the Application

```bash
# Start with Docker Compose
docker-compose up -d

# Access the application
http://localhost:3000

# Default credentials:
User: user / user12
Admin: admin / admin1
```

## Files Modified

1. `web-app.js` - Added cart, checkout, and payment functionality
2. `db/init.sql` - Updated payments table schema
3. Added this `UPDATES.md` file

## Technologies Used

- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **Session Management**: express-session
- **Frontend**: Vanilla HTML/CSS/JavaScript with real-time updates

---

**Reminder**: This is an intentionally vulnerable application for educational purposes only. Never store payment details in plaintext in real applications!
