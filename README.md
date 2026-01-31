# 🧸 ToyStore VulnLab - Intentionally Vulnerable E-commerce Application

> ⚠️ **WARNING: FOR EDUCATIONAL/TESTING PURPOSES ONLY**  
> This application contains intentional security vulnerabilities.  
> **NEVER** deploy to production or any public network.  
> Use only in isolated lab environments.

---

## 📋 Overview

ToyStore is a fully functional e-commerce website designed for security testing and penetration testing practice. It simulates an Amazon-like online toy store with real-world features including:

- ✅ User authentication and registration
- ✅ Product catalog with 20+ toy products
- ✅ Shopping cart functionality
- ✅ Order processing and checkout
- ✅ Payment processing (with stored credit card data)
- ✅ Product reviews and ratings
- ✅ User profiles and order history
- ✅ Admin dashboard
- ✅ Search functionality
- ✅ File upload feature

---

## 🚀 Quick Start

### Prerequisites
- Docker
- Docker Compose
- Bash (for startup script)

### Installation

```bash
cd toy-store-vuln
bash start.sh
```

The script will:
1. Build and start all containers
2. Initialize the database with sample data
3. Wait for all services to be healthy
4. Display access information

### Access the Application

- **Website:** http://localhost:3000
- **Database:** localhost:5432

### Test Accounts

| Username | Password | Role  | Description |
|----------|----------|-------|-------------|
| `user`   | `user12` | user  | Regular customer account |
| `admin`  | `admin1` | admin | Administrator account |
| `buyer`  | `buyer1` | user  | Account with existing orders |

### Stop the Application

```bash
bash start.sh --stop
```

---

## 🎯 Features

### Customer Features
- Browse 20+ toy products with images
- Search products by name, description, category
- View detailed product information
- Read and write product reviews
- Add products to shopping cart
- Checkout and payment processing
- View order history
- Manage user profile

### Admin Features
- Admin dashboard with statistics
- View all users
- Access to sensitive information

---

## 🐛 Intentional Vulnerabilities

This application contains **ALL OWASP Top 10 (2021)** vulnerabilities for comprehensive security testing practice.

### A01: Broken Access Control

#### 1. IDOR on User Profiles
- **Location:** `/profile/:id`
- **Vulnerability:** No verification that the profile belongs to the logged-in user
- **How to Test:**
  ```
  1. Login as user (ID: 1)
  2. Visit /profile/2 to see admin's profile
  3. Try /profile/3, /profile/4, etc.
  ```
- **Impact:** View any user's personal information including email, address, phone

#### 2. IDOR on Orders
- **Location:** `/order/:id`
- **Vulnerability:** Can view any order details regardless of ownership
- **How to Test:**
  ```
  1. Login and place an order (note the order ID)
  2. Increment/decrement the order ID in URL
  3. View other users' orders
  ```
- **Impact:** Access to other customers' orders, addresses, purchase history

#### 3. Admin Panel Bypass
- **Location:** `/admin`
- **Vulnerability:** Can bypass admin check with query parameter
- **How to Test:**
  ```
  1. Login as regular user
  2. Visit /admin (Access Denied)
  3. Visit /admin?role=admin (Access Granted!)
  ```
- **Impact:** Full admin dashboard access without admin privileges

### A02: Cryptographic Failures

#### 4. Weak Password Hashing (MD5)
- **Location:** User registration and authentication
- **Vulnerability:** Passwords stored as MD5 hashes (easily crackable)
- **How to Test:**
  ```
  1. Register a new account with password "user12"
  2. Access database: docker exec -it toystore_db psql -U vulnuser -d vulnlab
  3. Query: SELECT username, password_md5 FROM users;
  4. Hash for "user12": d781eaae8248db6ce1a7b82e58e60435
  5. Crack using: https://crackstation.net/ or hashcat
  ```
- **Impact:** All user passwords can be easily cracked

