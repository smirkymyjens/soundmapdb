export const clientId = '5959442ab3a74956af8c4351d3cc87e5';
export const clientSecret = '18ae616fdb5c4784991ad2c4608ad392';

// Use environment-aware API URLs
const isProduction = process.env.NODE_ENV === 'production';

// In production (Vercel), use relative paths; in development, use localhost
export const API_URL = isProduction ? '/api' : 'http://localhost:5000';
export const BACKEND_API_URL = isProduction ? '/api' : 'http://localhost:5000';