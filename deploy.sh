#!/bin/bash

# RAG Application Deployment Script

set -e

echo "🚀 Starting RAG Application Deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
if [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ GOOGLE_API_KEY is not set in .env file"
    exit 1
fi

if [ -z "$MONGO_ROOT_PASSWORD" ]; then
    echo "❌ MONGO_ROOT_PASSWORD is not set in .env file"
    exit 1
fi

echo "✅ Environment variables validated"

# Build and start services
echo "🔨 Building and starting services..."

if [ "$1" = "prod" ]; then
    echo "🌟 Production deployment"
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d
else
    echo "🛠️  Development deployment"
    docker-compose down --remove-orphans
    docker-compose build --no-cache
    docker-compose up -d
fi

echo "⏳ Waiting for services to be healthy..."

# Wait for services to be healthy
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo "✅ Services are healthy!"
        break
    fi
    
    echo "⏳ Waiting for services... (attempt $((attempt + 1))/$max_attempts)"
    sleep 10
    attempt=$((attempt + 1))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Services failed to become healthy within the timeout period"
    echo "📋 Service status:"
    docker-compose ps
    echo "📋 Logs:"
    docker-compose logs --tail=50
    exit 1
fi

echo "🎉 RAG Application deployed successfully!"

if [ "$1" = "prod" ]; then
    echo "🌐 Application available at: http://your-domain.com"
else
    echo "🌐 Application available at: http://localhost"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📊 MongoDB: localhost:27017"
fi

echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop: docker-compose down"
echo "  Restart: docker-compose restart"
echo "  Status: docker-compose ps"
