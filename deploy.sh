#!/bin/bash

# ========================================
# Deployment Script for Multi-Tenant SaaS
# ========================================

set -e  # Exit on any error

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

# Check if Docker and Docker Compose are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Determine which docker compose command to use
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    else
        DOCKER_COMPOSE="docker compose"
    fi
    
    log_success "Dependencies check passed"
}

# Setup environment file
setup_environment() {
    log_info "Setting up environment..."
    
    if [ ! -f .env ]; then
        if [ -f .env.docker ]; then
            cp .env.docker .env
            log_success "Environment file created from .env.docker"
        else
            log_error ".env.docker file not found. Please create it first."
            exit 1
        fi
    else
        log_warning ".env file already exists. Using existing configuration."
    fi
}

# Generate secure secrets
generate_secrets() {
    log_info "Generating secure secrets..."
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    NEXTAUTH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    DB_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/")
    REDIS_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/")
    
    # Update .env file with generated secrets
    sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=${JWT_SECRET}/" .env
    sed -i.bak "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}/" .env
    sed -i.bak "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=${NEXTAUTH_SECRET}/" .env
    sed -i.bak "s/DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env
    sed -i.bak "s/REDIS_PASSWORD=.*/REDIS_PASSWORD=${REDIS_PASSWORD}/" .env
    
    # Remove backup file
    rm -f .env.bak
    
    log_success "Secure secrets generated and updated in .env file"
}

# Build and start services
deploy_services() {
    log_info "Building and starting services..."
    
    # Build images
    log_info "Building Docker images..."
    $DOCKER_COMPOSE build --no-cache
    
    # Start core services (database and cache first)
    log_info "Starting core services..."
    $DOCKER_COMPOSE up -d postgres redis
    
    # Wait for services to be ready
    log_info "Waiting for core services to be ready..."
    sleep 10
    
    # Run database migrations
    log_info "Running database migrations..."
    $DOCKER_COMPOSE --profile migration run --rm migrator
    
    # Start application services
    log_info "Starting application services..."
    $DOCKER_COMPOSE up -d backend frontend
    
    # Wait for application services
    log_info "Waiting for application services to be ready..."
    sleep 15
    
    log_success "All services started successfully"
}

# Start monitoring services
start_monitoring() {
    log_info "Starting monitoring services..."
    $DOCKER_COMPOSE --profile monitoring up -d
    log_success "Monitoring services started"
}

# Start nginx reverse proxy
start_nginx() {
    log_info "Starting Nginx reverse proxy..."
    $DOCKER_COMPOSE --profile nginx up -d nginx
    log_success "Nginx reverse proxy started"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    # Check backend health
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        log_success "Backend service is healthy"
    else
        log_error "Backend service health check failed"
        return 1
    fi
    
    # Check frontend health (if available)
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_success "Frontend service is healthy"
    else
        log_warning "Frontend health check endpoint not available"
    fi
    
    # Check database connection
    if $DOCKER_COMPOSE exec -T postgres pg_isready -U saas_user -d saas_app > /dev/null 2>&1; then
        log_success "Database is ready"
    else
        log_error "Database connection failed"
        return 1
    fi
    
    # Check Redis connection
    if $DOCKER_COMPOSE exec -T redis redis-cli ping > /dev/null 2>&1; then
        log_success "Redis is ready"
    else
        log_error "Redis connection failed"
        return 1
    fi
    
    log_success "All health checks passed"
}

# Show deployment info
show_info() {
    echo ""
    log_success "🎉 Deployment completed successfully!"
    echo ""
    echo "📋 Service URLs:"
    echo "   Frontend:        http://localhost:3000"
    echo "   Backend API:     http://localhost:3001"
    echo "   API Health:      http://localhost:3001/health"
    echo ""
    echo "🔧 Management URLs:"
    echo "   pgAdmin:         http://localhost:8080"
    echo "   Redis Commander: http://localhost:8081"
    echo ""
    echo "📊 Default Login Credentials:"
    echo "   Super Admin:     superadmin@saas-app.com / password123"
    echo "   Acme Corp:       admin@acme-corp.com / password123"
    echo "   TechStart:       admin@techstart.com / password123"
    echo "   Global Ent:      admin@global-enterprises.com / password123"
    echo ""
    echo "🐳 Docker Commands:"
    echo "   View logs:       $DOCKER_COMPOSE logs -f [service]"
    echo "   Stop services:   $DOCKER_COMPOSE down"
    echo "   Restart:         $DOCKER_COMPOSE restart [service]"
    echo ""
    log_warning "⚠️  Remember to change default passwords in production!"
}

# Cleanup function
cleanup() {
    log_info "Stopping all services..."
    $DOCKER_COMPOSE down
    log_success "Cleanup completed"
}

# Main deployment function
main() {
    echo "========================================="
    echo "🚀 Multi-Tenant SaaS Deployment Script"
    echo "========================================="
    echo ""
    
    # Parse command line arguments
    SKIP_SECRETS=false
    INCLUDE_MONITORING=false
    INCLUDE_NGINX=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-secrets)
                SKIP_SECRETS=true
                shift
                ;;
            --with-monitoring)
                INCLUDE_MONITORING=true
                shift
                ;;
            --with-nginx)
                INCLUDE_NGINX=true
                shift
                ;;
            --cleanup)
                cleanup
                exit 0
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-secrets     Skip secret generation (use existing .env)"
                echo "  --with-monitoring  Include monitoring services (pgAdmin, Redis Commander)"
                echo "  --with-nginx       Include Nginx reverse proxy"
                echo "  --cleanup          Stop and remove all services"
                echo "  --help             Show this help message"
                echo ""
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_dependencies
    setup_environment
    
    if [ "$SKIP_SECRETS" = false ]; then
        generate_secrets
    fi
    
    deploy_services
    
    if [ "$INCLUDE_MONITORING" = true ]; then
        start_monitoring
    fi
    
    if [ "$INCLUDE_NGINX" = true ]; then
        start_nginx
    fi
    
    # Wait a bit for services to fully start
    sleep 5
    
    if health_check; then
        show_info
    else
        log_error "Deployment completed but some health checks failed"
        log_info "Check service logs with: $DOCKER_COMPOSE logs [service]"
        exit 1
    fi
}

# Handle script interruption
trap cleanup INT TERM

# Run main function
main "$@"
