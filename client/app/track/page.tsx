'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { Search, ArrowRight, Loader2, AlertCircle, X, History, Box } from 'lucide-react';
import { trackingApi, PublicTrackingResponse } from '@/src/core/api/trackingApi';
import { toast } from 'sonner';
import { Navigation, Footer } from '@/src/shared/components';
import confetti from 'canvas-confetti';

// Import new components
import { SoundProvider } from './components/SoundManager';
import { MagneticCursor } from './components/MagneticCursor';
import { MorphingStatusHero } from './components/MorphingStatusHero';
import { AnimatedTimeline } from './components/AnimatedTimeline';
import { InteractiveMap } from './components/InteractiveMap';
import { EasterEggs } from './components/EasterEggs';
import { useSound } from './components/SoundManager';

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

// Background Components
const GridBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[var(--bg-secondary)]">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#E2E8F0_1px,transparent_1px),linear-gradient(to_bottom,#E2E8F0_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-40" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_0%,transparent,white)]" />
    <motion.div
      animate={{ opacity: [0.1, 0.3, 0.1], scale: [1, 1.1, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primaryBlue/5 rounded-full blur-[100px]"
    />
  </div>
);

// Main Tracking Page Component
function TrackPageContent() {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shipment, setShipment] = useState<PublicTrackingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  const { play, vibrate } = useSound();

  // Mouse parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [2, -2]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-2, 2]), { stiffness: 150, damping: 20 });

  useEffect(() => {
    const saved = localStorage.getItem('recent_shipment_searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches', e);
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
  }, [mouseX, mouseY, shipment]);

  // Confetti for delivered
  useEffect(() => {
    if (shipment?.currentStatus === 'DELIVERED' || shipment?.currentStatus === 'delivered') {
      play('ding');
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
  }, [shipment, play]);

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

  const MOCK_SHIPMENT: PublicTrackingResponse = {
    trackingNumber: 'SHP-20231225-8888',
    carrier: 'BlueDart Express',
    serviceType: 'Express Air',
    currentStatus: 'OUT_FOR_DELIVERY',
    estimatedDelivery: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    recipient: { city: 'Mumbai', state: 'Maharashtra' },
    timeline: [
      { status: 'OUT_FOR_DELIVERY', timestamp: new Date().toISOString(), location: 'Mumbai, Maharashtra', description: 'Shipment is out for delivery. Agent: Rajesh Kumar (9988776655)' },
      { status: 'ARRIVED_AT_DESTINATION', timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), location: 'Mumbai Hub', description: 'Shipment arrived at destination facility.' },
      { status: 'IN_TRANSIT', timestamp: new Date(Date.now() - 86400000).toISOString(), location: 'New Delhi', description: 'Shipment is in transit to destination.' },
      { status: 'PICKED_UP', timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(), location: 'Gurgaon, Haryana', description: 'Shipment picked up from seller warehouse.' },
      { status: 'ORDER_CREATED', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), description: 'Order has been created and is ready for processing.' },
    ],
  };

  const handleTrack = async (e?: React.FormEvent, overrideNumber?: string) => {
    if (e) e.preventDefault();
    const numberToTrack = overrideNumber || trackingNumber;
    if (!numberToTrack.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);
    setShipment(null);

    play('whoosh');
    vibrate(50);

    // DEMO MODE
    if (numberToTrack.trim().toUpperCase() === 'DEMO') {
      setTimeout(() => {
        setShipment(MOCK_SHIPMENT);
        addToRecent('DEMO', 'OUT_FOR_DELIVERY');
        setIsLoading(false);
        play('chime');
      }, 1500);
      return;
    }

    // ROCKET Easter Egg
    if (numberToTrack.trim().toUpperCase() === 'ROCKET') {
      setTimeout(() => {
        const rocketShipment = {
          ...MOCK_SHIPMENT,
          trackingNumber: 'ROCKET-001',
          carrier: 'SpaceX Delivery',
          serviceType: 'Orbital Express',
          currentStatus: 'IN_TRANSIT',
          timeline: [
            { status: 'ORBITAL_INSERTION', timestamp: new Date().toISOString(), location: 'Low Earth Orbit', description: '🚀 Package achieved orbital velocity!' },
            { status: 'LAUNCHED', timestamp: new Date(Date.now() - 3600000).toISOString(), location: 'Cape Canaveral', description: '🔥 Liftoff successful!' },
          ],
        };
        setShipment(rocketShipment as any);
        addToRecent('ROCKET', 'IN_TRANSIT');
        setIsLoading(false);
        play('tada');
        confetti({
          particleCount: 200,
          spread: 160,
          origin: { y: 0.6 },
          shapes: ['star'],
          colors: ['#FFD700', '#FFA500', '#FF4500'],
        });
      }, 1500);
      return;
    }

    try {
      const data = await trackingApi.trackShipment(numberToTrack.trim());
      setShipment(data);
      addToRecent(data.trackingNumber, data.currentStatus);
      play('chime');
      vibrate([50, 100, 50]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find shipment');
      play('error');
      vibrate(200);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--bg-secondary)] flex flex-col font-sans overflow-x-hidden selection:bg-blue-100 selection:text-blue-700">
      <Navigation />
      <GridBackground />
      <EasterEggs onEasterEggFound={(egg) => play('tada')} />

      <div className="flex-grow relative z-10 flex flex-col items-center justify-center container mx-auto px-4 py-8">
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className={`w-full max-w-4xl flex flex-col items-center ${shipment ? 'pt-8' : 'min-h-[60vh] justify-center'}`}
        >
          {/* Header */}
          <AnimatePresence>
            {!shipment && !isLoading && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, scale: 0.9, marginBottom: 0 }}
                className="text-center mb-12"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[var(--border-subtle)] shadow-sm text-xs font-semibold text-[var(--primary-blue)] tracking-wider uppercase mb-6"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary-blue)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary-blue)]" />
                  </span>
                  Live Tracking System
                </motion.div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)] mb-6">
                  Where is your <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-blue)] to-indigo-600">
                    Shipment?
                  </span>
                </h1>
                <p className="text-[var(--text-secondary)] text-lg max-w-lg mx-auto">
                  Experience the next generation of logistics tracking with incredible animations and real-time updates.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Bar */}
          <motion.div
            layout
            style={{
              perspective: 1000,
              rotateX: !shipment && !hasSearched ? rotateX : 0,
              rotateY: !shipment && !hasSearched ? rotateY : 0,
            }}
            className={`w-full max-w-xl relative z-30 ${shipment ? 'mb-8' : 'mb-0'}`}
          >
            <motion.form
              onSubmit={handleTrack}
              layoutId="search-container"
              className={`relative bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-200/60 transition-all duration-500 ease-out flex items-center p-2 overflow-hidden ${
                isLoading ? 'ring-4 ring-[var(--primary-blue-soft)]' : 'hover:shadow-[0_30px_60px_-12px_rgba(37,37,255,0.15)] focus-within:ring-4 focus-within:ring-[var(--primary-blue-soft)]'
              }`}
              data-cursor="button"
            >
              {isLoading && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/30 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '100%' }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
              )}

              <div className="pl-4 text-slate-400 z-10">
                <Search className="w-6 h-6" />
              </div>
              <input
                type="text"
                value={trackingNumber}
                onChange={e => setTrackingNumber(e.target.value.toUpperCase())}
                placeholder="Enter AWB ID (try DEMO or ROCKET)"
                className="flex-1 bg-transparent border-none outline-none px-4 py-4 text-lg text-slate-800 placeholder:text-slate-300 font-semibold tracking-wide z-10"
                disabled={isLoading}
              />

              <AnimatePresence mode="popLayout">
                {isLoading ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="pr-4 z-10"
                  >
                    <Loader2 className="w-6 h-6 text-[var(--primary-blue)] animate-spin" />
                  </motion.div>
                ) : (
                  <motion.button
                    key="button"
                    layout
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={!trackingNumber}
                    className="bg-[var(--primary-blue)] text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 z-10"
                    data-cursor="button"
                  >
                    <ArrowRight className="w-6 h-6" />
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.form>

            {!shipment && !isLoading && !recentSearches.length && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -bottom-10 left-0 w-full text-center text-sm text-slate-400 font-medium"
              >
                Try{' '}
                <span
                  className="text-[var(--primary-blue)] cursor-pointer hover:underline decoration-2"
                  onClick={() => setTrackingNumber('DEMO')}
                >
                  DEMO
                </span>{' '}
                or{' '}
                <span
                  className="text-[var(--primary-blue)] cursor-pointer hover:underline decoration-2"
                  onClick={() => setTrackingNumber('ROCKET')}
                >
                  ROCKET
                </span>
              </motion.p>
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
                      className="group relative bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:border-[var(--primary-blue)] hover:shadow-md transition-all"
                      data-cursor="card"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <Box size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{search.number}</span>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">
                          {search.status?.replace(/_/g, ' ') || 'Tracked recently'}
                        </span>
                      </div>
                      <button
                        onClick={e => removeFromRecent(e, search.number)}
                        className="absolute -top-2 -right-2 bg-slate-100 hover:bg-slate-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} className="text-slate-500" />
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
              className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-xl flex items-center gap-3 shadow-lg shadow-red-500/5 max-w-md mt-4"
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
              className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-6 pb-20"
            >
              {/* Status Hero */}
              <div className="col-span-1 md:col-span-5">
                <MorphingStatusHero
                  trackingNumber={shipment.trackingNumber}
                  status={shipment.currentStatus}
                  estimatedDelivery={shipment.estimatedDelivery}
                  actualDelivery={shipment.actualDelivery}
                />
              </div>

              {/* 3D Package + Map */}
              <div className="col-span-1 md:col-span-7 grid grid-cols-1 gap-4 h-auto md:h-[340px]">
                <div className="h-[300px] md:h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
                  <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-slate-400">Loading 3D...</div>}>
                    <Package3D status={shipment.currentStatus} />
                  </Suspense>
                </div>
              </div>

              {/* Journey Map */}
              <div className="col-span-1 md:col-span-12">
                <InteractiveMap
                  locations={shipment.timeline}
                  destination={shipment.recipient}
                />
              </div>

              {/* Timeline */}
              <div className="col-span-1 md:col-span-12">
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

// Main Export with Providers
export default function TrackPage() {
  return (
    <SoundProvider>
      <MagneticCursor />
      <TrackPageContent />
    </SoundProvider>
  );
}
