# 💻 Local Development Guide

To run Chrysalis on your local machine with a full MySQL backend:

### 1. Prerequisites
- **Node.js**: v18 or higher.
- **XAMPP/WAMP**: For MySQL and phpMyAdmin.

### 2. Database Setup
1. Start **MySQL** from your XAMPP Control Panel.
2. Open [phpMyAdmin](http://localhost/phpmyadmin).
3. Create a new database named `chrysalis_db`.
4. Import the `init.sql` file provided in the root directory.

### 3. Application Setup
1. Open your terminal in the project root.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root (optional if using defaults):
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=chrysalis_db
   ```

### 4. Launching the App
You need two terminal tabs:

**Tab 1 (Backend):**
```bash
npm run server
```
*This starts the Express API on port 3000.*

**Tab 2 (Frontend):**
```bash
npm run dev
```
*This starts the Vite dev server on port 5173.*

### 🛠 Troubleshooting
**Issue: I only see the footer / 404 error on apiService.ts**
- This usually happens if the Vite server hasn't finished processing the TypeScript files. 
- **Fix**: Refresh the page at `http://localhost:5173`. If the error persists, ensure you ran `npm install` and that no other process is blocking port 5173.
- **Check**: Open the browser console (F12). If you see "Failed to fetch /api/status", it means the backend (Tab 1) isn't running, and the app will automatically switch to **Mock Mode**.
