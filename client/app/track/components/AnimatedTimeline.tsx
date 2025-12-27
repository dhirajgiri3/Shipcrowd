'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, Clock, Package } from 'lucide-react';

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

export function AnimatedTimeline({ events, className = '' }: AnimatedTimelineProps) {
  // Calculate path for the SVG connector line
  const timelineHeight = events.length * 160; // Approximate height per event

  return (
    <motion.div
      className={`bg-white rounded-[32px] p-8 md:p-10 border border-slate-100 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.08)] ${className}`}
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 25,
        delay: 0.8,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[var(--primary-blue)] flex items-center justify-center">
          <Clock size={20} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900">Detailed Journey</h3>
          <p className="text-sm text-slate-500">Real-time event log for your shipment</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-4 md:pl-0">
        {/* Animated SVG Line */}
        <svg
          className="absolute left-[27px] md:left-[39px] top-4 hidden md:block"
          width="2"
          height={timelineHeight}
          style={{ overflow: 'visible' }}
        >
          <motion.line
            x1="1"
            y1="0"
            x2="1"
            y2={timelineHeight}
            stroke="var(--border-default)"
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 2,
              ease: 'easeInOut',
              delay: 1,
            }}
          />

          {/* Animated gradient overlay */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--primary-blue)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--border-default)" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          <motion.line
            x1="1"
            y1="0"
            x2="1"
            y2={timelineHeight * 0.3}
            stroke="url(#lineGradient)"
            strokeWidth="3"
            initial={{ y2: 0 }}
            animate={{ y2: timelineHeight * 0.3 }}
            transition={{
              duration: 2.5,
              ease: 'easeOut',
              delay: 1.2,
            }}
          />
        </svg>

        {/* Mobile line */}
        <div className="absolute left-[8px] top-4 bottom-4 w-0.5 bg-slate-100 md:hidden block" />

        {/* Events */}
        <div className="space-y-10">
          {events.map((event, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 25,
                delay: i * 0.15,
              }}
              className="relative flex gap-6 md:gap-10 group"
            >
              {/* Node Icon */}
              <motion.div
                className={`
                  relative z-10 w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[20px]
                  border-[6px] border-white shadow-xl flex items-center justify-center flex-shrink-0
                  transition-all duration-500
                  ${
                    i === 0
                      ? 'bg-[var(--primary-blue)] text-white shadow-blue-500/30 scale-110'
                      : 'bg-white text-slate-400 hover:bg-slate-50'
                  }
                `}
                whileHover={{ scale: i === 0 ? 1.15 : 1.05 }}
                whileTap={{ scale: i === 0 ? 1.05 : 0.95 }}
              >
                {i === 0 ? (
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <Truck size={24} className="md:w-8 md:h-8" strokeWidth={2} />
                  </motion.div>
                ) : event.location ? (
                  <Package size={20} className="md:w-6 md:h-6" />
                ) : (
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-slate-200" />
                )}
              </motion.div>

              {/* Event Content */}
              <div className="flex-1 py-1 md:py-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                  <motion.h4
                    className={`text-lg md:text-xl font-bold ${
                      i === 0 ? 'text-slate-900' : 'text-slate-600'
                    }`}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 + 0.2 }}
                  >
                    {event.status.replace(/_/g, ' ')}
                  </motion.h4>

                  <motion.span
                    className="text-xs md:text-sm font-mono text-slate-400 bg-slate-50 px-3 py-1 rounded-full inline-block w-fit mt-1 md:mt-0 border border-slate-100"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 + 0.3 }}
                  >
                    {new Date(event.timestamp).toLocaleString()}
                  </motion.span>
                </div>

                <motion.p
                  className="text-slate-500 leading-relaxed max-w-2xl text-base"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 + 0.4 }}
                >
                  {event.description}
                </motion.p>

                {event.location && (
                  <motion.div
                    className="flex items-center gap-2 mt-3 text-sm font-semibold text-slate-400"
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.15 + 0.5 }}
                  >
                    <MapPin size={16} className="text-slate-300" />
                    {event.location}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