#### 5. Plain Text Credit Card Storage
- **Location:** Payments table in database
- **Vulnerability:** Credit card numbers, CVV stored without encryption
- **How to Test:**
  ```sql
  SELECT card_number, card_holder, cvv, amount FROM payments;
  ```
- **Impact:** Complete exposure of payment card data

#### 6. Weak Session Secret
- **Location:** Application code
- **Vulnerability:** Hardcoded weak session secret
- **How to Test:** Check web-app.js line with `secret: 'weak-secret-key-12345'`
- **Impact:** Session tokens can be forged

### A03: Injection

#### 7. SQL Injection in Search
- **Location:** `/search?q=`
- **Vulnerability:** User input directly concatenated into SQL query
- **How to Test:**
  ```
  # Basic SQLi
  /search?q=' OR '1'='1
  
  # Extract users table
  /search?q=' UNION SELECT id,username,email,password_md5,role,created_at FROM users--
  
  # Extract payments (credit cards)
  /search?q=' UNION SELECT id,card_number,card_holder,cvv,amount,created_at FROM payments--
  ```
- **Impact:** Full database access, data exfiltration

#### 8. Stored XSS in Reviews
- **Location:** `/product/:id/review`
- **Vulnerability:** Review title and comment not sanitized
- **How to Test:**
  ```html
  1. Login and go to any product
  2. Write review with title: <script>alert('XSS')</script>
  3. Or comment: <img src=x onerror=alert(document.cookie)>
  4. Submit review
  5. XSS executes when anyone views the product
  ```
- **Impact:** Cookie theft, session hijacking, defacement

### A04: Insecure Design

#### 9. Client-Side Price Manipulation
- **Location:** `/checkout` → `/process-payment`
- **Vulnerability:** Payment amount is sent from client and trusted
- **How to Test:**
  ```
  1. Add items to cart (total: $100)
  2. Proceed to checkout
  3. Open browser DevTools
  4. Find: <input type="hidden" name="amount" value="100.00">
  5. Change to value="0.01"
  6. Submit form
  7. Order processed for $0.01!
  ```
- **Impact:** Purchase items for arbitrary prices (including $0)

#### 10. Unrestricted File Upload
- **Location:** `/upload`
- **Vulnerability:** No file type validation, no size limits
- **How to Test:**
  ```
  1. Login and visit /upload
  2. Upload any file type (.php, .exe, .html with JS)
  3. No validation performed
  ```
- **Impact:** Potential RCE, malware upload, XSS via uploaded files

### A05: Security Misconfiguration

#### 11. Debug Page Information Disclosure
- **Location:** `/debug`
- **Vulnerability:** Exposes database credentials and secrets
- **How to Test:** Visit http://localhost:3000/debug
- **Exposed Information:**
  - Database host, name, user, password
  - Session secret
  - Environment variables
- **Impact:** Complete system compromise

#### 12. Missing Security Headers
- **Vulnerability:** No CSP, HSTS, X-Frame-Options, etc.
- **How to Test:** 
  ```bash
  curl -I http://localhost:3000
  # Check for missing security headers
  ```
- **Impact:** Clickjacking, XSS, protocol downgrade attacks

#### 13. Insecure Session Configuration
- **Vulnerability:** Sessions without secure/httpOnly flags
- **Location:** web-app.js session configuration
- **Impact:** Session tokens accessible via JavaScript, vulnerable to theft

### A06: Vulnerable and Outdated Components

#### 14. Dependency Information Exposure
- **Vulnerability:** Using potentially vulnerable package versions
- **How to Test:** Check package.json for package versions
- **Note:** While packages used are relatively recent, the pattern demonstrates the vulnerability class

### A07: Identification and Authentication Failures

#### 15. No Rate Limiting on Login
- **Location:** `/login` POST endpoint
- **Vulnerability:** No brute force protection
- **How to Test:**
  ```bash
  # Attempt multiple logins rapidly
  for i in {1..100}; do
    curl -X POST http://localhost:3000/login \
      -d "username=admin&password=test$i"
  done
  ```
