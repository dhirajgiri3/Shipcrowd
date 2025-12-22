export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    SIGNUP: '/signup',
    DASHBOARD: '/dashboard',
    SHIPMENTS: '/dashboard/shipments',
    ORDERS: '/dashboard/orders',
    SETTINGS: '/dashboard/settings',
    PROFILE: '/dashboard/profile',
} as const;

export const API_ROUTES = {
    AUTH: {
        LOGIN: '/api/auth/login',
        SIGNUP: '/api/auth/signup',
        LOGOUT: '/api/auth/logout',
        REFRESH: '/api/auth/refresh',
    },
    SHIPMENTS: {
        LIST: '/api/shipments',
        CREATE: '/api/shipments',
        DETAIL: (id: string) => `/api/shipments/${id}`,
        TRACK: (id: string) => `/api/shipments/${id}/track`,
    },
    ORDERS: {
        LIST: '/api/orders',
        CREATE: '/api/orders',
        DETAIL: (id: string) => `/api/orders/${id}`,
    },
} as const;
