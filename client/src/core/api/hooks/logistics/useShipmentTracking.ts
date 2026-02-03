
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { shipmentApi, NormalizedTrackingData } from '@/src/core/api/clients/shipping/shipmentApi';
import { useLoader } from '@/src/hooks';
import confetti from 'canvas-confetti';

export interface RecentSearch {
    number: string;
    timestamp: number;
    status?: string;
}

// Mock data helper
const getMockShipmentByKeyword = (keyword: string): NormalizedTrackingData | null => {
    const mockData = {
        DEMO: {
            trackingNumber: 'SHP-2025-0001',
            carrier: 'BlueDart Express',
            serviceType: 'Express Air',
            currentStatus: 'OUT_FOR_DELIVERY',
            estimatedDelivery: new Date(Date.now() + 3600000 * 6).toISOString(), // 6 hours from now
            createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
            recipient: { name: 'Rahul Giri', city: 'Mumbai', state: 'Maharashtra' },
            timeline: [
                { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), location: 'Andheri West, Mumbai', description: 'Package is out for delivery.' },
                { status: 'ARRIVED_AT_DESTINATION', timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), location: 'Mumbai Central Hub', description: 'Arrived at destination facility.' },
                { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000).toISOString(), location: 'Pune Distribution Center', description: 'Package in transit.' },
                { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), location: 'Koramangala, Bengaluru', description: 'Picked up from seller.' },
                { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), location: 'Bengaluru', description: 'Order created.' },
            ],
        },
        DELIVERED: {
            trackingNumber: 'SHP-2025-0002',
            carrier: 'Delhivery',
            serviceType: 'Standard Delivery',
            currentStatus: 'DELIVERED',
            estimatedDelivery: new Date(Date.now() - 86400000).toISOString(),
            actualDelivery: new Date(Date.now() - 3600000 * 10).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            recipient: { name: 'Ananya Singh', city: 'Delhi', state: 'Delhi' },
            timeline: [
                { status: 'DELIVERED', timestamp: new Date(Date.now() - 3600000 * 10).toISOString(), location: 'Connaught Place, Delhi', description: 'Delivered successfully.' },
                { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 3600000 * 14).toISOString(), location: 'Karol Bagh Hub, Delhi', description: 'Out for delivery.' },
                { status: 'ARRIVED_AT_DESTINATION', timestamp: new Date(Date.now() - 86400000).toISOString(), location: 'Delhi Regional Hub', description: 'Arrived at hub.' },
                { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), location: 'Jaipur Transit Hub', description: 'In transit.' },
                { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), location: 'Andheri, Mumbai', description: 'Picked up.' },
                { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), location: 'Mumbai', description: 'Order created.' },
            ],
        },
        TRANSIT: {
            trackingNumber: 'SHP-2025-0003',
            carrier: 'DTDC Express',
            serviceType: 'Economy Shipping',
            currentStatus: 'IN_TRANSIT',
            estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString(),
            createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
            recipient: { name: 'Vihaan Sharma', city: 'Hyderabad', state: 'Telangana' },
            timeline: [
                { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000).toISOString(), location: 'Vijayawada Junction', description: 'Package in transit.' },
                { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), location: 'Nellore Distribution', description: 'Processed at center.' },
                { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), location: 'Velachery, Chennai', description: 'Package collected.' },
                { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), location: 'Chennai', description: 'Order created.' },
            ],
        },
    };

    const key = keyword.toUpperCase();
    return (mockData as any)[key] || null;
};