- **Impact:** Brute force attacks possible

#### 16. Weak Password Policy
- **Vulnerability:** Only requires 6 alphanumeric characters
- **How to Test:** Register with password "abc123"
- **Impact:** Easily guessable passwords

#### 17. No Account Lockout
- **Vulnerability:** Failed login attempts not tracked or limited
- **Impact:** Unlimited brute force attempts

### A08: Software and Data Integrity Failures

#### 18. No Input Validation on Critical Fields
- **Vulnerability:** Payment processing trusts client data
- **Location:** Order creation, payment processing
- **Impact:** Data integrity violations

#### 19. Incomplete Audit Logging
- **Location:** audit_logs table
- **Vulnerability:** Many events not logged (failed logins, price changes, etc.)
- **How to Test:**
  ```sql
  SELECT * FROM audit_logs;
  -- Notice missing events
  ```
- **Impact:** Cannot detect or investigate security incidents

### A09: Security Logging and Monitoring Failures

#### 20. Insufficient Logging
- **Vulnerability:** Critical events not logged
- **Missing Logs:**
  - Failed login attempts
  - Admin access
  - Price manipulation
  - SQL injection attempts
  - File uploads
- **Impact:** Attacks go undetected

#### 21. No IP Address Tracking
- **Vulnerability:** Most audit logs missing IP addresses
- **Impact:** Cannot trace attacker origin

### A10: Server-Side Request Forgery (SSRF)

#### 22. Hidden SSRF (Conceptual)
- **Note:** While not fully implemented in current version, the architecture supports SSRF through potential API integrations
- **Vulnerable Pattern:** Accepting user-controlled URLs without validation

---

## 🎓 Vulnerability Testing Guide

### Beginner Level

1. **Start with IDOR:**
   - Change user IDs in URLs
   - Access other users' profiles and orders

2. **Try Admin Bypass:**
   - Add `?role=admin` to `/admin` URL

3. **View Debug Information:**
   - Visit `/debug` page

### Intermediate Level

4. **SQL Injection:**
   - Test search with `' OR '1'='1`
   - Extract data with UNION queries

5. **XSS Attacks:**
   - Inject scripts in review comments
   - Test different XSS payloads

6. **Price Manipulation:**
   - Modify payment amount in DevTools

### Advanced Level

7. **Session Analysis:**
   - Capture and analyze session cookies
   - Attempt session fixation

8. **Password Cracking:**
   - Export MD5 hashes from database
   - Use rainbow tables or hashcat

9. **Comprehensive SQL Injection:**
   - Perform database enumeration
   - Extract sensitive tables

---

## 📊 Database Schema

### Tables

- `users` - User accounts and credentials
- `sessions` - Session management
- `products` - Toy catalog (20 items)
- `cart_items` - Shopping cart data
- `orders` - Customer orders
- `order_items` - Order line items
- `payments` - Payment information (⚠️ includes plain text card data)
- `reviews` - Product reviews (vulnerable to XSS)
- `audit_logs` - Incomplete audit trail
- `wishlist` - User wishlists

### Direct Database Access

```bash
# Access PostgreSQL
docker exec -it toystore_db psql -U vulnuser -d vulnlab

# Useful queries
\dt                          # List tables
SELECT * FROM users;         # View users
SELECT * FROM products;      # View products
SELECT * FROM payments;      # View payment data (plain text cards!)
SELECT * FROM audit_logs;    # View audit logs
```

---

## 🔍 Product Catalog

The store includes 20 realistic toy products with:
- Real product images (via Unsplash)
- Detailed descriptions
- Age ranges
- Brand names
- Stock levels
- Categories: Building Toys, Dolls, Vehicles, Action Toys, Electronics, Educational, Arts & Crafts, Board Games, Puzzles, Plush Toys, Outdoor Toys, Collectibles, etc.

---

## 🛡️ Security Testing Best Practices

### What You Can Test:

