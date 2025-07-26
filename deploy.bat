@echo off
REM RAG Application Deployment Script for Windows

echo 🚀 Starting RAG Application Deployment...

REM Check if .env file exists
if not exist .env (
    echo ❌ .env file not found. Please copy .env.example to .env and configure it.
    exit /b 1
)

REM Check if required tools are installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed or not in PATH
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not installed or not in PATH
    exit /b 1
)

echo ✅ Docker and Docker Compose found

REM Build and start services
echo 🔨 Building and starting services...

if "%1"=="prod" (
    echo 🌟 Production deployment
    docker-compose -f docker-compose.prod.yml down --remove-orphans
    docker-compose -f docker-compose.prod.yml build --no-cache
    docker-compose -f docker-compose.prod.yml up -d
) else (
    echo 🛠️  Development deployment
    docker-compose down --remove-orphans
    docker-compose build --no-cache
    docker-compose up -d
)

echo ⏳ Waiting for services to start...
timeout /t 30 /nobreak >nul

echo 📋 Service status:
docker-compose ps

echo 🎉 RAG Application deployment initiated!

if "%1"=="prod" (
    echo 🌐 Application will be available at: http://your-domain.com
) else (
    echo 🌐 Application available at: http://localhost
    echo 🔧 Backend API: http://localhost:8000
    echo 📊 MongoDB: localhost:27017
)

echo.
echo 📋 Useful commands:
echo   View logs: docker-compose logs -f
echo   Stop: docker-compose down
echo   Restart: docker-compose restart
echo   Status: docker-compose ps

pause
