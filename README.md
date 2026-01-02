# NDIS Application Development Stack

## Project Overview
Cloud-based management platform for NDIS service providers, featuring intelligent automation and "air traffic control" style risk monitoring.

## Architecture

### Technology Stack
| Component | Technology |
|-----------|-----------|
| **Backend & Database** | PocketBase (Go + SQLite) |
| **SCHADS Engine** | Python FastAPI |
| **Matching Engine** | Python FastAPI |
| **Admin Portal** | Next.js 14 (React + TypeScript) |
| **Worker App** | React Native (Phase 4) |
| **Notifications** | Firebase (Push) + Polling |
| **Deployment** | Docker Compose |

### Project Structure
```
application_development_stack/
├── backend/
│   ├── pocketbase/           # Core backend (Go + SQLite)
│   │   ├── pb_migrations/     # Database schema
│   │   ├── pb_hooks/          # Custom Go hooks
│   │   ├── pb_data/           # Data directory
│   │   └── docker-compose.yml  # Container orchestration
│   └── python-services/
│       ├── schads-engine/      # SCHADS Award calculations
│       │   ├── main.py
│       │   ├── Dockerfile
│       │   └── requirements.txt
│       └── matching-engine/    # Smart worker matching
│           ├── main.py
│           ├── Dockerfile
│           └── requirements.txt
├── frontend-admin/           # Admin web portal
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # PocketBase client
│   │   └── types/            # TypeScript types
│   └── package.json
├── mobile-app/              # Worker mobile app (Phase 4)
└── docs/                   # Documentation
```

## Phase 1 Status: Foundation Setup ✅

### Completed
- ✅ Project directory structure
- ✅ Python microservices (SCHADS Engine, Matching Engine)
- ✅ Docker configuration for backend services
- ✅ PocketBase database schema
- ✅ Next.js admin portal initialization
- ✅ TypeScript type definitions
- ✅ Jira project management (8 stories created)

### In Progress
- 🔄 Next.js admin portal pages
- 🔄 Integration of services

### Pending
- ⏳ PocketBase hooks implementation
- ⏳ Admin UI pages (Rostering, Workers, Participants)
- ⏳ Service integration testing

## Jira Stories Created
| Issue Key | Summary |
|-----------|---------|
| DEV-8 | Set up PocketBase backend and database schema |
| DEV-9 | Implement SCHADS Award Engine microservice |
| DEV-10 | Implement Smart Matching Algorithm microservice |
| DEV-11 | Implement Budget Defense System |
| DEV-12 | Implement Compliance Override System |
| DEV-13 | Build Admin Portal - Rostering UI |
| DEV-14 | Build Admin Portal - Worker and Participant Management |
| DEV-15 | Integrate services and implement cascading shift notifications |

## Key Features Implemented

### SCHADS Award Engine (`/backend/python-services/schads-engine/`)
- Ordinary hours vs overtime calculation
- Shift penalties (evening, weekend, public holiday)
- Minimum break compliance checking
- Cost estimation per shift
- REST API endpoints

### Smart Matching Engine (`/backend/python-services/matching-engine/`)
- Weighted scoring algorithm:
  - Certification match (40%)
  - Training completion (20%)
  - Experience score (20%)
  - Distance proximity (10%)
  - Cost efficiency (10%)
- Worker ranking and eligibility filtering
- Compliance warnings generation

### Database Schema (`/backend/pocketbase/pb_migrations/`)
Collections:
- `workers` - Worker profiles with certifications & training
- `participants` - Participant profiles with funding
- `shifts` - Shift scheduling and status
- `certifications` - Certification reference data
- `trainings` - Training reference data
- `businesses` - Multi-tenant business management
- `compliance_overrides` - Configurable rule overrides
- `audit_logs` - Immutable audit trail

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+
- Python 3.11+

### Backend Setup
```bash
cd backend/pocketbase
docker-compose up -d
```

Services will be available at:
- PocketBase: http://localhost:8090
- SCHADS Engine: http://localhost:8001
- Matching Engine: http://localhost:8002

### Frontend Setup
```bash
cd frontend-admin
npm install
npm run dev
```
Admin portal will be available at: http://localhost:3000

### Health Checks
```bash
# SCHADS Engine
curl http://localhost:8001/health

# Matching Engine
curl http://localhost:8002/health

# PocketBase
curl http://localhost:8090/api/health
```

## API Endpoints

### SCHADS Engine
- `POST /calculate` - Calculate SCHADS costs for a shift
- `GET /health` - Health check

### Matching Engine
- `POST /match` - Match and rank workers for a shift
- `GET /health` - Health check

## Configuration

### Environment Variables (Frontend)
Create `.env.local` in `frontend-admin/`:
```
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
NEXT_PUBLIC_SCHADS_ENGINE_URL=http://localhost:8001
NEXT_PUBLIC_MATCHING_ENGINE_URL=http://localhost:8002
```

## Next Steps

1. **Complete PocketBase Setup**
   - Initialize PocketBase instance
   - Import database schema
   - Set up authentication

2. **Build Admin Portal Pages**
   - Dashboard
   - Rostering UI
   - Worker Management
   - Participant Management

3. **Integrate Services**
   - Connect frontend to PocketBase
   - Implement SCHADS API calls
   - Implement matching API calls

4. **Testing**
   - Unit tests for services
   - Integration tests
   - E2E testing

## Compliance & Standards

- **NDIS Practice Standards** - Aligned with Australian requirements
- **SCHADS Award** - MA000019 compliance
- **ISO 27001** - Security controls implementation
- **Australian Privacy Act** - Data protection compliance

## License
Proprietary - NDIS Application Development Stack
