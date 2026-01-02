# NDIS Application Development Stack - Docker Setup Guide

## Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)
- Git
- Minimum 4GB RAM available
- 10GB free disk space

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/suamnbimali/thenew.git
cd thenew
```

### 2. Configure Environment Variables

```bash
# Create environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

### 3. Start All Services

```bash
# Build and start all services
docker-compose up -d --build

# Check service status
docker-compose ps
```

### 4. Access Applications

- **Admin Portal:** http://localhost:3000
- **PocketBase Admin:** http://localhost:8090/_/
- **SCHADS Engine API:** http://localhost:8001
- **Matching Engine API:** http://localhost:8002

### 5. Initial Setup

1. **PocketBase Admin Account:**
   - Visit http://localhost:8090/_/
   - Create admin account
   - Import schema from `backend/pocketbase/pb_migrations/schema.json`

2. **Frontend Configuration:**
   - The frontend is pre-configured to connect to local services
   - No additional setup required

## Service Architecture

```
┌─────────────────┐
│  Next.js Admin  │ (Port 3000)
│   Frontend       │
└────────┬─────────┘
         │
         ├──────────────────┬──────────────────┐
         ▼                  ▼                  ▼
┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PocketBase    │  │  SCHADS Engine   │  │  Matching Engine │
│  (Port 8090)    │  │  (Port 8001)     │  │  (Port 8002)     │
└─────────────────┘  └──────────────────┘  └──────────────────┘
```

## Docker Management Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: Deletes data!)
docker-compose down -v

# View logs
# All services:
docker-compose logs -f

# Specific service:
docker-compose logs -f pocketbase
docker-compose logs -f frontend

# Rebuild specific service
docker-compose build --no-cache frontend

# Restart specific service
docker-compose restart frontend

# Execute command in container
# PocketBase shell:
docker-compose exec pocketbase sh

# Python service logs:
docker-compose exec schads-engine cat /app/logs/schads.log
```

## Troubleshooting

### Issue: Services won't start

```bash
# Check container status
docker-compose ps

# View detailed logs
docker-compose logs

# Restart services
docker-compose restart
```

### Issue: Port already in use

Edit `docker-compose.yml` and change port mappings:

```yaml
ports:
  - "3001:3000"  # Change 3000 to 3001
```

### Issue: Build failures

```bash
# Clean and rebuild
docker-compose down
docker system prune -a
docker-compose up -d --build
```

### Issue: Database connection errors

```bash
# Check PocketBase health
curl http://localhost:8090/api/health

# Restart PocketBase
docker-compose restart pocketbase
```

## Development Mode

### Running Frontend Locally (Hot Reload)

```bash
# Start backend services only
docker-compose up -d pocketbase schads-engine matching-engine

# Install frontend dependencies
cd frontend-admin
npm install

# Run frontend in development mode
npm run dev
```

### Running Python Services Locally

```bash
# Activate Python virtual environment
cd backend/python-services/schads-engine
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Run service
python main.py
```

## Production Deployment

### Security Checklist

- [ ] Change default admin passwords
- [ ] Enable SSL/TLS (use reverse proxy like Nginx)
- [ ] Set up firewall rules
- [ ] Configure automated backups
- [ ] Enable monitoring and logging
- [ ] Set up CI/CD pipeline

### Environment Variables

Create `.env` file in project root:

```env
# Database
POCKETBASE_URL=http://localhost:8090

# Frontend
NEXT_PUBLIC_POCKETBASE_URL=https://your-domain.com
NEXT_PUBLIC_API_URL=https://api.your-domain.com

# Python Services
PYTHONUNBUFFERED=1
LOG_LEVEL=info
```

### Backup and Restore

```bash
# Backup PocketBase data
docker-compose exec pocketbase tar czf /tmp/pb_backup.tar.gz /pb_data
docker cp ndis-pocketbase:/tmp/pb_backup.tar.gz ./backups/

# Restore PocketBase data
docker cp ./backups/pb_backup.tar.gz ndis-pocketbase:/tmp/
docker-compose exec pocketbase tar xzf /tmp/pb_backup.tar.gz -C /
```

## Monitoring

### Health Checks

```bash
# PocketBase
curl http://localhost:8090/api/health

# SCHADS Engine
curl http://localhost:8001/health

# Matching Engine
curl http://localhost:8002/health

# Frontend
curl http://localhost:3000
```

### Resource Usage

```bash
# Docker stats
docker stats

# Disk usage
docker system df
```

## API Documentation

### PocketBase API
- **REST API:** http://localhost:8090/api/
- **Admin UI:** http://localhost:8090/_/
- **Docs:** https://pocketbase.io/docs/

### SCHADS Engine API
- **Endpoint:** http://localhost:8001/docs (if Swagger enabled)
- **Base Path:** http://localhost:8001/api/v1

### Matching Engine API
- **Endpoint:** http://localhost:8002/docs (if Swagger enabled)
- **Base Path:** http://localhost:8002/api/v1

## Support

For issues and questions:
1. Check troubleshooting section above
2. Review Docker logs: `docker-compose logs`
3. Check service health endpoints
4. Consult individual service documentation

---

**Last Updated:** 2026-01-02
**Version:** 1.0.0
