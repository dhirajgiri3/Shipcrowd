'use client';

import { motion } from 'framer-motion';
import { Truck, MapPin, Clock, Package, CheckCircle } from 'lucide-react';

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
        bg: 'bg-[var(--success)]',
        text: 'text-[var(--text-success)]',
        border: 'border-[var(--success-border)]',
        glow: 'shadow-[0_0_20px_var(--success-bg)]',
      };
    case 'OUT_FOR_DELIVERY':
      return {
        bg: 'bg-[var(--primary-blue)]',
        text: 'text-[var(--primary-blue)]',
        border: 'border-[var(--primary-blue-soft)]',
        glow: 'shadow-[var(--shadow-brand)]',
      };
    case 'IN_TRANSIT':
    case 'ARRIVED_AT_DESTINATION':
      return {
        bg: 'bg-[var(--primary-blue)]',
        text: 'text-[var(--primary-blue)]',
        border: 'border-[var(--primary-blue-soft)]',
        glow: 'shadow-[var(--shadow-brand-sm)]',
      };
    case 'PICKED_UP':
      return {
        bg: 'bg-[var(--warning)]',
        text: 'text-[var(--text-warning)]',
        border: 'border-[var(--warning-border)]',
        glow: 'shadow-[0_0_20px_var(--warning-bg)]',
      };
    default:
      return {
        bg: 'bg-[var(--text-muted)]',
        text: 'text-[var(--text-secondary)]',
        border: 'border-[var(--border-default)]',
        glow: 'shadow-[var(--shadow-sm)]',
      };
  }
};

export function AnimatedTimeline({ events, className = '' }: AnimatedTimelineProps) {
  return (
    <motion.div
      className={`bg-[var(--bg-elevated)] rounded-3xl p-6 md:p-10 border border-[var(--border-subtle)] shadow-[var(--shadow-sm)] ${className}`}
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 25,
        delay: 0.6,
      }}
    >
      {/* Header - Minimal */}
      <div className="flex items-center justify-between mb-8">
        <motion.h3
          className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          Tracking history
        </motion.h3>
        <motion.span
          className="text-sm text-[var(--text-tertiary)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {events.length} update{events.length !== 1 ? 's' : ''}
        </motion.span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-[44px] md:left-[52px] top-0 bottom-0 w-0.5 bg-[var(--border-subtle)]" />

        {/* Animated Progress Line */}
        <motion.div
          className="absolute left-[44px] md:left-[52px] top-0 w-0.5 bg-[var(--primary-blue)]"
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
                    flex items-center justify-center
                    w-20 h-20 md:w-24 md:h-24 rounded-2xl
                    ${isActive ? `${colors.bg} text-white shadow-2xl ${colors.glow}` : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-2 border-[var(--border-subtle)]'}
                    transition-all duration-500
                  `}
                  whileHover={{ scale: isActive ? 1.1 : 1.05, rotate: isActive ? 5 : 0 }}
                  whileTap={{ scale: 0.95 }}
                  animate={
                    isActive
                      ? {
                        scale: [1, 1.03, 1],
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
                      className="absolute inset-0 rounded-2xl bg-[var(--primary-blue)]/10"
                      animate={{
                        scale: [1, 1.15, 1],
                        opacity: [0.3, 0, 0.3],
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
                      className={`text-xl md:text-2xl font-black ${isActive ? colors.text : 'text-[var(--text-secondary)]'
                        }`}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 + 1.4 }}
                    >
                      {event.status.replace(/_/g, ' ')}
                    </motion.h4>

                    <motion.div
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] w-fit"
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
                      <Clock size={14} className="text-[var(--text-tertiary)]" />
                      <span className="text-sm font-mono text-[var(--text-secondary)]">
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
                    className="text-[var(--text-secondary)] leading-relaxed text-base md:text-lg max-w-2xl"
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
                      className="flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-[var(--primary-blue-soft)]/30 border border-[var(--primary-blue-soft)] w-fit"
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
                      <MapPin size={16} className="text-[var(--primary-blue)]" />
                      <span className="text-sm font-bold text-[var(--primary-blue)]">{event.location}</span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

    </motion.div>
  );
}
