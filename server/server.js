import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import vividRoutes from './routes/v.js';
import favouriteRoutes from './routes/ff.js';

dotenv.config();

const app = express();

// Required for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  PORT = 4000,
  MONGODB_URI,
  MONGODB_DB = 'vividseats',
  ALLOWED_ORIGINS
} = process.env;

// Allowed Origins
const allowedOrigins = ALLOWED_ORIGINS
  ? ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  })
);

app.use(express.json());
app.use(morgan('dev'));

// MongoDB connection
if (MONGODB_URI) {
  mongoose
    .connect(MONGODB_URI, { dbName: MONGODB_DB })
    .then(() => console.log('[backend] MongoDB connected'))
    .catch((err) => console.error('MongoDB error:', err));
}

// API Routes
app.use('/api', vividRoutes);
app.use('/api/favourites', favouriteRoutes);

// ---------- Serve Frontend (Vite build) ----------
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback — for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`[backend] Server running on port ${PORT}`);
});