✅ SQL Injection  
✅ XSS (Stored and Reflected)  
✅ IDOR  
✅ Broken Access Control  
✅ Weak Cryptography  
✅ Insecure Direct Object References  
✅ Price Manipulation  
✅ Session Management  
✅ Authentication Bypass  
✅ Information Disclosure  

### What NOT to Do:

❌ Deploy to internet or any public network  
❌ Use real personal information  
❌ Store actual payment cards  
❌ Use for malicious purposes  

---

## 📝 Vulnerability Summary Table

| # | Vulnerability | Location | OWASP | Severity |
|---|---------------|----------|-------|----------|
| 1 | IDOR - User Profiles | `/profile/:id` | A01 | High |
| 2 | IDOR - Orders | `/order/:id` | A01 | High |
| 3 | Admin Bypass | `/admin?role=admin` | A01 | Critical |
| 4 | MD5 Password Hashing | User auth | A02 | Critical |
| 5 | Plain Text Credit Cards | Payments table | A02 | Critical |
| 6 | Weak Session Secret | App config | A02 | High |
| 7 | SQL Injection | `/search` | A03 | Critical |
| 8 | Stored XSS | Product reviews | A03 | High |
| 9 | Price Manipulation | `/checkout` | A04 | Critical |
| 10 | Unrestricted File Upload | `/upload` | A04 | High |
| 11 | Debug Info Disclosure | `/debug` | A05 | Critical |
| 12 | Missing Security Headers | All pages | A05 | Medium |
| 13 | Insecure Sessions | App config | A05 | High |
| 14 | No Rate Limiting | `/login` | A07 | High |
| 15 | Weak Password Policy | Registration | A07 | High |
| 16 | Incomplete Logging | Audit logs | A09 | Medium |
| 17 | No IP Tracking | Audit logs | A09 | Low |

---

## 🎯 Learning Objectives

After testing this application, you should understand:

1. How IDOR vulnerabilities work and their impact
2. The dangers of weak cryptographic functions (MD5)
3. SQL injection attack vectors and prevention
4. XSS types and exploitation techniques
5. Client-side validation bypass
6. Importance of proper access controls
7. Secure session management
8. Proper audit logging
9. Defense in depth principles
10. Secure coding practices

---

## 🔧 Technical Stack

- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL 15
- **Container:** Docker + Docker Compose
- **Frontend:** Server-side rendered HTML
- **Session:** express-session

---

## 📚 Additional Resources

### Learn More About Web Security:
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [PortSwigger Web Security Academy](https://portswigger.net/web-security)
- [HackTheBox](https://www.hackthebox.com/)
- [TryHackMe](https://tryhackme.com/)

### Recommended Tools:
- **Burp Suite** - Web application security testing
- **OWASP ZAP** - Automated vulnerability scanner
- **SQLMap** - SQL injection exploitation
- **Hashcat** - Password cracking
- **curl** - Manual HTTP requests

---

## ⚖️ Legal Disclaimer

This application is designed exclusively for educational and authorized security testing purposes. Users must:

- Only use in isolated, controlled environments
- Never deploy to production networks
- Not use for unauthorized access
- Comply with all applicable laws and regulations
- Obtain proper authorization before testing

The creators assume no liability for misuse of this software.

---

## 📞 Support

This is an educational tool. For questions or issues:
- Review the vulnerability documentation above
- Check Docker logs: `docker-compose logs`
- Verify services: `docker-compose ps`

---

## 🎓 Conclusion

ToyStore VulnLab provides a safe, legal environment to practice identifying and exploiting common web application vulnerabilities. Use it to:

- Sharpen your penetration testing skills
- Learn secure coding practices
- Understand attacker methodologies
- Prepare for security certifications
- Train security teams

**Remember:** Every vulnerability here should be avoided in real applications!

---

**Version:** 1.0.0  
**Last Updated:** January 2025  
**License:** Educational Use Only

---

Happy (ethical) hacking! 🧸🔒
