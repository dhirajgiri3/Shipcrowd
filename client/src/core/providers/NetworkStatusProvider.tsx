'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Wifi, WifiOff } from 'lucide-react';

interface NetworkStatusContextType {
    isOnline: boolean;
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({ isOnline: true });

export const useNetworkStatus = () => useContext(NetworkStatusContext);

export const NetworkStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Initial check
        if (typeof window !== 'undefined') {
            setIsOnline(navigator.onLine);
        }

        const handleOnline = () => {
            setIsOnline(true);
            toast.success('You are back online!', {
                icon: <Wifi className="w-4 h-4" />,
                duration: 3000,
            });
        };

        const handleOffline = () => {
            setIsOnline(false);
            toast.error('You are offline. Some features may be unavailable.', {
                icon: <WifiOff className="w-4 h-4" />,
                duration: Infinity, // Keep until back online or dismissed
                id: 'offline-toast', // Use ID to programmatically dismiss if needed
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <NetworkStatusContext.Provider value={{ isOnline }}>
            {children}
        </NetworkStatusContext.Provider>
    );
};
