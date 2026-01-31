# Chrysalis Production Deployment Guide

Target Environment: **Ubuntu 22.04 LTS (AWS EC2)**
Host: `https://test.chrysalis.world`

---

## 1. Initial Server Setup
Connect to your instance and update:
```bash
sudo apt update && sudo apt upgrade -y
```

## 2. Install Node.js (v20+)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. Install MySQL (Skip if using AWS RDS)
```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
# Create Database
sudo mysql -u root -p
# Inside MySQL:
# CREATE DATABASE chrysalis_db;
# CREATE USER 'george'@'localhost' IDENTIFIED BY 'Reset@123';
# GRANT ALL PRIVILEGES ON chrysalis_db.* TO 'george'@'localhost';
# FLUSH PRIVILEGES;
# EXIT;
```

## 4. Application Setup
Clone the repository:
```bash
git clone <your-repo-url> /var/www/chrysalis
cd /var/www/chrysalis
```

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# EDIT .env with your MySQL/RDS credentials
# DB_HOST=localhost (or RDS endpoint)
# DB_USER=chrysalis_user
# ...
npm run build
```

### Frontend Setup
```bash
cd ../frontend
npm install
cp .env.example .env
# Ensure REACT_APP_API_URL=https://test.chrysalis.world/api
npm run build
```

## 5. PM2 (Process Manager) Setup
Keep the backend running forever:
```bash
sudo npm install -g pm2
cd ../backend
pm2 start dist/server.js --name "chrysalis-api"
pm2 save
pm2 startup
```

## 6. Nginx & SSL Setup
```bash
sudo apt install nginx -y
```

Create config: `sudo nano /etc/nginx/sites-available/chrysalis`
```nginx
server {
    listen 80;
    server_name test.chrysalis.world;

    # Frontend
    location / {
        root /var/www/chrysalis/frontend/build;
        index index.html;
        try_files $uri /index.html;
    }

    # Backend Proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/chrysalis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL with Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d test.chrysalis.world
```

## 7. Migration from EC2 MySQL to AWS RDS
1. Create RDS Instance.
2. Update `backend/.env` `DB_HOST` to the RDS Endpoint.
3. Update `DB_USER` and `DB_PASSWORD`.
4. Restart the API: `pm2 restart chrysalis-api`.
**No code changes required.**

---
## 8. Logs & Debugging
- Backend Logs: `pm2 logs chrysalis-api`
- Nginx Logs: `sudo tail -f /var/log/nginx/error.log`