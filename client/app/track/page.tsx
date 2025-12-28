'use client';

import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, X, History, Box } from 'lucide-react';
import { trackingApi, PublicTrackingResponse } from '@/src/core/api/trackingApi';
import confetti from 'canvas-confetti';
import { useSearchParams, useRouter } from 'next/navigation';

// Import components
import { StatusCard } from './components/StatusCard';
import { HorizontalTimeline } from './components/HorizontalTimeline';
import { JourneyMapLeaflet } from './components/JourneyMapLeaflet';
import { ShipmentDetails } from './components/ShipmentDetails';
import { DeliveryInfo } from './components/DeliveryInfo';
import { EasterEggs } from './components/EasterEggs';
import { Navigation, Footer, Loader } from '@/components/ui';
import { useLoader } from '@/hooks';

// Lazy load heavy 3D component
const Package3D = lazy(() =>
  import('./components/Package3D').then(mod => ({ default: mod.Package3D }))
);

// Types
interface RecentSearch {
  number: string;
  timestamp: number;
  status?: string;
}

// Subtle Grid Background
const GridBackground = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute inset-0 opacity-[0.015]"
      style={{
        backgroundImage: 'radial-gradient(circle, var(--border-default) 1px, transparent 1px)',
        backgroundSize: '32px 32px'
      }}
    />
  </div>
);

