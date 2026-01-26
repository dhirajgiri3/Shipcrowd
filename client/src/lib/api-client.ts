import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Add request interceptor
apiClient.interceptors.request.use(
    (config) => {
        // You might want to add auth token here if stored in localStorage
        // const token = localStorage.getItem('accessToken');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle specific error cases (e.g., 401 Unauthorized)
        if (error.response && error.response.status === 401) {
            // Redirect to login or refresh token
            if (typeof window !== 'undefined') {
                // window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
