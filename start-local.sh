#!/bin/bash

# ========================================
# Local Development Startup Script
# Multi-Tenant SaaS Application
# ========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if PostgreSQL is running
check_postgres() {
    log_info "Checking PostgreSQL connection..."
    if pg_isready -h localhost -p 5432 -U saas_user -d saas_app > /dev/null 2>&1; then
        log_success "PostgreSQL is running"
        return 0
    else
        log_error "PostgreSQL is not running or not accessible"
        log_info "Please start PostgreSQL and ensure the database 'saas_app' exists"
        return 1
    fi
}

# Check if Redis is running
check_redis() {
    log_info "Checking Redis connection..."
    if redis-cli -h localhost -p 6379 -a redis_password ping > /dev/null 2>&1; then
        log_success "Redis is running"
        return 0
    else
        log_warning "Redis is not running or not accessible"
        log_info "Redis is optional for basic functionality"
        return 0
    fi
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."
    cd database
    if node migrate.js run; then
        log_success "Database migrations completed"
        cd ..
        return 0
    else
        log_error "Database migrations failed"
        cd ..
        return 1
    fi
}

# Install backend dependencies
setup_backend() {
    log_info "Setting up backend..."
    cd backend
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing backend dependencies..."
        npm install
    fi
    
    log_success "Backend setup completed"
    cd ..
}

# Install frontend dependencies
setup_frontend() {
    log_info "Setting up frontend..."
    cd frontend
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing frontend dependencies..."
        npm install
    fi
    
    log_success "Frontend setup completed"
    cd ..
}

# Start backend server
start_backend() {
    log_info "Starting backend server..."
    cd backend
    
    # Start backend in background
    npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    
    log_success "Backend server started (PID: $BACKEND_PID)"
    cd ..
    
    # Wait for backend to be ready
    log_info "Waiting for backend to be ready..."
    for i in {1..30}; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log_success "Backend is ready"
            return 0
        fi
        sleep 1
    done
    
    log_error "Backend failed to start properly"
    return 1
}

# Start frontend server
start_frontend() {
    log_info "Starting frontend server..."
    cd frontend
    
    # Start frontend in background
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    
    log_success "Frontend server started (PID: $FRONTEND_PID)"
    cd ..
    
    # Wait for frontend to be ready
    log_info "Waiting for frontend to be ready..."
    for i in {1..30}; do
        if curl -f http://localhost:3000 > /dev/null 2>&1; then
            log_success "Frontend is ready"
            return 0
        fi
        sleep 1
    done
    
    log_warning "Frontend may still be starting up"
    return 0
}

# Stop all services
stop_services() {
    log_info "Stopping all services..."
    
    # Stop backend
    if [ -f logs/backend.pid ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            log_success "Backend stopped"
        fi
        rm -f logs/backend.pid
    fi
    
    # Stop frontend
    if [ -f logs/frontend.pid ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill $FRONTEND_PID
            log_success "Frontend stopped"
        fi
        rm -f logs/frontend.pid
    fi
    
    log_success "All services stopped"
}

# Show service info
show_info() {
    echo ""
    log_success "🎉 Local development environment started!"
    echo ""
    echo "📋 Service URLs:"
    echo "   Frontend:        http://localhost:3000"
    echo "   Backend API:     http://localhost:3001"
    echo "   API Health:      http://localhost:3001/health"
    echo ""
    echo "📊 Default Login Credentials:"
    echo "   Super Admin:     superadmin@saas-app.com / password123"
    echo "   Acme Corp:       admin@acme-corp.com / password123"
    echo "   TechStart:       admin@techstart.com / password123"
    echo "   Global Ent:      admin@global-enterprises.com / password123"
    echo ""
    echo "📝 Logs:"
    echo "   Backend:         tail -f logs/backend.log"
    echo "   Frontend:        tail -f logs/frontend.log"
    echo ""
    echo "🛑 To stop services:"
    echo "   ./start-local.sh --stop"
    echo ""
}

# Main function
main() {
    echo "========================================="
    echo "🚀 Multi-Tenant SaaS Local Development"
    echo "========================================="
    echo ""
    
    # Parse command line arguments
    case "${1:-start}" in
        "start")
            # Create logs directory
            mkdir -p logs
            
            # Check dependencies
            if ! check_postgres; then
                exit 1
            fi
            check_redis
            
            # Setup services
            setup_backend
            setup_frontend
            
            # Run migrations
            if ! run_migrations; then
                exit 1
            fi
            
            # Start services
            if start_backend && start_frontend; then
                show_info
                
                # Keep script running
                log_info "Services are running. Press Ctrl+C to stop."
                trap stop_services INT TERM
                wait
            else
                log_error "Failed to start services"
                stop_services
                exit 1
            fi
            ;;
        "stop")
            stop_services
            ;;
        "status")
            echo "Service Status:"
            echo "==============="
            
            # Check backend
            if [ -f logs/backend.pid ] && kill -0 $(cat logs/backend.pid) 2>/dev/null; then
                echo "✅ Backend: Running (PID: $(cat logs/backend.pid))"
            else
                echo "❌ Backend: Not running"
            fi
            
            # Check frontend
            if [ -f logs/frontend.pid ] && kill -0 $(cat logs/frontend.pid) 2>/dev/null; then
                echo "✅ Frontend: Running (PID: $(cat logs/frontend.pid))"
            else
                echo "❌ Frontend: Not running"
            fi
            
            # Check services
            if curl -f http://localhost:3001/health > /dev/null 2>&1; then
                echo "✅ Backend API: Healthy"
            else
                echo "❌ Backend API: Not responding"
            fi
            
            if curl -f http://localhost:3000 > /dev/null 2>&1; then
                echo "✅ Frontend: Accessible"
            else
                echo "❌ Frontend: Not accessible"
            fi
            ;;
        "logs")
            if [ -n "$2" ]; then
                tail -f logs/$2.log
            else
                echo "Available logs:"
                echo "  ./start-local.sh logs backend"
                echo "  ./start-local.sh logs frontend"
            fi
            ;;
        "help")
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start    Start all services (default)"
            echo "  stop     Stop all services"
            echo "  status   Show service status"
            echo "  logs     Show logs (backend|frontend)"
            echo "  help     Show this help message"
            echo ""
            ;;
        *)
            log_error "Unknown command: $1"
            echo "Use '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

