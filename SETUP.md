# ToyStore - Setup & Installation Guide

## Quick Start

### Option 1: Using the Auto-Detection Script (Recommended)
```bash
chmod +x start.sh
./start.sh
```
This script automatically detects whether you have `docker-compose` or `docker compose` and uses the appropriate command.

### Option 2: Using the Simple Script (For Modern Docker)
```bash
chmod +x start-simple.sh
./start-simple.sh
```
This script uses `docker compose` (the modern Docker Compose plugin).

### Option 3: Manual Docker Compose
```bash
# For modern Docker with compose plugin
docker compose up --build -d

# For older standalone docker-compose
docker-compose up --build -d
```

## Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Either:
  - Docker Compose plugin (comes with modern Docker Desktop)
  - Standalone docker-compose v1.29 or higher

### Check Your Setup

```bash
# Check Docker version
docker --version

# Check for Docker Compose plugin (modern)
docker compose version

# OR check for standalone docker-compose (older)
docker-compose --version
```

## Installation Steps

1. **Extract the archive**:
   ```bash
   unzip toy-store-vuln-updated.zip
   cd toy-store-vuln
   ```

2. **Make scripts executable**:
   ```bash
   chmod +x start.sh
   chmod +x start-simple.sh
   ```

3. **Start the application**:
   ```bash
   ./start.sh
   # OR
   ./start-simple.sh
   # OR
   docker compose up -d
   ```

4. **Access the application**:
   - Open browser: http://localhost:3000

## Default Accounts

| Username | Password | Role  |
|----------|----------|-------|
| user     | user12   | User  |
| admin    | admin1   | Admin |
| buyer    | buyer1   | User  |
| test     | test12   | User  |

## Stopping the Application

```bash
# Using start script
./start.sh --stop

# Using simple script
./start-simple.sh --stop

# Using docker compose directly
docker compose down -v
```

## Viewing Logs

```bash
# All services
docker compose logs -f

# Web application only
docker compose logs -f web

# Database only
docker compose logs -f db
```

## Troubleshooting

### Error: "docker-compose is not installed"

**Solution**: You have the modern Docker Compose plugin. Use one of these:
```bash
# Use the simple script
./start-simple.sh

# Or run directly
docker compose up -d
```

### Error: "Cannot connect to the Docker daemon"

**Solution**: Start Docker:
```bash
# On Linux
sudo systemctl start docker

# On macOS/Windows
# Start Docker Desktop application
```

### Error: "Port 3000 is already in use"

**Solution**: Either stop the service using port 3000 or change the port in docker-compose.yml:
```yaml
services:
  web:
    ports:
      - "8080:3000"  # Change 8080 to any available port
```

### Database Connection Issues

```bash
# Check if database is ready
docker compose exec db pg_isready -U vulnuser -d vulnlab

# View database logs
docker compose logs db

# Restart services
docker compose restart
```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker compose down -v

# Start fresh
docker compose up --build -d
```

## Database Access

### Using psql Command Line

```bash
# Connect to database
docker compose exec db psql -U vulnuser -d vulnlab

# View all tables
\dt

# View payment details (PLAINTEXT!)
SELECT * FROM payments;

# Exit
\q
```

### Using GUI Tools

- **Host**: localhost
- **Port**: 5432
- **Database**: vulnlab
- **Username**: vulnuser
- **Password**: vulnpass

Recommended tools:
- pgAdmin
- DBeaver
- TablePlus

## Testing the New Features

### 1. Shopping Cart
```
1. Login with user account (user/user12)
2. Browse products at http://localhost:3000
3. Click on any product
4. Select quantity and click "Add to Cart"
5. View cart at http://localhost:3000/cart
6. Update quantities or remove items
```

### 2. Checkout & Payment
```
1. Add items to cart
2. Go to cart page
3. Click "Proceed to Checkout"
4. Fill in shipping information
5. Enter FAKE card details:
   - Card Number: 4532123456789012
   - Card Holder: Test User
   - Expiry: 12/25
   - CVV: 123
   - Billing Zip: 10001
6. Click "Place Order"
7. View order confirmation
```

### 3. View Payment Data (Admin)
```
1. Login as admin (admin/admin1)
2. Click "Admin" in navigation
3. Scroll down to "Payment Details" section
4. See all credit card data in PLAINTEXT!
```

### 4. Order History
```
1. Login as any user
2. Click "Orders" in navigation
3. View all past orders
4. Click "View Details" on any order
```

## Development

### File Structure
```
toy-store-vuln/
├── docker-compose.yml     # Docker services configuration
├── Dockerfile            # Web app container config
├── package.json          # Node.js dependencies
├── web-app.js           # Main application (Express server)
├── start.sh             # Auto-detection startup script
├── start-simple.sh      # Simple startup script
├── SETUP.md             # This file
├── UPDATES.md           # Documentation of changes
├── README.md            # Original README
└── db/
    └── init.sql         # Database schema and seed data
```

### Making Changes

1. **Modify code**: Edit web-app.js or db/init.sql
2. **Rebuild**: 
   ```bash
   docker compose up --build -d
   ```
3. **View changes**: Refresh browser

### Environment Variables

Edit `docker-compose.yml` to change:
- Database credentials
- Port numbers
- Node environment

## Security Notes

⚠️ **INTENTIONALLY VULNERABLE APPLICATION**

This application contains security vulnerabilities BY DESIGN:
- Plaintext password storage (MD5 only)
- SQL injection vulnerabilities
- Stored XSS attacks
- **Plaintext credit card storage**
- **CVV storage (PCI-DSS violation)**
- Weak session management
- Missing security headers

**DO NOT USE IN PRODUCTION!**

This is for:
- Security education
- Penetration testing practice
- Vulnerability assessment training

## Getting Help

If you encounter issues:

1. Check logs: `docker compose logs -f`
2. Verify Docker is running: `docker ps`
3. Check port availability: `netstat -tuln | grep 3000`
4. Reset everything: `docker compose down -v && docker compose up -d`

## Additional Commands

```bash
# Check running containers
docker compose ps

# Stop without removing volumes
docker compose stop

# Start stopped containers
docker compose start

# View resource usage
docker stats

# Execute commands in web container
docker compose exec web sh

# Execute commands in database
docker compose exec db psql -U vulnuser -d vulnlab
```

---

**Happy Testing!** 🧸
