'use client';

import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { Search, ArrowRight, Loader2, AlertCircle, X, History, Box } from 'lucide-react';
import { trackingApi, PublicTrackingResponse } from '@/src/core/api/trackingApi';
import confetti from 'canvas-confetti';
import { useSearchParams, useRouter } from 'next/navigation';

// Import components
import { MorphingStatusHero } from './components/MorphingStatusHero';
import { AnimatedTimeline } from './components/AnimatedTimeline';
import { InteractiveMap } from './components/InteractiveMap';
import { EasterEggs } from './components/EasterEggs';
import { Navigation, Footer } from '@/components/ui';

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

// Background Components - Minimal
const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[var(--bg-secondary)]">
    {/* Subtle grid pattern - no gradients */}
    <div className="absolute inset-0 opacity-[0.02]" style={{
      backgroundImage: 'radial-gradient(circle, var(--border-default) 1px, transparent 1px)',
      backgroundSize: '40px 40px'
    }} />
  </div>
);

// Main Tracking Page Component
function TrackPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shipment, setShipment] = useState<PublicTrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [autoTrackNumber, setAutoTrackNumber] = useState<string | null>(null);

  // Mouse parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [2, -2]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-2, 2]), { stiffness: 150, damping: 20 });

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
    // Load recent searches
    const saved = localStorage.getItem('recent_shipment_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
      }
    }

    // Check URL parameter first
    const awbFromUrl = searchParams.get('awb');
    if (awbFromUrl) {
      setTrackingNumber(awbFromUrl);
      setAutoTrackNumber(awbFromUrl);
      return;
    }

    // Fallback to last search from localStorage (only pre-fill, don't auto-track)
    if (saved) {
      try {
        const searches = JSON.parse(saved) as RecentSearch[];
        if (searches.length > 0) {
          const lastSearch = searches[0].number;
          setTrackingNumber(lastSearch);
          // Only set autoTrackNumber if you want to auto-track last search
          // setAutoTrackNumber(lastSearch);
        }
      } catch (e) {
        console.error('Failed to parse localStorage', e);
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (shipment) return;
      const { clientX, clientY, innerWidth, innerHeight } = { ...e, innerWidth: window.innerWidth, innerHeight: window.innerHeight };
      mouseX.set((clientX / innerWidth) - 0.5);
      mouseY.set((clientY / innerHeight) - 0.5);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []); // Only run once on mount

  // Confetti for delivered
  useEffect(() => {
    if (shipment?.currentStatus === 'DELIVERED' || shipment?.currentStatus === 'delivered') {
      const end = Date.now() + 1500;
      const colors = ['#2525FF', '#3B82F6', '#60A5FA'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors,
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
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

  // Import mock data helper
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
          { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), location: 'Andheri West, Mumbai', description: 'Package is out for delivery. Estimated arrival by 6:00 PM today.' },
          { status: 'ARRIVED_AT_DESTINATION', timestamp: new Date(Date.now() - 3600000 * 8).toISOString(), location: 'Mumbai Central Hub', description: 'Shipment arrived at destination facility and sorted for delivery.' },
          { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000 - 3600000 * 14).toISOString(), location: 'Pune Distribution Center', description: 'Package in transit to destination city.' },
          { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000 * 2 - 3600000 * 6).toISOString(), location: 'Bengaluru Sorting Facility', description: 'Processed through sorting facility.' },
          { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000 * 2 - 3600000 * 18).toISOString(), location: 'Koramangala, Bengaluru', description: 'Shipment picked up from seller warehouse.' },
          { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), location: 'Bengaluru', description: 'Shipment order created and ready for pickup.' },
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
          { status: 'DELIVERED', timestamp: new Date(Date.now() - 3600000 * 10).toISOString(), location: 'Connaught Place, Delhi', description: 'Package successfully delivered and signed by recipient.' },
          { status: 'OUT_FOR_DELIVERY', timestamp: new Date(Date.now() - 3600000 * 14).toISOString(), location: 'Karol Bagh Hub, Delhi', description: 'Out for delivery.' },
          { status: 'ARRIVED_AT_DESTINATION', timestamp: new Date(Date.now() - 86400000 - 3600000 * 8).toISOString(), location: 'Delhi Regional Hub', description: 'Arrived at destination facility.' },
          { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000 * 2 - 3600000 * 12).toISOString(), location: 'Jaipur Transit Hub', description: 'In transit via road transport.' },
          { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000 * 4 - 3600000 * 10).toISOString(), location: 'Andheri, Mumbai', description: 'Picked up from merchant location.' },
          { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 86400000 * 5).toISOString(), location: 'Mumbai', description: 'Order created and confirmed.' },
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
          { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000 - 3600000 * 4).toISOString(), location: 'Vijayawada Junction', description: 'Package in transit to destination. On schedule.' },
          { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000 * 2 - 3600000 * 8).toISOString(), location: 'Nellore Distribution Center', description: 'Processed through distribution center.' },
          { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000 * 3 - 3600000 * 20).toISOString(), location: 'Velachery, Chennai', description: 'Package collected from origin warehouse.' },
          { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 86400000 * 4).toISOString(), location: 'Chennai', description: 'Shipment registered in system.' },
        ],
      },
    };

    const key = keyword.toUpperCase();
    return (mockData as any)[key] || null;
  };

  const handleTrack = async (e?: React.FormEvent, overrideNumber?: string) => {
    if (e) e.preventDefault();
    const numberToTrack = overrideNumber || trackingNumber;
    if (!numberToTrack.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setShipment(null);

    // Update URL with tracking number
    updateURL(numberToTrack.trim());

    // Check for mock/demo keywords
    const mockKeywords = ['DEMO', 'DELIVERED', 'TRANSIT', 'ROCKET'];
    const upperNumber = numberToTrack.trim().toUpperCase();

    if (mockKeywords.includes(upperNumber)) {
      setTimeout(() => {
        let mockShipment = getMockShipmentByKeyword(upperNumber);

        // Special handling for ROCKET easter egg
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
              { status: 'ORBITAL_INSERTION', timestamp: new Date(Date.now() - 3600000).toISOString(), location: '400 km above Earth', description: '🚀 Package achieved orbital velocity! Approaching ISS docking port.' },
              { status: 'STAGE_SEPARATION', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), location: '200 km altitude', description: '🔥 Stage 2 ignition successful. Entering orbital trajectory.' },
              { status: 'LAUNCHED', timestamp: new Date(Date.now() - 3600000 * 3).toISOString(), location: 'Launch Complex 39A', description: '🔥 Liftoff confirmed! All systems nominal.' },
              { status: 'PRE_LAUNCH', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), location: 'Cape Canaveral', description: '⚡ Final countdown initiated. Weather conditions: GO.' },
            ],
          };

          confetti({
            particleCount: 200,
            spread: 160,
            origin: { y: 0.6 },
            shapes: ['star'],
            colors: ['#FFD700', '#FFA500', '#FF4500'],
          });
        }

        if (mockShipment) {
          setShipment(mockShipment);
          addToRecent(upperNumber, mockShipment.currentStatus);
        }

        setIsLoading(false);
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
      setIsLoading(false);
    }
  };

  // Auto-trigger tracking when autoTrackNumber is set (from URL on mount)
  useEffect(() => {
    if (autoTrackNumber && !shipment && !isLoading) {
      // Small delay to let UI settle
      const timer = setTimeout(() => {
        handleTrack(undefined, autoTrackNumber);
        setAutoTrackNumber(null); // Clear to prevent re-triggering
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [autoTrackNumber]); // Only depend on autoTrackNumber

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] flex flex-col font-sans overflow-x-hidden selection:bg-[var(--primary-blue)]/10 selection:text-[var(--primary-blue)]">
      <Navigation />
      <GridBackground />
      <EasterEggs onEasterEggFound={() => { }} />

      <div className="flex-grow relative z-10 flex flex-col items-center justify-start container mx-auto px-4 pt-32 pb-16 min-h-screen">
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`w-full max-w-4xl flex flex-col items-center transition-all duration-500 ${shipment ? 'pt-0' : 'min-h-[50vh] justify-center'}`}
        >
          {/* Header */}
          <AnimatePresence>
            {!shipment && !isLoading && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.98, marginBottom: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-center mb-12"
              >
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-[var(--text-primary)] mb-4"
                >
                  Track your shipment
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.6 }}
                  className="text-[var(--text-secondary)] text-base md:text-lg max-w-md mx-auto"
                >
                  Enter your tracking number to get real-time updates
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Bar */}
          <motion.div
            layout
            className={`w-full max-w-2xl relative z-30 ${shipment ? 'mb-10' : 'mb-0'}`}
          >
            <motion.form
              onSubmit={handleTrack}
              layoutId="search-container"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className={`relative bg-[var(--bg-elevated)] rounded-2xl border transition-all duration-300 flex items-center overflow-hidden ${isLoading
                ? 'border-[var(--border-focus)] shadow-[var(--shadow-sm)]'
                : 'border-[var(--border-default)] hover:border-[var(--border-hover)] focus-within:border-[var(--border-focus)] shadow-[var(--shadow-xs)]'
                }`}
            >

              <div className="pl-6 text-[var(--text-tertiary)]">
                <Search className="w-5 h-5" strokeWidth={2} />
              </div>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value.toUpperCase())}
                placeholder="Enter tracking number"
                className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-base text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] font-medium"
                disabled={isLoading}
                autoComplete="off"
                spellCheck="false"
              />

              <AnimatePresence mode="wait">
                {isLoading ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="pr-3"
                  >
                    <div className="px-5 py-2.5">
                      <Loader2 className="w-5 h-5 text-[var(--primary-blue)] animate-spin" strokeWidth={2} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.button
                    key="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={!trackingNumber}
                    className="mr-2 px-6 py-2.5 rounded-xl bg-[var(--primary-blue)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--primary-blue-deep)] transition-colors"
                  >
                    Track
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.form>

            {!shipment && !isLoading && !recentSearches.length && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-3 text-center"
              >
                <p className="text-xs text-[var(--text-tertiary)] mb-2">
                  Try demo:
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {['DEMO', 'DELIVERED', 'TRANSIT'].map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => setTrackingNumber(keyword)}
                      className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] px-2 py-1 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Recent Searches */}
          <AnimatePresence>
            {!shipment && !isLoading && recentSearches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="w-full max-w-xl mt-4"
              >
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">
                  <History size={12} />
                  <span>Recent Searches</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {recentSearches.map((search, idx) => (
                    <motion.div
                      key={search.number}
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => {
                        setTrackingNumber(search.number);
                        handleTrack(undefined, search.number);
                      }}
                      className="group relative bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-[var(--primary-blue)] hover:shadow-[var(--shadow-sm)] transition-all"
                    >
                      <div className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:bg-[var(--primary-blue-soft)] group-hover:text-[var(--primary-blue)] transition-colors">
                        <Box size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{search.number}</span>
                        <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase">
                          {search.status?.replace(/_/g, ' ') || 'Tracked recently'}
                        </span>
                      </div>
                      <button
                        onClick={e => removeFromRecent(e, search.number)}
                        className="absolute -top-2 -right-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} className="text-[var(--text-secondary)]" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Error State */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error)] px-6 py-4 rounded-xl flex items-center gap-3 shadow-[var(--shadow-sm)] max-w-md mt-4"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Dashboard */}
        <AnimatePresence>
          {shipment && (
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              className="w-full max-w-7xl pb-20"
            >
              {/* Top Section: Status + 3D Box */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                {/* Status Hero - Takes more space on desktop */}
                <div className="lg:col-span-7">
                  <MorphingStatusHero
                    trackingNumber={shipment.trackingNumber}
                    status={shipment.currentStatus}
                    estimatedDelivery={shipment.estimatedDelivery}
                    actualDelivery={shipment.actualDelivery}
                  />
                </div>

                {/* 3D Package Visualization */}
                <div className="lg:col-span-5">
                  <motion.div
                    className="h-[350px] lg:h-full bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-secondary)] rounded-3xl border border-[var(--border-subtle)] shadow-[var(--shadow-lg)] overflow-hidden relative group"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 25 }}
                    whileHover={{ scale: 1.02, y: -5 }}
                  >
                    {/* Ambient gradient overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--primary-blue-soft)_0%,transparent_70%)] opacity-20 pointer-events-none" />

                    {/* 3D Canvas */}
                    <Suspense
                      fallback={
                        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-[var(--primary-blue-soft)] animate-pulse" />
                          <p className="text-sm font-medium text-[var(--text-muted)] animate-pulse">
                            Loading 3D View...
                          </p>
                        </div>
                      }
                    >
                      <Package3D status={shipment.currentStatus} />
                    </Suspense>

                    {/* Status Badge Overlay */}
                    <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)]/90 backdrop-blur-md border border-[var(--border-subtle)] shadow-lg z-10">
                      <span className="text-xs font-bold text-[var(--text-primary)]">3D View</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Journey Map */}
              <div className="mb-6">
                <InteractiveMap
                  locations={shipment.timeline}
                  destination={shipment.recipient}
                />
              </div>

              {/* Timeline */}
              <div>
                <AnimatedTimeline events={shipment.timeline} />
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
  return <TrackPageContent />;
}