# RAG Application Deployment Guide

This guide explains how to deploy the RAG (Retrieval-Augmented Generation) application using Docker and Docker Compose.

## 📋 Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)
- Google API Key for Gemini
- At least 4GB RAM available for containers

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd RAG
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your configuration
nano .env  # or use your preferred editor
```

Required environment variables:
- `GOOGLE_API_KEY`: Your Google Gemini API key
- `MONGO_ROOT_PASSWORD`: Secure password for MongoDB
- `MONGO_DB_NAME`: Database name (default: rag_db)

### 3. Deploy

#### Development Deployment
```bash
# Linux/Mac
./deploy.sh

# Windows
deploy.bat
```

#### Production Deployment
```bash
# Linux/Mac
./deploy.sh prod

# Windows
deploy.bat prod
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Frontend    │    │     Backend     │    │    MongoDB      │
│   (React/Nginx) │────│  (FastAPI/Python)├────│   (Database)    │
│     Port 80     │    │    Port 8000    │    │   Port 27017    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📂 Docker Services

### Frontend Service
- **Image**: nginx:alpine
- **Purpose**: Serves React app and proxies API requests
- **Port**: 80
- **Health Check**: HTTP GET /

### Backend Service
- **Image**: python:3.11-slim
- **Purpose**: FastAPI server with RAG functionality
- **Port**: 8000
- **Health Check**: HTTP GET /api/

### MongoDB Service
- **Image**: mongo:7.0
- **Purpose**: Document and chat data storage
- **Port**: 27017
- **Health Check**: MongoDB ping command

## 🔧 Configuration Files

### Development (`docker-compose.yml`)
- Exposes all ports for debugging
- Volume mounts for hot reloading
- Development-friendly settings

### Production (`docker-compose.prod.yml`)
- Production-optimized settings
- Nginx reverse proxy
- SSL-ready configuration
- Log rotation

## 📊 Monitoring and Logs

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Check Service Status
```bash
docker-compose ps
```

### Health Checks
All services include health checks that can be monitored:
```bash
docker-compose ps --format "table {{.Name}}\t{{.Status}}"
```

## 🔒 Security Considerations

### Development
- MongoDB exposed on port 27017 for debugging
- CORS enabled for all origins
- Debug mode enabled

### Production
- Services isolated behind Nginx reverse proxy
- Rate limiting enabled
- Security headers configured
- Logging with rotation

## 🚨 Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -tulpn | grep :80
   
   # Stop conflicting services
   sudo systemctl stop apache2  # or nginx
   ```

2. **MongoDB Connection Failed**
   ```bash
   # Check MongoDB logs
   docker-compose logs mongodb
   
   # Verify MongoDB is healthy
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
   ```

3. **Backend API Not Responding**
   ```bash
   # Check backend logs
   docker-compose logs backend
   
   # Test API directly
   curl http://localhost:8000/api/
   ```

4. **Frontend Not Loading**
   ```bash
   # Check frontend logs
   docker-compose logs frontend
   
   # Test nginx configuration
   docker-compose exec frontend nginx -t
   ```

### Reset and Clean Start
```bash
# Stop all services
docker-compose down

# Remove volumes (⚠️ This deletes all data)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Clean rebuild
docker-compose build --no-cache
docker-compose up -d
```

## 📈 Scaling

### Horizontal Scaling
```bash
# Scale backend service
docker-compose up -d --scale backend=3

# Scale with load balancer (production)
# Edit nginx.conf to add upstream servers
```

### Resource Limits
Add to docker-compose.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## 🔄 Updates and Maintenance

### Update Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Backup Database
```bash
# Create backup
docker-compose exec mongodb mongodump --out /data/backup

# Copy backup to host
docker cp $(docker-compose ps -q mongodb):/data/backup ./mongodb-backup
```

### Restore Database
```bash
# Copy backup to container
docker cp ./mongodb-backup $(docker-compose ps -q mongodb):/data/restore

# Restore
docker-compose exec mongodb mongorestore /data/restore
```

## 🆘 Support

For issues and questions:
1. Check logs: `docker-compose logs -f`
2. Verify health: `docker-compose ps`
3. Check environment: Review `.env` file
4. Restart services: `docker-compose restart`

## 📝 Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MONGO_ROOT_USERNAME` | MongoDB admin username | admin | No |
| `MONGO_ROOT_PASSWORD` | MongoDB admin password | - | Yes |
| `MONGO_DB_NAME` | Database name | rag_db | No |
| `GOOGLE_API_KEY` | Google Gemini API key | - | Yes |
| `FRONTEND_BACKEND_URL` | Backend URL for frontend | - | Prod only |
