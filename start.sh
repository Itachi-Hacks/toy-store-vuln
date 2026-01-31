#!/bin/bash

# ============================================================
# ToyStore VulnLab - Startup Script
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

# Detect docker-compose command (supports both old and new versions)
DOCKER_COMPOSE=""
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
    echo "✓ Using docker-compose (standalone)"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
    echo "✓ Using docker compose (plugin)"
else
    echo "❌ Error: Neither 'docker-compose' nor 'docker compose' is available"
    echo "Please install Docker Compose and try again"
    exit 1
fi

echo "✓ Docker is running"
echo ""

# Handle stop command
if [ "$1" == "--stop" ] || [ "$1" == "stop" ]; then
    echo "🛑 Stopping ToyStore..."
    $DOCKER_COMPOSE down -v
    echo "✓ Stopped and cleaned up"
    exit 0
fi

# Start the application
echo "🚀 Starting ToyStore..."
echo ""

$DOCKER_COMPOSE up --build -d

echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for database
echo -n "Waiting for PostgreSQL... "
for i in {1..30}; do
    if $DOCKER_COMPOSE exec -T db pg_isready -U vulnuser -d vulnlab > /dev/null 2>&1; then
        echo "✓"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "❌ Timeout"
        exit 1
    fi
done

# Wait for web application
echo -n "Waiting for Web Application... "
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✓"
        break
    fi
    sleep 1
    if [ $i -eq 30 ]; then
        echo "❌ Timeout"
        exit 1
    fi
done

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
echo "🛑 To stop: ./start.sh --stop"
echo "=========================================="
echo ""
