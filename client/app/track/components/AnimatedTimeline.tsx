'use client';

import React from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Truck, MapPin, Clock, Package, CheckCircle, AlertCircle } from 'lucide-react';

interface TimelineEvent {
  status: string;
  timestamp: string;
  location?: string;
  description?: string;
}

interface AnimatedTimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const getStatusIcon = (status: string, isActive: boolean) => {
  const normalizedStatus = status.toUpperCase();
  const iconClass = isActive ? 'w-7 h-7' : 'w-5 h-5';

  switch (normalizedStatus) {
    case 'OUT_FOR_DELIVERY':
      return <Truck className={iconClass} strokeWidth={2.5} />;
    case 'DELIVERED':
      return <CheckCircle className={iconClass} strokeWidth={2.5} />;
    case 'IN_TRANSIT':
    case 'ARRIVED_AT_DESTINATION':
      return <Package className={iconClass} strokeWidth={2.5} />;
    case 'PICKED_UP':
      return <MapPin className={iconClass} strokeWidth={2.5} />;
    default:
      return <Clock className={iconClass} strokeWidth={2.5} />;
  }
};

const getStatusColor = (status: string) => {
  const normalizedStatus = status.toUpperCase();
  switch (normalizedStatus) {
    case 'DELIVERED':
      return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        glow: 'shadow-emerald-500/30',
      };
    case 'OUT_FOR_DELIVERY':
      return {
        bg: 'bg-blue-600',
        text: 'text-blue-700',
        border: 'border-blue-200',
        glow: 'shadow-blue-600/30',
      };
    case 'IN_TRANSIT':
    case 'ARRIVED_AT_DESTINATION':
      return {
        bg: 'bg-indigo-500',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        glow: 'shadow-indigo-500/30',
      };
    case 'PICKED_UP':
      return {
        bg: 'bg-amber-500',
        text: 'text-amber-700',
        border: 'border-amber-200',
        glow: 'shadow-amber-500/30',
      };
    default:
      return {
        bg: 'bg-slate-400',
        text: 'text-slate-700',
        border: 'border-slate-200',
        glow: 'shadow-slate-400/30',
      };
  }
};

export function AnimatedTimeline({ events, className = '' }: AnimatedTimelineProps) {
  return (
    <motion.div
      className={`bg-white rounded-3xl p-8 md:p-12 border border-slate-100 shadow-2xl ${className}`}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 25,
        delay: 0.6,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <motion.div
            className="p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 shadow-lg"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: 'spring',
              stiffness: 200,
              damping: 15,
              delay: 0.7,
            }}
          >
            <Clock size={24} strokeWidth={2.5} />
          </motion.div>
          <div>
            <motion.h3
              className="text-2xl font-black text-slate-900"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              Delivery Journey
            </motion.h3>
            <motion.p
              className="text-sm text-slate-500 font-medium"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
            >
              {events.length} milestone{events.length !== 1 ? 's' : ''} tracked
            </motion.p>
          </div>
        </div>

        {/* Status Badge */}
        <motion.div
          className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
            delay: 1,
          }}
        >
          <span className="text-sm font-bold text-blue-700">Real-time Updates</span>
        </motion.div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-[44px] md:left-[52px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-200 to-transparent" />

        {/* Animated Progress Line */}
        <motion.div
          className="absolute left-[44px] md:left-[52px] top-0 w-0.5 bg-gradient-to-b from-blue-600 to-indigo-600"
          initial={{ height: 0 }}
          animate={{ height: '40%' }}
          transition={{
            duration: 2,
            ease: [0.4, 0, 0.2, 1],
            delay: 1.2,
          }}
        />

        {/* Events */}
        <div className="space-y-8">
          {events.map((event, i) => {
            const isActive = i === 0;
            const colors = getStatusColor(event.status);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 25,
                  delay: i * 0.1 + 1.3,
                }}
                className="relative flex gap-6 md:gap-10 group"
              >
                {/* Timeline Node */}
                <motion.div
                  className={`
                    relative z-10 flex-shrink-0 flex items-center justify-center
                    w-20 h-20 md:w-24 md:h-24 rounded-2xl
                    ${isActive ? `${colors.bg} text-white shadow-2xl ${colors.glow}` : 'bg-white text-slate-400 border-2 border-slate-100'}
                    transition-all duration-500
                  `}
                  whileHover={{ scale: isActive ? 1.1 : 1.05, rotate: isActive ? 5 : 0 }}
                  whileTap={{ scale: 0.95 }}
                  animate={
                    isActive
                      ? {
                          scale: [1, 1.05, 1],
                          boxShadow: [
                            '0 20px 40px -10px rgba(0,0,0,0.1)',
                            '0 25px 50px -10px rgba(37,99,235,0.3)',
                            '0 20px 40px -10px rgba(0,0,0,0.1)',
                          ],
                        }
                      : {}
                  }
                  transition={
                    isActive
                      ? {
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }
                      : {}
                  }
                >
                  {getStatusIcon(event.status, isActive)}

                  {/* Active Pulse */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-2xl bg-blue-600/20"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeOut',
                      }}
                    />
                  )}
                </motion.div>

                {/* Event Content */}
                <div className="flex-1 py-2 md:py-4">
                  {/* Title and Time */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                    <motion.h4
                      className={`text-xl md:text-2xl font-black ${
                        isActive ? colors.text : 'text-slate-600'
                      }`}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 + 1.4 }}
                    >
                      {event.status.replace(/_/g, ' ')}
                    </motion.h4>

                    <motion.div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 w-fit"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                        delay: i * 0.1 + 1.5,
                      }}
                    >
                      <Clock size={14} className="text-slate-400" />
                      <span className="text-sm font-mono text-slate-600">
                        {new Date(event.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </motion.div>
                  </div>

                  {/* Description */}
                  <motion.p
                    className="text-slate-600 leading-relaxed text-base md:text-lg max-w-2xl"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 + 1.6 }}
                  >
                    {event.description}
                  </motion.p>

                  {/* Location */}
                  {event.location && (
                    <motion.div
                      className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 w-fit"
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{
                        type: 'spring',
                        stiffness: 300,
                        damping: 20,
                        delay: i * 0.1 + 1.7,
                      }}
                    >
                      <MapPin size={16} className="text-blue-600" />
                      <span className="text-sm font-bold text-blue-700">{event.location}</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Footer Badge */}
      <motion.div
        className="mt-10 pt-8 border-t border-slate-100"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium">Live tracking active</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
