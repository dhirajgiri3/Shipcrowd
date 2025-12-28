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
          color: 'text-[var(--text-success)]',
          iconColor: 'text-[var(--text-success)]',
          icon: <CheckCircle className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: 'var(--success)',
        };

      case 'OUT_FOR_DELIVERY':
        return {
          text: 'Out for Delivery',
          sub: 'Your package will arrive today',
          color: 'text-[var(--primary-blue)]',
          iconColor: 'text-[var(--primary-blue)]',
          icon: <Truck className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: 'var(--primary-blue)',
        };

      case 'IN_TRANSIT':
      case 'ARRIVED_AT_DESTINATION':
        return {
          text: normalizedStatus === 'ARRIVED_AT_DESTINATION' ? 'Arrived at Hub' : 'In Transit',
          sub: `Expected delivery: ${estDate}`,
          color: 'text-[var(--primary-blue)]',
          iconColor: 'text-[var(--primary-blue)]',
          icon: <MapPin className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: 'var(--primary-blue)',
        };

      case 'PICKED_UP':
        return {
          text: 'Picked Up',
          sub: 'Package collected from origin',
          color: 'text-[var(--text-warning)]',
          iconColor: 'text-[var(--text-warning)]',
          icon: <Package className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: 'var(--warning)',
        };

      case 'ORDER_CREATED':
      case 'CREATED':
        return {
          text: 'Order Created',
          sub: 'Preparing for shipment',
          color: 'text-[var(--text-secondary)]',
          iconColor: 'text-[var(--text-secondary)]',
          icon: <Box className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: 'var(--gray-500)',
        };

      default:
        return {
          text: status.replace(/_/g, ' '),
          sub: estDate ? `Expected ${estDate}` : 'Processing your shipment',
          color: 'text-[var(--text-secondary)]',
          iconColor: 'text-[var(--text-secondary)]',
          icon: <Clock className="w-12 h-12" strokeWidth={2.5} />,
          accentColor: 'var(--gray-500)',
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
      className={`relative h-full bg-[var(--bg-elevated)] rounded-2xl p-8 md:p-10 border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-all overflow-hidden ${className}`}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.2,
      }}
    >

      {/* Content */}
      <div className="relative z-10">
        {/* Status Badge - Minimal */}
        <motion.div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] mb-5"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: statusInfo.accentColor }}
            animate={{
              opacity: [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">
            Status
          </span>
        </motion.div>

        {/* Title - Minimal & Direct */}
        <div className="mb-8">
          <motion.h2
            className={`text-3xl md:text-4xl font-semibold ${statusInfo.color} leading-tight tracking-tight mb-2`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {statusInfo.text}
          </motion.h2>
          <motion.p
            className="text-[var(--text-secondary)] text-sm md:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {statusInfo.sub}
          </motion.p>
        </div>

        {/* Progress Section - Clean & Minimal */}
        <div>
          {/* Progress Bar */}
          <div className="relative h-2 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <motion.div
              className={`absolute inset-y-0 left-0 rounded-full`}
              style={{ backgroundColor: statusInfo.accentColor }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{
                duration: 1,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.5,
              }}
            />
          </div>

          {/* Progress Labels - Minimal */}
          <div className="flex justify-between items-center mt-3">
            <motion.span
              className="text-xs font-medium text-[var(--text-tertiary)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Order created
            </motion.span>

            <motion.span
              className="text-xs font-medium text-[var(--text-tertiary)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Delivered
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
