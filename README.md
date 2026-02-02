# Chrysalis – Professional Question Paper & Bank Designer

Chrysalis is a high-performance Education SaaS platform designed for teachers to create curriculum-aligned assessment materials. It supports complex structural constraints, weighted marks distribution, and multi-format exports (PDF, Word, RTF, CSV).

---

## 📂 Project Structure

This project is structured to support both **Vercel (Serverless)** for quick iteration and **AWS EC2 (Monolithic)** for persistent high-traffic production.

```text
.
├── api/                        # Vercel Serverless Functions (Backend API)
│   ├── db.ts                   # Database connection pool (Vercel)
│   ├── init-db.ts              # Schema verification endpoint
│   ├── learning-outcomes.ts    # LO management routes
│   ├── lessons.ts              # Lesson management routes
│   ├── questions.ts            # Question retrieval & storage
│   └── status.ts               # API Health & Environment check
├── backend/                    # Standalone Express Server (For EC2 Deployment)
│   ├── src/
│   │   ├── db.ts               # Database configuration
│   │   ├── server.ts           # Main Express entry point
│   │   └── declarations.d.ts   # TS Type definitions
│   ├── .env.example            # Backend env template
│   ├── package.json            # Backend-specific dependencies
│   └── tsconfig.json           # Backend TS configuration
├── components/                 # Core React UI Components (Shared)
│   ├── AdminPanel.tsx          # Curriculum & Question Management
│   ├── PaperPreview.tsx        # Print-ready layout engine
│   ├── QuestionListing.tsx     # Filterable bank interface
│   ├── QuestionPaperCreator.tsx# Structure & Weight Designer
│   └── SelectionPanel.tsx      # Topic/Curriculum selector
├── frontend/                   # Standalone Frontend Build (For EC2 Nginx)
│   ├── src/
│   │   ├── components/         # Localized design components
│   │   ├── apiService.ts       # Prod-ready API client
│   │   └── types.ts            # Localized types
│   ├── .env.example            # Frontend env template (API URL)
│   └── vite.config.ts          # Frontend build pipeline
├── utils/                      # Export & Logic Utilities
│   ├── DocxExporter.ts         # Microsoft Word generation
│   ├── PdfExporter.ts          # Professional PDF generation
│   └── RtfExporter.ts          # Rich Text Format generation
├── App.tsx                     # Integrated App entry point
├── apiService.ts               # Integrated API client (with Mock logic)
├── constants.ts                # Curriculum constants (Subjects, Grades)
├── index.html                  # Main DOM entry
├── index.tsx                   # React mount point
├── init.sql                    # MySQL Schema definition
├── types.ts                    # Shared TypeScript interfaces
├── vercel.json                 # Vercel routing configuration
└── vite.config.ts              # Integrated development config
```

---

## 🚀 EC2 Deployment Roadmap (Ubuntu 22.04)

### 1. Database Layer
Install MySQL and run the initialization script:
```bash
sudo apt update && sudo apt install mysql-server -y
sudo mysql -u root
# Inside MySQL:
CREATE DATABASE chrysalis_db;
CREATE USER 'chrysalis_user'@'localhost' IDENTIFIED BY 'Reset@123';
GRANT ALL PRIVILEGES ON chrysalis_db.* TO 'chrysalis_user'@'localhost';
FLUSH PRIVILEGES;
USE chrysalis_db;
SOURCE /var/www/chrysalis/init.sql;
```

### 2. Backend API Layer
Configure the dedicated Express server in the `backend/` folder:
```bash
cd /var/www/chrysalis/backend
npm install
cp .env.example .env
# Update .env with your DB credentials
npm run build
sudo npm install -g pm2
pm2 start dist/server.js --name "chrysalis-api"
```

### 3. Frontend Web Layer
Build the optimized static assets in the `frontend/` folder:
```bash
cd /var/www/chrysalis/frontend
npm install
cp .env.example .env
# Set REACT_APP_API_URL=https://test.chrysalis.world/api
npm run build
```

### 4. Nginx Reverse Proxy
Route traffic to the appropriate layers:
```nginx
server {
    listen 80;
    server_name test.chrysalis.world;

    # Serve Built Frontend
    location / {
        root /var/www/chrysalis/frontend/build;
        index index.html;
        try_files $uri /index.html;
    }

    # Proxy API requests to Express (Port 3000)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

---

## 🛠 Features & Capabilities
- **Curriculum Filtering**: Dynamic search by Subject, Grade, Lesson, and Learning Outcome.
- **Weight Audit**: Real-time progress bar ensures questions match the exam's total marks.
- **Auto-Grading Export**: Generates a JSON signature for integration with OMR/Digital grading systems.
- **Multi-Format Export**: One-click generation of PDF, Word, RTF, and CSV.

Developed by **maduraigeorge@gmail.com**