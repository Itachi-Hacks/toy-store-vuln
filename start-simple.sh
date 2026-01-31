#!/bin/bash

# ============================================================
# ToyStore VulnLab - Simple Startup Script
# Uses 'docker compose' (modern Docker Compose plugin)
# ============================================================

set -e

echo "=========================================="
echo "🧸 ToyStore Vulnerable Lab Setup"
echo "=========================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    echo "Please start Docker and try again"
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Handle stop command
if [ "$1" == "--stop" ] || [ "$1" == "stop" ]; then
    echo "🛑 Stopping ToyStore..."
    docker compose down -v
    echo "✓ Stopped and cleaned up"
    exit 0
fi

# Start the application
echo "🚀 Starting ToyStore..."
echo ""

docker compose up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "=========================================="
echo "✅ ToyStore is ready!"
echo "=========================================="
echo ""
echo "🌐 Access the application:"
echo "   http://localhost:3000"
echo ""
echo "👤 Test Accounts:"
echo "   Username: user   | Password: user12"
echo "   Username: admin  | Password: admin1"
echo "   Username: buyer  | Password: buyer1"
echo ""
echo "🗄️  Database (PostgreSQL):"
echo "   Host: localhost:5432"
echo "   Database: vulnlab"
echo "   User: vulnuser"
echo "   Password: vulnpass"
echo ""
echo "🛑 To stop: ./start-simple.sh --stop"
echo "   Or run: docker compose down -v"
echo "=========================================="
echo ""
echo "📝 View logs: docker compose logs -f"
echo "📊 Check status: docker compose ps"
echo ""
