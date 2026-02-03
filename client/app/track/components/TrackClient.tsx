"use client"

import React, { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertCircle, X, History, Box } from 'lucide-react';
import { useShipmentTracking } from '@/src/core/api/hooks/logistics/useShipmentTracking';

// Import components
import { StatusCard } from './StatusCard';
import { HorizontalTimeline } from './HorizontalTimeline';
import { JourneyMapLeaflet } from './JourneyMapLeaflet';
import { ShipmentDetails } from './ShipmentDetails';
import { DeliveryInfo } from './DeliveryInfo';
import { EasterEggs } from './EasterEggs';
import { Navigation, Footer, Loader } from '@/src/components/ui';

// Lazy load heavy 3D component
const Package3D = lazy(() =>
    import('./Package3D').then(mod => ({ default: mod.Package3D }))
);

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

export function TrackClient() {
    const {
        trackingNumber,
        setTrackingNumber,
        shipment,
        error,
        isLoading,
        showLoader,
        recentSearches,
        handleTrack,
        removeFromRecent
    } = useShipmentTracking();

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
                                {/* Input container with border */}
                                <div className="relative rounded-[var(--radius-2xl)] border-2 border-[var(--border-default)] group-hover:border-[var(--border-hover)] group-focus-within:border-[var(--primary-blue)] transition-all duration-[var(--duration-base)] bg-[var(--bg-elevated)]">
                                    {/* Subtle focus glow effect */}
                                    <div className="absolute inset-0 opacity-0 group-focus-within:opacity-100 bg-[var(--primary-blue)]/5 rounded-[var(--radius-2xl)] -z-10 blur-xl transition-opacity duration-[var(--duration-slow)] pointer-events-none" />

                                    <div className="relative flex items-center overflow-hidden">
                                        <div className="pl-5 text-[var(--text-tertiary)] group-focus-within:text-[var(--primary-blue)] transition-colors duration-[var(--duration-base)] z-10">
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
                                            className="mr-2 px-5 py-2.5 rounded-[var(--radius-xl)] bg-[var(--primary-blue)] text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--primary-blue-deep)] active:bg-[var(--primary-blue-deep)] transition-colors duration-[var(--duration-base)] z-10"
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
                            <p className="text-xs text-[var(--text-tertiary)] mb-2">Try demo keywords:</p>
                            <div className="flex items-center justify-center gap-2">
                                {['DEMO', 'DELIVERED', 'TRANSIT'].map((keyword) => (
                                    <button
                                        key={keyword}
                                        onClick={() => handleTrack(undefined, keyword)}
                                        className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--primary-blue)] px-3 py-1.5 rounded-[var(--radius-lg)] hover:bg-[var(--bg-hover)] transition-colors"
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
                                <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider px-1">
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
                                            onClick={() => handleTrack(undefined, search.number)}
                                            className="group relative bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl px-4 py-2.5 flex items-center gap-2.5 hover:border-[var(--primary-blue)] transition-all cursor-pointer"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-tertiary)] group-hover:bg-[var(--primary-blue)]/10 group-hover:text-[var(--primary-blue)] transition-colors">
                                                <Box size={14} />
                                            </div>
                                            <span className="text-sm font-medium text-[var(--text-primary)]">{search.number}</span>
                                            <button
                                                onClick={e => removeFromRecent(e, search.number)}
                                                className="ml-1 p-0.5 rounded-full hover:bg-[var(--bg-hover)] opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} className="text-[var(--text-tertiary)]" />
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
                                className="mt-6 bg-[var(--error-bg)] border border-[var(--error-border)] text-[var(--error)] px-5 py-4 rounded-[var(--radius-xl)] flex items-center gap-3"
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
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
                                {/* Status Card */}
                                <StatusCard
                                    trackingNumber={shipment.trackingNumber}
                                    status={shipment.currentStatus}
                                    carrier={shipment.carrier}
                                    serviceType={shipment.serviceType}
                                    estimatedDelivery={shipment.estimatedDelivery}
                                    actualDelivery={shipment.actualDelivery}
                                    destinationCity={shipment.recipient?.city}
                                    destinationState={shipment.recipient?.state}
                                />

                                {/* 3D Package - Visual Stage Container */}
                                <motion.div
                                    className="relative min-h-[400px] lg:min-h-[500px] w-full flex items-center justify-center bg-[var(--bg-secondary)] rounded-[var(--radius-3xl)] border border-[var(--border-default)] overflow-hidden"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.15 }}
                                >
                                    {/* Subtle Grid Pattern */}
                                    <div
                                        className="absolute inset-0 opacity-[0.02]"
                                        style={{
                                            backgroundImage: 'radial-gradient(circle, var(--text-primary) 1px, transparent 1px)',
                                            backgroundSize: '24px 24px'
                                        }}
                                    />

                                    {/* 3D Canvas */}
                                    <div className="w-full h-full relative z-10">
                                        <Suspense
                                            fallback={
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="w-20 h-20 rounded-[var(--radius-2xl)] bg-[var(--primary-blue)]/10 animate-pulse flex items-center justify-center">
                                                        <div className="w-8 h-8 border-3 border-[var(--primary-blue)] border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                </div>
                                            }
                                        >
                                            <Package3D status={shipment.currentStatus} />
                                        </Suspense>
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
                                {/* Note: Leaflet maps sometimes cause SSR issues, but existing code had it. Verify dynamic import usage in subcomponent if needed. */}
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
