import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(async (config) => {
  // We need to dynamically import the store or access it carefully to avoid circular deps
  // Or simply access localStorage/cookies if supabase persists there, 
  // but using the store's getToken method is safer if available globally or passed.
  
  // Direct access to supabase client is often easier:
  const { supabase } = await import('../supabase');
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    // console.log("Attaching Auth Token to request"); // Debug logging
    config.headers.Authorization = `Bearer ${session.access_token}`;
  } else {
    console.warn("No Auth Token found in session!");
  }
  
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
        // Handle unauth (redirect to login?)
        window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
