// Centralized configuration for API endpoints
// In development, this defaults to the local backend running on port 5001
// In production, this will use the REACT_APP_API_URL environment variable

export const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5001/api`;
