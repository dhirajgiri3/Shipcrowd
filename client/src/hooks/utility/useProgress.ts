import { useState, useCallback, useEffect } from 'react';

/**
 * useProgress Hook - Progress tracking for operations
 * 
 * Manages progress state for long-running operations like file uploads,
 * batch processing, etc.
 * 
 * @param options Configuration options
 * @param options.onComplete - Callback triggered when progress reaches 100%
 * @param options.initialProgress - Starting progress value. Default: 0
 * 
 * @returns Progress state controls
 * 
 * @example
 * const { progress, setProgress, isComplete, reset } = useProgress({
 *   onComplete: () => {
 *     toast.success('Upload complete!');
 *   },
 * });
 * 
 * async function uploadFile(file: File) {
 *   const formData = new FormData();
 *   formData.append('file', file);
 *   
 *   await fetch('/api/upload', {
 *     method: 'POST',
 *     body: formData,
 *     onUploadProgress: (progressEvent) => {
 *       const percentCompleted = Math.round(
 *         (progressEvent.loaded * 100) / progressEvent.total
 *       );
 *       setProgress(percentCompleted);
 *     },
 *   });
 * }
 * 
 * return (
 *   <Loader variant="progress" progress={progress} message={`${progress}% uploaded`} />
 * );
 */

export interface UseProgressOptions {
    /** Callback when progress reaches 100% */
    onComplete?: () => void;
    /** Starting progress value (0-100) */
    initialProgress?: number;
}

export interface UseProgressReturn {
    /** Current progress (0-100) */
    progress: number;
    /** Set progress value */
    setProgress: (value: number) => void;
    /** Increment progress by amount */
    increment: (amount: number) => void;
    /** Whether progress is complete (100%) */
    isComplete: boolean;
    /** Reset progress to initial value */
    reset: () => void;
}

export function useProgress(options: UseProgressOptions = {}): UseProgressReturn {
    const { onComplete, initialProgress = 0 } = options;

    const [progress, setProgressState] = useState(
        Math.min(100, Math.max(0, initialProgress))
    );
    const [hasTriggeredComplete, setHasTriggeredComplete] = useState(false);

    const setProgress = useCallback((value: number) => {
        const clampedValue = Math.min(100, Math.max(0, value));
        setProgressState(clampedValue);
        setHasTriggeredComplete(false);
    }, []);

    const increment = useCallback((amount: number) => {
        setProgressState((prev) => {
            const newValue = Math.min(100, prev + amount);
            if (newValue !== 100) {
                setHasTriggeredComplete(false);
            }
            return newValue;
        });
    }, []);

    const reset = useCallback(() => {
        setProgressState(Math.min(100, Math.max(0, initialProgress)));
        setHasTriggeredComplete(false);
    }, [initialProgress]);

    // Trigger onComplete callback when reaching 100%
    useEffect(() => {
        if (progress === 100 && !hasTriggeredComplete && onComplete) {
            setHasTriggeredComplete(true);
            onComplete();
        }
    }, [progress, hasTriggeredComplete, onComplete]);

    return {
        progress,
        setProgress,
        increment,
        isComplete: progress === 100,
        reset,
    };
}
