/**
 * Shared Wizard Layout Component
 * 
 * Reusable multi-step wizard container with progress indicator,
 * navigation, and step validation.
 */

'use client';

import React from 'react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface WizardStep {
    id: number;
    title: string;
    description: string;
}

interface WizardLayoutProps {
    steps: WizardStep[];
    currentStep: number;
    onStepChange: (step: number) => void;
    children: React.ReactNode;
    onClose?: () => void;
    title: string;
    subtitle?: string;

    // Navigation
    canGoBack?: boolean;
    canGoNext?: boolean;
    onBack?: () => void;
    onNext?: () => void;
    onSubmit?: () => void;

    // Final step
    isFinalStep?: boolean;
    isSubmitting?: boolean;
    submitLabel?: string;
}

export function WizardLayout({
    steps,
    currentStep,
    onStepChange,
    children,
    onClose,
    title,
    subtitle,
    canGoBack = true,
    canGoNext = true,
    onBack,
    onNext,
    onSubmit,
    isFinalStep = false,
    isSubmitting = false,
    submitLabel = 'Complete Setup',
}: WizardLayoutProps) {
    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    const handleNext = () => {
        if (isFinalStep && onSubmit) {
            onSubmit();
        } else if (onNext) {
            onNext();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {title}
                            </h2>
                            {subtitle && (
                                <p className="text-gray-600 dark:text-gray-400 mt-1">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                {/* Step Circle */}
                                <div className="flex flex-col items-center">
                                    <button
                                        onClick={() => onStepChange(step.id)}
                                        disabled={index > currentStepIndex}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${currentStep > step.id
                                                ? 'bg-green-500 text-white'
                                                : currentStep === step.id
                                                    ? 'bg-primary-600 text-white ring-4 ring-primary-100 dark:ring-primary-900/30'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                            } disabled:cursor-not-allowed`}
                                    >
                                        {currentStep > step.id ? (
                                            <Check className="w-5 h-5" />
                                        ) : (
                                            step.id
                                        )}
                                    </button>
                                    <div className="mt-2 text-center max-w-[120px]">
                                        <p className={`text-xs font-medium ${currentStep >= step.id
                                                ? 'text-gray-900 dark:text-white'
                                                : 'text-gray-400'
                                            }`}>
                                            {step.title}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Connector */}
                                {index < steps.length - 1 && (
                                    <div className={`flex-1 h-1 mx-2 mt-[-40px] rounded transition-colors ${currentStep > step.id
                                            ? 'bg-green-500'
                                            : 'bg-gray-200 dark:bg-gray-700'
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Step Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>

                {/* Footer Navigation */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div>
                        {canGoBack && onBack && (
                            <button
                                onClick={onBack}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Step {currentStepIndex + 1} of {steps.length}
                        </span>

                        {isFinalStep ? (
                            <button
                                onClick={handleNext}
                                disabled={!canGoNext || isSubmitting}
                                className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        {submitLabel}
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                disabled={!canGoNext}
                                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WizardLayout;
