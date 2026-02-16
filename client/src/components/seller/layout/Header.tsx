"use client";

import { useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, Truck, Plus, Wallet } from 'lucide-react';
import { ProfileDropdown } from '@/src/components/shared/ProfileDropdown';
import { ThemeToggle } from '@/src/components/shared/ThemeToggle';
import { Tooltip } from '@/src/components/ui/feedback/Tooltip';
import { cn } from '@/src/lib/utils';
import { useAuth, useLogoutRedirect } from '@/src/features/auth';
import { useWalletBalance } from '@/src/core/api/hooks/finance/useWallet';
import { sellerNavSections, sellerAccountItems, sellerSupportItems } from '@/src/components/seller/layout/Sidebar';
import { SellerSearch } from './header/SellerSearch';

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useAuth();
    const { handleLogout } = useLogoutRedirect();
    const { data: walletData, isLoading: isWalletLoading } = useWalletBalance();

    const currentUser = {
        name: user?.name || 'Seller',
        email: user?.email || '',
        role: user?.role || 'seller',
        avatar: user?.avatar,
    };

    const navItems = useMemo(
        () => [...sellerNavSections.flatMap((section) => section.items), ...sellerAccountItems, ...sellerSupportItems],
        []
    );

    const activeItem = useMemo(() => {
        if (pathname === '/seller') {
            return navItems.find((item) => item.href === '/seller');
        }

        return navItems
            .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
            .sort((a, b) => b.href.length - a.href.length)[0];
    }, [navItems, pathname]);

    const hasCompanyContext = Boolean(user?.companyId);
    const walletBalance = walletData?.balance ?? 0;

    const handleSignOut = async () => {
        await handleLogout();
    };

    const navigateTo = (href: string) => {
        router.push(href);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const walletText = !hasCompanyContext
        ? 'No Company'
        : isWalletLoading
            ? 'Loading...'
            : formatCurrency(walletBalance);

    return (
        <header className="sticky top-0 z-[var(--z-header-sticky)] flex h-16 w-full items-center justify-between bg-[var(--bg-primary)]/95 backdrop-blur border-b border-[var(--border-subtle)] px-4 lg:px-6 transition-colors duration-200 gap-4">
            <div className="flex items-center gap-3 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden h-9 w-9 rounded-lg flex items-center justify-center hover:bg-[var(--bg-hover)] transition-colors duration-150"
                    aria-label="Open seller navigation"
                >
                    <Menu className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
                <h1 className="truncate text-lg font-bold text-[var(--text-primary)] leading-tight">
                    {activeItem?.label || 'Dashboard'}
                </h1>
            </div>

            <div className="flex flex-1 items-center justify-center max-w-2xl px-4 hidden md:flex">
                <SellerSearch />
            </div>

            <div className="flex items-center gap-2">
                <div className="hidden lg:flex items-center gap-2">
                    <Tooltip content={hasCompanyContext ? 'Manage Wallet' : 'No company linked'} side="bottom">
                        <button
                            onClick={() => navigateTo('/seller/wallet')}
                            disabled={!hasCompanyContext}
                            className={cn(
                                'h-9 px-3 rounded-lg flex items-center gap-2 transition-colors duration-150 border',
                                hasCompanyContext
                                    ? 'bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border-[var(--border-subtle)] hover:border-[var(--border-default)]'
                                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] opacity-60 cursor-not-allowed'
                            )}
                        >
                            <Wallet className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[9px] uppercase font-semibold text-[var(--text-muted)] tracking-wide">Balance</span>
                                <span className="text-xs font-semibold text-[var(--text-primary)] tabular-nums">{walletText}</span>
                            </div>
                        </button>
                    </Tooltip>

                    {/* We are moving the primary "New Order" action to the FAB, effectively decluttering this area, 
                        but keeping it here as a secondary access point for desktop users is okay if desired. 
                        However, to "improve" as requested, consistency is key. 
                        Let's keep the Wallet as it shows data, but the "New Order" might be redundant with FAB.
                        I will keep it for now as a desktop convenience, but styling matches admin header refactor (cleaner). 
                    */}

                    <Tooltip content="Track Order" side="bottom">
                        <button
                            onClick={() => navigateTo('/seller/tracking')}
                            className="h-9 w-9 rounded-lg flex items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors duration-150"
                        >
                            <Truck className="h-4 w-4" />
                        </button>
                    </Tooltip>
                </div>

                <div className="h-6 w-px bg-[var(--border-subtle)] hidden lg:block mx-2" />

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <ProfileDropdown user={currentUser} onSignOut={handleSignOut} />
                </div>
            </div>
        </header>
    );
}
