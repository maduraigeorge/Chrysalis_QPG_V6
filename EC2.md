# 🚀 Professional EC2 Deployment Guide (Ubuntu 22.04)

This guide ensures Chrysalis runs 100% reliably on AWS EC2 (t2.micro / t3.small).

---

## 1. Prerequisites (Setup Once)
Install Node.js 20, MySQL, and Nginx:
```bash
sudo apt update
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs mysql-server nginx
```

## 2. Database Initialization
```bash
sudo mysql -u root
# Inside MySQL prompt:
CREATE DATABASE chrysalis_db;
CREATE USER 'chrysalis_user'@'localhost' IDENTIFIED BY 'Reset@123';
GRANT ALL PRIVILEGES ON chrysalis_db.* TO 'chrysalis_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import the schema
sudo mysql -u chrysalis_user -p chrysalis_db < /var/www/chrysalis/init.sql

# FLOOD WITH SAMPLE DATA (Math Grade 1)
sudo mysql -u chrysalis_user -p chrysalis_db < /var/www/chrysalis/seed_data.sql
```

## 3. Choose Your Deployment Path

### Path A: The "Pro" Way (Local Build - Zero Crash Risk)
*Use this if you want to avoid EC2 memory issues entirely.*

1. **On your local computer** (VS Code terminal):
   ```bash
   npm run build
   ```
2. **Upload the `dist` folder** to your EC2 instance using SCP or FileZilla:
   ```bash
   # Example SCP command
   scp -r ./dist ubuntu@YOUR_EC2_IP:/var/www/chrysalis/
   ```

### Path B: The "Server-Side" Way (Swap Rescue)
*Use this if you must run `npm install` directly on the EC2.*

1. **Enable Swap File** (Crucial: prevents crash during npm install):
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
2. **Install & Build on Server**:
   ```bash
   cd /var/www/chrysalis
   npm install
   npm run build
   ```

---

## 4. Run Backend with PM2
Keep the API running even after you logout. 
**Note:** Ensure your `.env` file exists in `/var/www/chrysalis/` before starting.
```bash
sudo npm install -g pm2
pm2 start server.js --name "chrysalis-api"
pm2 save
pm2 startup
```

## 5. Configure Nginx
Route web traffic to your app:

1. Create config: `sudo nano /etc/nginx/sites-available/chrysalis`
2. Paste the following:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_EC2_IP;

    # Serve Static Frontend Files
    location / {
        root /var/www/chrysalis/dist;
        index index.html;
        try_files $uri /index.html;
    }

    # Proxy API requests to Node.js (Express)
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
3. Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/chrysalis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. 🔄 How to Apply Updates (Maintenance)
Whenever you make changes to the code and want them live on EC2, follow these steps:

### Step 1: Get the latest code
If using Git:
```bash
cd /var/www/chrysalis
git pull origin main
```
If using Path A (SCP), simply re-upload your local `dist` folder to `/var/www/chrysalis/dist`.

### Step 2: Refresh Dependencies (If changed)
```bash
npm install
```

### Step 3: Rebuild the Frontend
This updates the UI (all the `.tsx` changes).
```bash
npm run build
```

### Step 4: Restart the Backend
This updates the server logic (all the `server.js` changes).
```bash
pm2 restart chrysalis-api
```

### Step 5: Verify
Check the logs to ensure everything started correctly:
```bash
pm2 logs chrysalis-api
```

---
**Chrysalis is now live at your EC2 IP.**
Developed by maduraigeorge@gmail.com