import { useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Modal Component
 * 
 * Accessible modal dialog using design system tokens.
 * Uses portal for proper stacking context.
 */

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
};

export const Modal = memo(function Modal({
    isOpen,
    onClose,
    title,
    children,
    className,
    size = 'md'
}: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.body.style.overflow = 'unset';
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className={cn(
                "fixed inset-0 z-[--z-modal] flex items-center justify-center p-4",
                "bg-black/50 backdrop-blur-sm",
                "animate-fade-in"
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Backdrop */}
            <div
                ref={overlayRef}
                className="absolute inset-0"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div
                className={cn(
                    "relative z-10 w-full",
                    "bg-[--card-background] rounded-[--radius-xl]",
                    "shadow-[--shadow-xl]",
                    "animate-slide-up",
                    sizeClasses[size],
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-[--color-gray-100]">
                    {title && (
                        <h3
                            id="modal-title"
                            className="text-lg font-semibold text-[--color-gray-900]"
                        >
                            {title}
                        </h3>
                    )}
                    <button
                        onClick={onClose}
                        className={cn(
                            "rounded-[--radius-full] p-1.5 ml-auto",
                            "text-[--color-gray-500] hover:text-[--color-gray-900]",
                            "hover:bg-[--color-gray-100]",
                            "transition-colors duration-[--transition-fast]"
                        )}
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
});
