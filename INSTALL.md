# Employee Attendance System Installation Guide

## Prerequisites
- Node.js v14+ (https://nodejs.org)
- SQLite3 (usually comes with OS)

## Installation Steps

1. **Download the project**:
```bash
git clone https://github.com/your-repo/employee-attendance-system.git
cd employee-attendance-system
```

2. **Install dependencies**:
```bash
npm install
```

3. **Configure environment**:
```bash
cp .env.example .env
# Edit .env to set:
# JWT_SECRET=your_strong_secret_here
# PORT=8000 (or your preferred port)
```

4. **Initialize database**:
```bash
node server.js
# This will create database.sqlite and a test employee
```

5. **Run the application**:
```bash
./start.sh
# Or manually: node server.js
```

6. **Access the system**:
- Open browser to: http://localhost:8000/public/index.html
- Use test credentials: 
  - Employee ID: EMP001
  - Password: password123

## Production Deployment

1. **Install PM2 process manager**:
```bash
npm install -g pm2
```

2. **Start application in production**:
```bash
pm2 start server.js
pm2 save
pm2 startup
```

3. **Configure Nginx (optional)**:
```bash
# Sample Nginx config at /etc/nginx/sites-available/attendance
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Troubleshooting

- **Port in use**: `kill $(lsof -t -i:8000)`
- **Database issues**: Delete database.sqlite and restart
- **Login problems**: Check .env JWT_SECRET matches