export function useShipmentTracking() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const [trackingNumber, setTrackingNumber] = useState('');
    const [shipment, setShipment] = useState<NormalizedTrackingData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
    const [autoTrackNumber, setAutoTrackNumber] = useState<string | null>(null);

    // Use smart loader with flash prevention
    const { isLoading, showLoader, startLoading, stopLoading } = useLoader({
        minDelay: 300,
        minDisplay: 800,
    });

    // Load recent searches
    useEffect(() => {
        const saved = localStorage.getItem('recent_shipment_searches');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse recent searches", e);
            }
        }
    }, []);

    // Celebration Effect
    useEffect(() => {
        if (
            shipment?.currentStatus === 'DELIVERED' ||
            shipment?.currentStatus === 'delivered' ||
            shipment?.trackingNumber === 'SPACE-X-042' // Rocket case
        ) {
            // Check if rocket
            if (shipment.trackingNumber === 'SPACE-X-042') {
                const rocketColors = ['#FFD60A', '#FF6B35', '#FF3366', '#00D4FF'];
                confetti({
                    particleCount: 100,
                    spread: 360,
                    origin: { x: 0.5, y: 0.3 },
                    colors: rocketColors,
                    shapes: ['star', 'circle'],
                    scalar: 1.5,
                });
                return;
            }

            const colors = ['#2525FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06FFA5'];
            // Simple elegant celebration
            confetti({
                particleCount: 80,
                spread: 100,
                origin: { y: 0.6 },
                colors,
                shapes: ['circle', 'square'],
                scalar: 1.2,
            });

            // Side bursts
            setTimeout(() => {
                confetti({
                    particleCount: 40,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0, y: 0.7 },
                    colors,
                });
                confetti({
                    particleCount: 40,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1, y: 0.7 },
                    colors,
                });
            }, 200);
        }
    }, [shipment]);

    const updateURL = useCallback((awb: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (awb) {
            params.set('awb', awb);
        } else {
            params.delete('awb');
        }
        router.replace(`/track?${params.toString()}`, { scroll: false });
    }, [searchParams, router]);

    const addToRecent = (number: string, status?: string) => {
        setRecentSearches(prev => {
            const filtered = prev.filter(p => p.number !== number);
            const newHistory = [{ number, timestamp: Date.now(), status }, ...filtered].slice(0, 5);
            localStorage.setItem('recent_shipment_searches', JSON.stringify(newHistory));
            return newHistory;
        });
    };

    const removeFromRecent = (e: React.MouseEvent, number: string) => {
        e.stopPropagation();
        setRecentSearches(prev => {
            const updated = prev.filter(p => p.number !== number);
            localStorage.setItem('recent_shipment_searches', JSON.stringify(updated));
            return updated;
        });
    };

    const handleTrack = async (e?: React.FormEvent, overrideNumber?: string) => {
        if (e) e.preventDefault();
        const numberToTrack = overrideNumber || trackingNumber;
        if (!numberToTrack.trim()) return;

        startLoading();
        setError(null);
        setHasSearched(true);
        setShipment(null);
        if (!overrideNumber) setTrackingNumber(numberToTrack); // Sync input if override used

        updateURL(numberToTrack.trim());

        const upperNumber = numberToTrack.trim().toUpperCase();
        const mockKeywords = ['DEMO', 'DELIVERED', 'TRANSIT', 'ROCKET'];

        // 1. Check for Demo Keywords
        if (mockKeywords.includes(upperNumber)) {
            setTimeout(() => {
                let mockShipment = getMockShipmentByKeyword(upperNumber);

                if (upperNumber === 'ROCKET') {
                    mockShipment = {
                        awb: 'SPACE-X-042',
                        trackingNumber: 'SPACE-X-042',
                        carrier: 'Interstellar Logistics',
                        courier: 'Interstellar Logistics',
                        serviceType: 'Orbital Express',
                        currentStatus: 'IN_TRANSIT',
                        status: 'IN_TRANSIT',
                        estimatedDelivery: new Date().toISOString(),
                        createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
                        origin: 'Cape Canaveral',
                        destination: 'ISS',
                        recipient: { name: 'Astronaut', city: 'Low Earth Orbit', state: 'Space' },
                        timeline: [
                            { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 3600000).toISOString(), location: '400 km above Earth', description: '🚀 Approaching ISS!', completed: true, current: true },
                            { status: 'PICKED_UP', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), location: 'Launch Complex 39A', description: '🔥 Liftoff confirmed!', completed: true, current: false },
                            { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), location: 'Cape Canaveral', description: '⚡ Countdown initiated.', completed: true, current: false },
                        ],
                        history: [
                            { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 3600000).toISOString(), location: '400 km above Earth', description: '🚀 Approaching ISS!', completed: true, current: true },
                            { status: 'PICKED_UP', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), location: 'Launch Complex 39A', description: '🔥 Liftoff confirmed!', completed: true, current: false },
                            { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), location: 'Cape Canaveral', description: '⚡ Countdown initiated.', completed: true, current: false },
                        ],
                    };
                }

                if (mockShipment) {
                    setShipment(mockShipment);
                    addToRecent(upperNumber, mockShipment.currentStatus);
                }

                stopLoading();
            }, 1500);
            return;
        }

        // 2. Real API Call
        try {
            const data = await shipmentApi.trackShipment(numberToTrack.trim());
            const normalizedShipment = {
                ...data,
                currentStatus: data.currentStatus
            };

            setShipment(normalizedShipment);
            addToRecent(data.trackingNumber, data.currentStatus);
        } catch (err) {
            console.error('Tracking Error:', err);
            let message = 'Failed to find shipment. Please check the number and try again.';
            if (err instanceof Error) {
                message = err.message;
            }
            setError(message);
        } finally {
            stopLoading();
        }
    };

    // Initialize from URL
    useEffect(() => {
        const awbFromUrl = searchParams.get('awb');
        if (awbFromUrl) {
            setTrackingNumber(awbFromUrl);
            setAutoTrackNumber(awbFromUrl);
        } else {
            // Default to DEMO for testing as per original code
            setTrackingNumber('DEMO');
            setAutoTrackNumber('DEMO');
        }
    }, []);

    // Auto-trigger tracking from URL
    useEffect(() => {
        if (autoTrackNumber && !shipment && !isLoading) {
            const timer = setTimeout(() => {
                handleTrack(undefined, autoTrackNumber);
                setAutoTrackNumber(null);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [autoTrackNumber]);

    return {
        trackingNumber,
        setTrackingNumber,
        shipment,
        error,
        isLoading,
        showLoader,
        recentSearches,
        handleTrack,
        removeFromRecent
    };
}
