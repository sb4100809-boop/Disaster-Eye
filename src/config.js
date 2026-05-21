// Centralized configuration for API endpoints
// In development, this defaults to the local backend running on port 5001
// In production, this will use the REACT_APP_API_URL environment variable

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE = process.env.REACT_APP_API_URL || (isLocalhost ? `http://${window.location.hostname}:5001/api` : '/api');
