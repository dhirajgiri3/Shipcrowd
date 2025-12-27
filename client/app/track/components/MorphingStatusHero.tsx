'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Truck, Box, Clock } from 'lucide-react';
import { GenerativeArt } from './GenerativeArt';

interface StatusInfo {
  text: string;
  sub: string;
  color: string;
  bg: string;
  gradient: string;
  icon: React.ReactNode;
  shape: string; // SVG path for morphing shape
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

  const statusInfo = useMemo((): StatusInfo => {
    const estDate = estimatedDelivery
      ? new Date(estimatedDelivery).toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })
      : '';

    // SVG paths for different shapes (normalized to 200x200 viewBox)
    const shapes = {
      circle: 'M 100 20 A 80 80 0 1 1 100 180 A 80 80 0 1 1 100 20 Z',
      square: 'M 40 40 L 160 40 L 160 160 L 40 160 Z',
      pentagon: 'M 100 30 L 160 80 L 140 150 L 60 150 L 40 80 Z',
      star: 'M 100 20 L 115 75 L 170 75 L 125 110 L 145 165 L 100 130 L 55 165 L 75 110 L 30 75 L 85 75 Z',
      hexagon: 'M 100 30 L 160 70 L 160 130 L 100 170 L 40 130 L 40 70 Z',
    };

    switch (status) {
      case 'DELIVERED':
      case 'delivered':
        return {
          text: 'Mission Accomplished!',
          sub: 'Delivered safely',
          color: 'text-emerald-600',
          bg: 'bg-emerald-500',
          gradient: 'from-emerald-500 to-green-400',
          icon: <CheckCircle size={48} />,
          shape: shapes.star,
        };

      case 'OUT_FOR_DELIVERY':
        return {
          text: 'On the way to you',
          sub: 'Arriving today by 8 PM',
          color: 'text-[var(--primary-blue)]',
          bg: 'bg-blue-500',
          gradient: 'from-blue-600 to-indigo-500',
          icon: <Truck size={48} />,
          shape: shapes.pentagon,
        };

      case 'IN_TRANSIT':
      case 'ARRIVED_AT_DESTINATION':
        return {
          text: 'Moving fast',
          sub: `Expected ${estDate}`,
          color: 'text-indigo-600',
          bg: 'bg-indigo-500',
          gradient: 'from-indigo-600 to-purple-500',
          icon: <Truck size={48} />,
          shape: shapes.hexagon,
        };

      case 'PICKED_UP':
        return {
          text: 'We have it',
          sub: 'Picked up from sender',
          color: 'text-amber-600',
          bg: 'bg-amber-500',
          gradient: 'from-amber-500 to-orange-400',
          icon: <Box size={48} />,
          shape: shapes.square,
        };

      default:
        return {
          text: status.replace(/_/g, ' '),
          sub: `Estimated ${estDate}`,
          color: 'text-slate-900',
          bg: 'bg-slate-500',
          gradient: 'from-slate-700 to-slate-500',
          icon: <Clock size={48} />,
          shape: shapes.circle,
        };
    }
  }, [status, estimatedDelivery]);

  const progress = useMemo(() => {
    switch (status) {
      case 'DELIVERED':
      case 'delivered':
        return 100;
      case 'OUT_FOR_DELIVERY':
        return 80;
      case 'IN_TRANSIT':
      case 'ARRIVED_AT_DESTINATION':
        return 60;
      case 'PICKED_UP':
        return 40;
      case 'ORDER_CREATED':
      case 'created':
        return 20;
      default:
        return 0;
    }
  }, [status]);

  return (
    <motion.div
      className={`relative bg-white rounded-[32px] p-8 border border-slate-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden group h-[340px] flex flex-col justify-between ${className}`}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 25,
        delay: 0.4,
      }}
      whileHover={{ y: -5 }}
      data-cursor="card"
    >
      {/* Generative Art Background */}
      <div className="absolute inset-0 opacity-30">
        <GenerativeArt trackingNumber={trackingNumber} />
      </div>

      {/* Morphing Shape Decoration */}
      <div className="absolute top-4 right-4 w-32 h-32 opacity-10">
        <svg viewBox="0 0 200 200" className={statusInfo.color}>
          <motion.path
            d={statusInfo.shape}
            fill="currentColor"
            initial={{ d: 'M 100 20 A 80 80 0 1 1 100 180 A 80 80 0 1 1 100 20 Z' }}
            animate={{ d: statusInfo.shape }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
              duration: 1,
            }}
          />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full">
        <div className="flex items-center gap-2 mb-4">
          <motion.div
            className={`w-3 h-3 rounded-full ${statusInfo.bg}`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.7, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span className="text-sm font-bold text-slate-400 tracking-widest uppercase">
            Current Status
          </span>
        </div>

        <motion.div
          className="flex items-center gap-4 mb-2"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className={statusInfo.color}>{statusInfo.icon}</div>
          <div>
            <h2 className={`text-4xl font-black ${statusInfo.color} leading-tight tracking-tight`}>
              {statusInfo.text}
            </h2>
            <p className="text-slate-500 font-medium text-lg mt-1">
              {statusInfo.sub}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Progress Bar */}
      <div className="relative z-10">
        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{
              duration: 1.5,
              ease: 'easeOut',
              delay: 0.6,
            }}
            className={`h-full rounded-full bg-gradient-to-r ${statusInfo.gradient}`}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs font-bold text-slate-300 uppercase">
          <span>Start</span>
          <span>{progress}% Complete</span>
          <span>Delivered</span>
        </div>
      </div>
    </motion.div>
  );
}