// Main Tracking Page Component
function TrackPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [trackingNumber, setTrackingNumber] = useState('');
  const [shipment, setShipment] = useState<PublicTrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [autoTrackNumber, setAutoTrackNumber] = useState<string | null>(null);

  // Use smart loader with flash prevention
  const { isLoading, showLoader, startLoading, stopLoading } = useLoader({
    minDelay: 300,
    minDisplay: 800,
  });

  // Update URL with tracking number
  const updateURL = useCallback((awb: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (awb) {
      params.set('awb', awb);
    } else {
      params.delete('awb');
    }
    router.replace(`/track?${params.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Load recent searches and check URL/localStorage on mount
  useEffect(() => {
    const awbFromUrl = searchParams.get('awb');
    if (awbFromUrl) {
      setTrackingNumber(awbFromUrl);
      setAutoTrackNumber(awbFromUrl);
      return;
    }

    // Default to DEMO for testing
    setTrackingNumber('DEMO');
    setAutoTrackNumber('DEMO');

  }, []);

  // Celebration Effect for Delivered Status
  useEffect(() => {
    if (shipment?.currentStatus === 'DELIVERED' || shipment?.currentStatus === 'delivered') {
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

  // Mock data helper
  const getMockShipmentByKeyword = (keyword: string): PublicTrackingResponse | null => {
    const mockData = {
      DEMO: {
        trackingNumber: 'SHP-2025-0001',
        carrier: 'BlueDart Express',
        serviceType: 'Express Air',
        currentStatus: 'OUT_FOR_DELIVERY',
        estimatedDelivery: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        recipient: { city: 'Mumbai', state: 'Maharashtra' },
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
        recipient: { city: 'Delhi', state: 'Delhi' },
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
        recipient: { city: 'Hyderabad', state: 'Telangana' },
        timeline: [
          { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000).toISOString(), location: 'Vijayawada Junction', description: 'Package in transit.' },
          { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), location: 'Nellore Distribution', description: 'Processed at center.' },
          { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), location: 'Velachery, Chennai', description: 'Package collected.' },
          { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), location: 'Chennai', description: 'Order created.' },
        ],
      },
    };

    const key = keyword.toUpperCase();
    return (mockData as Record<string, PublicTrackingResponse>)[key] || null;
  };

  const handleTrack = async (e?: React.FormEvent, overrideNumber?: string) => {
    if (e) e.preventDefault();
    const numberToTrack = overrideNumber || trackingNumber;
    if (!numberToTrack.trim()) return;

    startLoading();
    setError(null);
    setHasSearched(true);
    setShipment(null);

    updateURL(numberToTrack.trim());

    const mockKeywords = ['DEMO', 'DELIVERED', 'TRANSIT', 'ROCKET'];
    const upperNumber = numberToTrack.trim().toUpperCase();

    if (mockKeywords.includes(upperNumber)) {
      setTimeout(() => {
        let mockShipment = getMockShipmentByKeyword(upperNumber);

        if (upperNumber === 'ROCKET') {
          mockShipment = {
            trackingNumber: 'SPACE-X-042',
            carrier: 'Interstellar Logistics',
            serviceType: 'Orbital Express',
            currentStatus: 'IN_TRANSIT',
            estimatedDelivery: new Date().toISOString(),
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            recipient: { city: 'Low Earth Orbit', state: 'Space' },
            timeline: [
              { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 3600000).toISOString(), location: '400 km above Earth', description: '🚀 Approaching ISS!' },
              { status: 'PICKED_UP', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), location: 'Launch Complex 39A', description: '🔥 Liftoff confirmed!' },
              { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), location: 'Cape Canaveral', description: '⚡ Countdown initiated.' },
            ],
          };

          // Rocket celebration
          const rocketColors = ['#FFD60A', '#FF6B35', '#FF3366', '#00D4FF'];
          confetti({
            particleCount: 100,
            spread: 360,
            origin: { x: 0.5, y: 0.3 },
            colors: rocketColors,
            shapes: ['star', 'circle'],
            scalar: 1.5,
          });
        }

        if (mockShipment) {
          setShipment(mockShipment);
          addToRecent(upperNumber, mockShipment.currentStatus);
        }

        stopLoading();
      }, 1500);
      return;
    }

    try {
      const data = await trackingApi.trackShipment(numberToTrack.trim());
      setShipment(data);
      addToRecent(data.trackingNumber, data.currentStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find shipment');
    } finally {
      stopLoading();
    }
  };

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

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex flex-col font-sans overflow-x-hidden">
      <Navigation />
      <GridBackground />
      <EasterEggs onEasterEggFound={() => { }} />

      <div className="flex-grow relative z-10 flex flex-col items-center pt-24 md:pt-32 pb-16 px-4">
        {/* Search Section - Always Centered */}
        <motion.div
          layout
          className={`w-full max-w-2xl flex flex-col items-center transition-all duration-500 ${shipment ? 'mb-10' : 'min-h-[40vh] justify-center'
            }`}
        >
          {/* Hero Text - Only when no results */}
          <AnimatePresence>
            {!shipment && !showLoader && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center mb-10"
              >
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-[var(--text-primary)] mb-3">
                  Track your shipment
                </h1>
                <p className="text-[var(--text-secondary)] text-sm md:text-base max-w-md mx-auto">
                  Enter your tracking number to get real-time updates
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Bar */}
          <AnimatePresence>
            {!showLoader && (
              <motion.form
                onSubmit={handleTrack}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`w-full relative group ${shipment ? 'max-w-xl' : ''}`}
              >
                {/* Gradient border container */}
                <div className="relative p-[1.5px] rounded-2xl bg-gradient-to-r from-[var(--primary-blue)]/20 via-[var(--primary-blue)]/40 to-[var(--primary-blue)]/20 group-hover:from-[var(--primary-blue)]/40 group-hover:via-[var(--primary-blue)]/60 group-hover:to-[var(--primary-blue)]/40 group-focus-within:from-[var(--primary-blue)] group-focus-within:via-[var(--primary-blue)] group-focus-within:to-[var(--primary-blue)] transition-all duration-300">
                  <div className="relative bg-[var(--bg-elevated)] rounded-2xl flex items-center overflow-hidden">
                    {/* Glow effect on focus */}
                    <div className="absolute inset-0 opacity-0 group-focus-within:opacity-100 bg-gradient-to-r from-transparent via-[var(--primary-blue)]/5 to-transparent transition-opacity duration-300 pointer-events-none" />

                    <div className="pl-5 text-[var(--text-tertiary)] group-focus-within:text-[var(--primary-blue)] transition-colors duration-200 z-10">
                      <Search className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value.toUpperCase())}
                      placeholder="Enter tracking number"
                      className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] font-medium z-10"
                      disabled={isLoading}
                      autoComplete="off"
                      spellCheck="false"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={!trackingNumber || isLoading}
                      className="mr-2 px-5 py-2.5 rounded-xl bg-[var(--primary-blue)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--primary-blue-deep)] transition-colors z-10"
                    >
                      Track
                    </motion.button>
                  </div>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Demo Keywords - Only when no results */}
          {!shipment && !showLoader && !recentSearches.length && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 text-center"
            >
              <p className="text-xs text-[var(--text-muted)] mb-2">Try demo keywords:</p>
              <div className="flex items-center justify-center gap-2">
                {['DEMO', 'DELIVERED', 'TRANSIT'].map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => setTrackingNumber(keyword)}
                    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] px-3 py-1.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    {keyword}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loader */}
          <AnimatePresence>
            {showLoader && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md mt-8"
              >
                <Loader variant="truck" size="lg" message="Tracking your package..." centered />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Searches - Only when no results */}
          <AnimatePresence>
            {!shipment && !showLoader && recentSearches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full max-w-lg mt-6"
              >
                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-1">
                  <History size={12} />
                  <span>Recent</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <motion.div
                      key={search.number}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => {
                        setTrackingNumber(search.number);
                        handleTrack(undefined, search.number);
                      }}
                      className="group relative bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 flex items-center gap-2.5 hover:border-[var(--primary-blue)] transition-all cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:bg-[var(--primary-blue-soft)] group-hover:text-[var(--primary-blue)] transition-colors">
                        <Box size={14} />
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{search.number}</span>
                      <button
                        onClick={e => removeFromRecent(e, search.number)}
                        className="ml-1 p-0.5 rounded-full hover:bg-[var(--bg-hover)] opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={12} className="text-[var(--text-muted)]" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error State */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-6 bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error)] px-5 py-4 rounded-xl flex items-center gap-3"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="font-medium text-sm">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {shipment && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="w-full max-w-6xl"
            >
              {/* Top Row: Status Card + 3D Box */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Status Card */}
                <StatusCard
                  trackingNumber={shipment.trackingNumber}
                  status={shipment.currentStatus}
                  carrier={shipment.carrier}
                  serviceType={shipment.serviceType}
                  estimatedDelivery={shipment.estimatedDelivery}
                  actualDelivery={shipment.actualDelivery}
                />

                {/* 3D Package - Full Container Size */}
                <motion.div
                  className="relative h-[400px] lg:h-auto lg:min-h-[500px] w-full"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 }}
                >
                  <Suspense
                    fallback={
                      <div className="w-full h-full flex items-center justify-center bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-default)]">
                        <div className="w-16 h-16 rounded-2xl bg-[var(--bg-tertiary)] animate-pulse" />
                      </div>
                    }
                  >
                    <Package3D status={shipment.currentStatus} />
                  </Suspense>

                  {/* Overlay Badge - Floating Style */}
                  <div className="absolute top-0 right-0 z-10 px-4 py-2">
                    <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Interactive 3D</span>
                  </div>
                </motion.div>
              </div>

              {/* Horizontal Timeline */}
              <div className="mb-6">
                <HorizontalTimeline
                  events={shipment.timeline}
                  currentStatus={shipment.currentStatus}
                />
              </div>

              {/* Journey Map */}
              <div className="mb-6">
                <JourneyMapLeaflet
                  locations={shipment.timeline}
                  destination={shipment.recipient}
                  currentStatus={shipment.currentStatus}
                />
              </div>


              {/* Bottom Row: Shipment Details + Delivery Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                <ShipmentDetails
                  trackingNumber={shipment.trackingNumber}
                  carrier={shipment.carrier}
                  serviceType={shipment.serviceType}
                />
                <DeliveryInfo
                  city={shipment.recipient.city}
                  state={shipment.recipient.state}
                  estimatedDelivery={shipment.estimatedDelivery}
                  actualDelivery={shipment.actualDelivery}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </main>
  );
}

// Main Export
export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <Loader variant="truck" size="lg" message="Loading..." centered />
      </div>
    }>
      <TrackPageContent />
    </Suspense>
  );
}