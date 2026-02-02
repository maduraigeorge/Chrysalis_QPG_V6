# ☁️ Vercel Deployment

Deploying Chrysalis to Vercel allows for serverless scaling.

### 1. Push to GitHub
Initialize a git repo and push your code to a GitHub repository.

### 2. Connect to Vercel
1. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** > **Project**.
3. Import your GitHub repository.

### 3. Configure Environment Variables
In the Vercel project settings, add the following (required for the Question Bank to save permanently):
- `DB_HOST`: Your remote MySQL host (e.g., PlanetScale, RDS, or a VPS).
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

### 4. Deployment
Vercel will automatically detect the `/api` folder and deploy them as Serverless Functions. The frontend will be served as a high-performance static site.

*Note: If you don't provide database credentials, the Vercel deployment will still work but will default to **Mock Mode** using the browser's LocalStorage.*
