# Railway Deployment Guide

This guide will help you deploy the Pet Hub Payroll System to Railway.

## Prerequisites

- GitHub repository connected to Railway
- Railway account with PostgreSQL database provisioned

## Deployment Steps

### 1. Backend Service Setup

1. **Create a new service** in Railway
2. **Connect your GitHub repository**
3. **Set Root Directory** to `backend`
4. **Add PostgreSQL Database** (Railway will auto-provide `DATABASE_URL`)

#### Environment Variables for Backend:

```
DATABASE_URL=<auto-provided by Railway PostgreSQL>
JWT_SECRET=<generate a strong random string>
NODE_ENV=production
PORT=<auto-set by Railway>
CORS_ORIGINS=<your-frontend-railway-url>
```

**To generate JWT_SECRET:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

#### Build & Deploy Settings:

- **Build Command:** `npm install && npm run build && npx prisma generate`
- **Start Command:** `npm start`

### 2. Frontend Service Setup

1. **Create a new service** in Railway
2. **Connect the same GitHub repository**
3. **Set Root Directory** to `frontend`

#### Environment Variables for Frontend:

```
VITE_API_URL=<your-backend-railway-url>/api
PORT=<auto-set by Railway>
```

#### Build & Deploy Settings:

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start` (or `npx vite preview --port $PORT --host`)

### 3. Database Setup

After the backend service is deployed:

1. **Run migrations:**
   - In Railway, go to your backend service
   - Open the "Deploy Logs" or use the Railway CLI:
   ```bash
   railway run --service backend npm run db:migrate:deploy
   ```

2. **Seed initial data (optional):**
   ```bash
   railway run --service backend npm run db:seed
   ```

### 4. Post-Deployment Checklist

- [ ] Backend service is running and healthy
- [ ] Frontend service is running
- [ ] Database migrations completed
- [ ] CORS_ORIGINS includes your frontend URL
- [ ] VITE_API_URL points to your backend URL
- [ ] Test login with admin credentials
- [ ] Verify API endpoints are accessible

### 5. Health Check

Visit your backend URL:
- `https://your-backend.railway.app/api/health`

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected",
  "environment": "production"
}
```

## Troubleshooting

### Backend won't start
- Check that `DATABASE_URL` is set correctly
- Verify `JWT_SECRET` is set
- Check build logs for TypeScript errors

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set correctly
- Check CORS_ORIGINS includes frontend URL
- Ensure backend service is running

### Database connection errors
- Verify `DATABASE_URL` is correct
- Check PostgreSQL service is running
- Run `npx prisma generate` if Prisma client is outdated

## Environment Variables Reference

### Backend Required Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Set to `production`
- `CORS_ORIGINS` - Comma-separated allowed origins

### Frontend Required Variables:
- `VITE_API_URL` - Backend API URL (must start with `VITE_` for Vite)

## Notes

- Railway automatically sets `PORT` environment variable
- Use Railway's PostgreSQL service for automatic `DATABASE_URL`
- Update `CORS_ORIGINS` whenever you change frontend URL
- Keep `JWT_SECRET` secure and never commit it to Git
