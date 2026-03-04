# SonicForge

Production-ready digital music marketplace with Next.js (App Router) + Django REST Framework.

## Architecture (Clean + Modular)
- `backend/apps/*`: domain-driven app modules (`users`, `beats`, `cart`, `orders`, `payments`, `core`).
- `payments/gateways.py`: payment provider abstraction; Stripe active, M-Pesa Daraja extension point stubbed.
- `core/storage.py`: storage provider abstraction (`LocalStorageProvider`, `S3StorageProvider` placeholder).
- JWT auth via `simplejwt`; role-based permissions for producer/admin/customer.
- Secure purchase downloads via signed, expiring token (`core/tokens.py`) + protected file endpoint.

## Folder Structure
```text
SonicForgeAudio/
  backend/
    apps/
      core/
      users/
      beats/
      cart/
      orders/
      payments/
    config/
      settings.py
      urls.py
    manage.py
    requirements.txt
    .env.example
  frontend/
    src/
      app/
        login/
        register/
        marketplace/
        beats/[id]/
        producer/
        cart/
        orders/
        admin/
      components/
      lib/
    package.json
    .env.local.example
  README.md
```

## Backend Setup (Local)
1. Install PostgreSQL and create DB:
```bash
sudo -u postgres psql -c "CREATE DATABASE sonicforge_db;"
```
2. Backend env and dependencies:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```
3. Migrate and run:
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8000
```

## Frontend Setup (Local)
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

## Stripe Webhook (Local)
```bash
stripe listen --forward-to localhost:8000/api/payments/stripe/webhook/
```

## Core API Examples
### Register
```bash
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","email":"demo@mail.com","password":"Pass12345","role":"customer"}'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"Pass12345"}'
```

### Search / Filter Beats
```bash
curl "http://localhost:8000/api/beats/?genre=Afrobeat&min_bpm=90&max_bpm=120&min_price=20&search=club"
```

### Create Payment Intent
```bash
curl -X POST http://localhost:8000/api/payments/intent/ \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"provider":"stripe","currency":"usd"}'
```

## Admin Management API
Base path: `/api/admin/` (JWT + role `admin` required for all endpoints).

### Dashboard Overview
```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:8000/api/admin/dashboard/
```

### Users: Search / Suspend / Promote Producer
```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  "http://localhost:8000/api/admin/users/?search=john"

curl -X PATCH -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"is_suspended": true}' \
  http://localhost:8000/api/admin/users/12/suspend/

curl -X PATCH -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}' \
  http://localhost:8000/api/admin/users/12/promote-producer/
```

### Beats: Approve / Reject / Feature
```bash
curl -X PATCH -H "Authorization: Bearer <ACCESS_TOKEN>" -H "Content-Type: application/json" \
  -d '{}' \
  http://localhost:8000/api/admin/beats/5/approve/

curl -X PATCH -H "Authorization: Bearer <ACCESS_TOKEN>" -H "Content-Type: application/json" \
  -d '{"rejection_reason":"Low quality mix"}' \
  http://localhost:8000/api/admin/beats/5/reject/

curl -X PATCH -H "Authorization: Bearer <ACCESS_TOKEN>" -H "Content-Type: application/json" \
  -d '{"is_featured":true}' \
  http://localhost:8000/api/admin/beats/5/featured/
```

### Categories: Reorder
```bash
curl -X PATCH -H "Authorization: Bearer <ACCESS_TOKEN>" -H "Content-Type: application/json" \
  -d '{"category_ids":[3,1,2]}' \
  http://localhost:8000/api/admin/categories/reorder/
```

### Orders: Update Status
```bash
curl -X PATCH -H "Authorization: Bearer <ACCESS_TOKEN>" -H "Content-Type: application/json" \
  -d '{"status":"shipped","payment_status":"paid"}' \
  http://localhost:8000/api/admin/orders/44/status/
```

### Reports + CSV Export
```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:8000/api/admin/reports/

curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  http://localhost:8000/api/admin/reports/export/orders/ -o orders.csv
```

## Admin Frontend Routes
- `/admin/dashboard`
- `/admin/users`
- `/admin/beats`
- `/admin/categories`
- `/admin/orders`
- `/admin/reports`

## Architecture Decisions
- `apps/adminpanel`: isolated admin bounded-context (viewsets + analytics + export + audit logs) to keep domain apps clean.
- RBAC: every admin endpoint enforces `IsAdmin` and JWT auth.
- Audit trail: all mutating admin actions write to `AdminAuditLog` with actor, target, payload, and IP.
- Non-breaking domain evolution: existing catalog/order flows are reused while admin orchestration is centralized in one module.
- Frontend proxy pattern (`/api/proxy/*`): avoids browser CORS instability and keeps auth headers consistent.

## Production Deployment (No Docker)
### Backend
1. Ubuntu VM + Python 3.12 + PostgreSQL + Nginx + Gunicorn.
2. Set `DJANGO_DEBUG=False`, strong `DJANGO_SECRET_KEY`, real `DJANGO_ALLOWED_HOSTS`.
3. Install dependencies in virtualenv and run migrations.
4. Serve via Gunicorn systemd service:
```bash
gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 4
```
5. Nginx reverse proxy to Gunicorn; serve `/media` and collected static files.
6. Configure Stripe webhook endpoint in Stripe Dashboard to your production URL.

### Frontend
1. Build Next.js app:
```bash
cd frontend
npm ci
npm run build
npm run start
```
2. Run behind Nginx or process manager (`pm2` or systemd).
3. Set `NEXT_PUBLIC_API_BASE_URL` to production backend API host.

## Security Highlights
- JWT auth with refresh rotation.
- Role-based access control for producer/admin actions.
- Upload file extension validation for audio/image files.
- DRF rate limits for auth/general/payment/download endpoints.
- Secure file downloads only for paid users with expiring signed token.
