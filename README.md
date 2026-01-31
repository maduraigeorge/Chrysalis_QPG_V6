# AIStudio – Question Paper Generator

A robust Micro-SaaS for educators to generate curriculum-aligned question papers and banks.

## Quick Start (Vercel + MySQL)

1. **Deploy to Vercel**: Push this code to your GitHub and connect to Vercel.
2. **Environment Variables**: Add your `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `DB_PORT` (3306) to Vercel Settings.
3. **Run Initialization**: 
   - Open your app.
   - Click the **Gear Icon** (bottom right).
   - Login (**Admin** / **Reset@123**).
   - Go to **System Setup** > **Initialize & Seed Database**.

## Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js (Vercel Serverless Functions)
- **Database:** MySQL (Hosted on FreeSQLDatabase or similar)

## Features
- **Curriculum Selection:** Filter by Subject, Grade, Lessons, and Learning Outcomes.
- **Grouped Question Listing:** Questions grouped by Type and Marks.
- **Question Bank Mode:** Create simple lists of selected questions with JSON/Print export.
- **Question Paper Mode:** Define exam metadata and create sections with strict marks-based constraints.
- **A4 Print Layout:** High-contrast, print-ready output for physical exams.