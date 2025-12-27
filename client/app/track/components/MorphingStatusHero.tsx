'use client';

import React, { useMemo } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CheckCircle, Truck, Box, Clock, Package, MapPin } from 'lucide-react';
import { GenerativeArt } from './GenerativeArt';

interface StatusInfo {
  text: string;
  sub: string;
  color: string;
  iconColor: string;
  bgGradient: string;
  progressGradient: string;
  icon: React.ReactNode;
  accentColor: string;
}

interface MorphingStatusHeroProps {
  trackingNumber: string;
  status: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  className?: string;
}

export function MorphingStatusHero({
  trackingNumber,
  status,
  estimatedDelivery,
  actualDelivery,
  className = '',
}: MorphingStatusHeroProps) {
  // Mouse tracking for subtle parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [2, -2]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-2, 2]), {
    stiffness: 150,
    damping: 20,
  });

  const statusInfo = useMemo((): StatusInfo => {
    const estDate = estimatedDelivery
      ? new Date(estimatedDelivery).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : '';

    const normalizedStatus = status.toUpperCase();

    switch (normalizedStatus) {
      case 'DELIVERED':
        return {
          text: 'Delivered Successfully',
          sub: actualDelivery
            ? `Delivered on ${new Date(actualDelivery).toLocaleDateString()}`
            : 'Package delivered safely',
          color: 'text-emerald-700',
          iconColor: 'text-emerald-600',
          bgGradient: 'from-emerald-50 to-green-50',
          progressGradient: 'from-emerald-500 via-emerald-400 to-green-400',
          icon: <CheckCircle className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: '#10B981',
        };

      case 'OUT_FOR_DELIVERY':
        return {
          text: 'Out for Delivery',
          sub: 'Your package will arrive today',
          color: 'text-blue-700',
          iconColor: 'text-blue-600',
          bgGradient: 'from-blue-50 to-indigo-50',
          progressGradient: 'from-blue-600 via-blue-500 to-indigo-500',
          icon: <Truck className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: '#2525FF',
        };

      case 'IN_TRANSIT':
      case 'ARRIVED_AT_DESTINATION':
        return {
          text: normalizedStatus === 'ARRIVED_AT_DESTINATION' ? 'Arrived at Hub' : 'In Transit',
          sub: `Expected delivery: ${estDate}`,
          color: 'text-indigo-700',
          iconColor: 'text-indigo-600',
          bgGradient: 'from-indigo-50 to-purple-50',
          progressGradient: 'from-indigo-600 via-indigo-500 to-purple-500',
          icon: <MapPin className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: '#6366F1',
        };

      case 'PICKED_UP':
        return {
          text: 'Picked Up',
          sub: 'Package collected from origin',
          color: 'text-amber-700',
          iconColor: 'text-amber-600',
          bgGradient: 'from-amber-50 to-orange-50',
          progressGradient: 'from-amber-500 via-amber-400 to-orange-400',
          icon: <Package className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: '#F59E0B',
        };

      case 'ORDER_CREATED':
      case 'CREATED':
        return {
          text: 'Order Created',
          sub: 'Preparing for shipment',
          color: 'text-slate-700',
          iconColor: 'text-slate-600',
          bgGradient: 'from-slate-50 to-gray-50',
          progressGradient: 'from-slate-600 via-slate-500 to-gray-500',
          icon: <Box className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: '#64748B',
        };

      default:
        return {
          text: status.replace(/_/g, ' '),
          sub: estDate ? `Expected ${estDate}` : 'Processing your shipment',
          color: 'text-slate-700',
          iconColor: 'text-slate-600',
          bgGradient: 'from-slate-50 to-gray-50',
          progressGradient: 'from-slate-600 via-slate-500 to-gray-500',
          icon: <Clock className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: '#64748B',
        };
    }
  }, [status, estimatedDelivery, actualDelivery]);

  const progress = useMemo(() => {
    const normalizedStatus = status.toUpperCase();
    switch (normalizedStatus) {
      case 'DELIVERED':
        return 100;
      case 'OUT_FOR_DELIVERY':
        return 85;
      case 'ARRIVED_AT_DESTINATION':
        return 70;
      case 'IN_TRANSIT':
        return 50;
      case 'PICKED_UP':
        return 30;
      case 'ORDER_CREATED':
      case 'CREATED':
        return 10;
      default:
        return 0;
    }
  }, [status]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  return (
    <motion.div
      className={`relative bg-gradient-to-br ${statusInfo.bgGradient} rounded-3xl p-8 border border-white/60 shadow-2xl overflow-hidden group ${className}`}
      style={{
        perspective: 1000,
        rotateX,
        rotateY,
      }}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 25,
        delay: 0.2,
      }}
      whileHover={{ scale: 1.02, y: -5 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
      }}
      data-cursor="card"
    >
      {/* Generative Art Background - Subtle */}
      <div className="absolute inset-0 opacity-10">
        <GenerativeArt trackingNumber={trackingNumber} />
      </div>

      {/* Animated Gradient Orb */}
      <motion.div
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30"
        style={{
          background: `radial-gradient(circle, ${statusInfo.accentColor}40, transparent)`,
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Status Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm mb-6"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
            delay: 0.3,
          }}
        >
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusInfo.accentColor }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [1, 0.6, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span className={`text-xs font-bold ${statusInfo.color} uppercase tracking-wider`}>
            Current Status
          </span>
        </motion.div>

        {/* Icon and Title */}
        <div className="flex items-start gap-6 mb-6">
          <motion.div
            className={`p-4 rounded-2xl bg-white/90 backdrop-blur-sm ${statusInfo.iconColor} shadow-lg`}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.4,
            }}
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
            {statusInfo.icon}
          </motion.div>

          <div className="flex-1">
            <motion.h2
              className={`text-3xl md:text-4xl font-black ${statusInfo.color} leading-tight tracking-tight mb-2`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              {statusInfo.text}
            </motion.h2>
            <motion.p
              className="text-slate-600 font-medium text-base md:text-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              {statusInfo.sub}
            </motion.p>
          </div>
        </div>

        {/* Progress Section */}
        <div className="mt-8">
          {/* Progress Bar */}
          <div className="relative h-3 w-full bg-white/60 rounded-full overflow-hidden shadow-inner">
            <motion.div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r ${statusInfo.progressGradient} rounded-full shadow-lg`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{
                duration: 1.5,
                ease: [0.4, 0, 0.2, 1],
                delay: 0.7,
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </motion.div>
          </div>

          {/* Progress Labels */}
          <div className="flex justify-between items-center mt-3">
            <motion.span
              className="text-xs font-bold text-slate-400 uppercase tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Created
            </motion.span>

            <motion.div
              className={`px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm ${statusInfo.color} font-bold text-sm shadow-sm`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 20,
                delay: 0.9,
              }}
            >
              {progress}%
            </motion.div>

            <motion.span
              className="text-xs font-bold text-slate-400 uppercase tracking-wider"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Delivered
            </motion.span>
          </div>
        </div>
      </div>

      {/* Decorative Corner Element */}
      <motion.div
        className="absolute bottom-4 right-4 w-16 h-16 opacity-10"
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 20,
          delay: 1,
        }}
      >
        <svg viewBox="0 0 100 100" className={statusInfo.iconColor}>
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </motion.div>
    </motion.div>
  );
}
