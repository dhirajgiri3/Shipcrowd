import { cn } from '@/src/lib/utils';

interface PillTab {
    key: string;
    label: string;
}

interface PillTabsProps<T extends PillTab> {
    tabs: readonly T[];
    activeTab: T['key'];
    onTabChange: (key: T['key']) => void;
    className?: string;
}

function PillTabs<T extends PillTab>({ tabs, activeTab, onTabChange, className }: PillTabsProps<T>) {
    return (
        <div className={cn(
            'flex p-1.5 rounded-xl bg-[var(--bg-secondary)] w-fit border border-[var(--border-subtle)] overflow-x-auto',
            className
        )}>
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={() => onTabChange(tab.key)}
                    className={cn(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                        activeTab === tab.key
                            ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                    )}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export { PillTabs };
export type { PillTab, PillTabsProps };
