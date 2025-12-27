import { toast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'default';

interface ToastOptions {
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export const useToast = () => {
    const addToast = (message: string, type: ToastType = 'default', options?: ToastOptions) => {
        switch (type) {
            case 'success':
                toast.success(message, { description: options?.description });
                break;
            case 'error':
                toast.error(message, { description: options?.description });
                break;
            case 'info':
                toast.info(message, { description: options?.description });
                break;
            case 'warning':
                toast.warning(message, { description: options?.description });
                break;
            default:
                toast(message, { description: options?.description });
        }
    };

    return { addToast, toast };
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
};
