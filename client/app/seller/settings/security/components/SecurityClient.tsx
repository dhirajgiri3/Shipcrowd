"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/src/features/auth';
import { authApi } from '@/src/core/api/clients/auth/authApi';
import { Button, Input, Card } from '@/src/components/ui';
import { ConfirmDialog } from '@/src/components/ui/feedback/ConfirmDialog';
import { showSuccessToast, showErrorToast, handleApiError } from '@/src/lib/error';
import { Shield, Lock, Smartphone, AlertTriangle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
// import { formatDistanceToNow } from 'date-fns';

export function SecurityClient() {
    const { user, changePassword, sessions, loadSessions, revokeSession, revokeAllSessions } = useAuth();

    // Password change state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
    const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState<any>(null);

    // Session management state
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);
    const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
    const [isRevokingAll, setIsRevokingAll] = useState(false);

    // Load sessions on mount
    useEffect(() => {
        handleLoadSessions();
    }, []);

    // Check password strength as user types
    useEffect(() => {
        if (newPassword.length >= 8) {
            const timer = setTimeout(async () => {
                try {
                    const strength = await authApi.checkPasswordStrength(newPassword, user?.email, user?.name);
                    setPasswordStrength(strength);
                } catch (error) {
                    console.error('Password strength check failed:', error);
                }
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setPasswordStrength(null);
        }
    }, [newPassword, user]);

    const handleLoadSessions = async () => {
        setIsLoadingSessions(true);
        try {
            await loadSessions();
        } catch (error) {
            handleApiError(error, 'Failed to load sessions');
        } finally {
            setIsLoadingSessions(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (newPassword !== confirmPassword) {
            showErrorToast('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            showErrorToast('Password must be at least 8 characters');
            return;
        }

        if (passwordStrength && passwordStrength.score < 2) {
            showErrorToast('Password is too weak');
            return;
        }

        setIsChangingPassword(true);
        try {
            const result = await changePassword(currentPassword, newPassword);

            if (result.success) {
                showSuccessToast(result.message || 'Password changed successfully');
                // Clear form
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setPasswordStrength(null);
            } else {
                const errorMsg =
                    typeof result.error === 'string'
                        ? result.error
                        : result.error?.message || 'Failed to change password';
                showErrorToast(errorMsg);
            }
        } catch (error: any) {
            handleApiError(error, 'Failed to change password');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        setRevokeTarget(sessionId);
    };

    const handleRevokeAllSessions = async () => {
        setShowRevokeAllDialog(true);
    };

    const getDeviceIcon = (type: string) => {
        switch (type) {
            case 'mobile':
                return <Smartphone className="h-5 w-5" />;
            case 'tablet':
                return <Smartphone className="h-5 w-5" />;
            default:
                return <Shield className="h-5 w-5" />;
        }
    };

    const getPasswordStrengthColor = (score: number) => {
        switch (score) {
            case 0:
            case 1:
                return 'text-[var(--error)]';
            case 2:
                return 'text-[var(--warning)]';
            case 3:
                return 'text-[var(--warning)]';
            case 4:
                return 'text-[var(--success)]';
            default:
                return 'text-[var(--text-muted)]';
        }
    };

    const getPasswordStrengthLabel = (strength: string) => {
        switch (strength) {
            case 'weak':
                return 'Weak';
            case 'fair':
                return 'Fair';
            case 'good':
                return 'Good';
            case 'strong':
                return 'Strong';
            default:
                return '';
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">Security Settings</h1>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Manage your password, active sessions, and security preferences
                </p>
            </div>

            {/* Password Management */}
            <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-[var(--primary-blue-soft)] rounded-lg">
                        <Lock className="h-5 w-5 text-[var(--primary-blue)]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Change Password</h2>
                        <p className="text-sm text-[var(--text-secondary)]">
                            Update your password to keep your account secure
                        </p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                    {/* Current Password */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Current Password
                        </label>
                        <div className="relative">
                            <Input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter your current password"
                                required
                                disabled={isChangingPassword}
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <Input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter your new password"
                                required
                                disabled={isChangingPassword}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {/* Password Strength Indicator */}
                        {passwordStrength && (
                            <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all ${passwordStrength.score === 0 ? 'bg-[var(--error)] w-1/4' :
                                                passwordStrength.score === 1 ? 'bg-[var(--error)] w-2/4' :
                                                    passwordStrength.score === 2 ? 'bg-[var(--warning)] w-3/4' :
                                                        passwordStrength.score === 3 ? 'bg-[var(--warning)] w-3/4' :
                                                            'bg-[var(--success)] w-full'
                                                }`}
                                        />
                                    </div>
                                    <span className={`text-xs font-medium ${getPasswordStrengthColor(passwordStrength.score)}`}>
                                        {getPasswordStrengthLabel(passwordStrength.strength)}
                                    </span>
                                </div>

                                {passwordStrength.feedback.warning && (
                                    <p className="text-xs text-[var(--warning)] flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        {passwordStrength.feedback.warning}
                                    </p>
                                )}

                                {passwordStrength.feedback.suggestions.length > 0 && (
                                    <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                                        {passwordStrength.feedback.suggestions.map((suggestion: string, index: number) => (
                                            <li key={index}>• {suggestion}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your new password"
                                required
                                disabled={isChangingPassword}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        {newPassword && confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-xs text-[var(--error)] mt-1">Passwords do not match</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                        isLoading={isChangingPassword}
                        className="w-full sm:w-auto"
                    >
                        Change Password
                    </Button>
                </form>
            </Card>

            {/* Active Sessions */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-[var(--success-bg)] rounded-lg">
                            <Smartphone className="h-5 w-5 text-[var(--success)]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Active Sessions</h2>
                            <p className="text-sm text-[var(--text-secondary)]">
                                Manage where you're logged in
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLoadSessions}
                            disabled={isLoadingSessions}
                        >
                            Refresh
                        </Button>
                        {sessions.length > 1 && (
                            <Button
                                variant="danger"
                                size="sm"
                                onClick={handleRevokeAllSessions}
                                disabled={isRevokingAll}
                                isLoading={isRevokingAll}
                            >
                                Sign Out All Devices
                            </Button>
                        )}
                    </div>
                </div>

                {isLoadingSessions ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                        Loading sessions...
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                        No active sessions found
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((session) => (
                            <div
                                key={session._id}
                                className="flex items-center justify-between p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-primary)]"
                            >
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="text-[var(--text-secondary)]">
                                        {getDeviceIcon(session.deviceInfo.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium text-[var(--text-primary)] truncate">
                                                {session.deviceInfo.browser || 'Unknown Browser'} on {session.deviceInfo.os || 'Unknown OS'}
                                            </p>
                                            {/* Current session indicator would go here */}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-[var(--text-secondary)]">
                                            <span>{session.ip}</span>
                                            {session.location?.city && (
                                                <span>• {session.location.city}, {session.location.country}</span>
                                            )}
                                            <span>• Last active {new Date(session.lastActive).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeSession(session._id)}
                                    disabled={revokingSessionId === session._id}
                                    isLoading={revokingSessionId === session._id}
                                    className="text-[var(--error)] hover:text-[var(--error)] hover:bg-[var(--error-bg)]"
                                >
                                    Revoke
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Security Info */}
            <Card className="p-6 bg-[var(--primary-blue-soft)] border-[var(--primary-blue)]/20">
                <div className="flex gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[var(--primary-blue)] flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                            Security Best Practices
                        </p>
                        <ul className="text-xs text-[var(--text-secondary)] space-y-1">
                            <li>• Use a strong, unique password that you don't use elsewhere</li>
                            <li>• Regularly review your active sessions and revoke suspicious ones</li>
                            <li>• Never share your password with anyone</li>
                            <li>• Enable two-factor authentication for extra security (coming soon)</li>
                        </ul>
                    </div>
                </div>
            </Card>

            <ConfirmDialog
                open={!!revokeTarget}
                title="Revoke session"
                description="Are you sure you want to revoke this session? You will be logged out from that device."
                confirmText="Revoke"
                confirmVariant="danger"
                onCancel={() => setRevokeTarget(null)}
                onConfirm={async () => {
                    if (!revokeTarget) return;
                    setRevokingSessionId(revokeTarget);
                    try {
                        const result = await revokeSession(revokeTarget);
                        if (result.success) {
                            showSuccessToast(result.message || 'Session revoked successfully');
                        }
                    } finally {
                        setRevokingSessionId(null);
                        setRevokeTarget(null);
                    }
                }}
            />

            <ConfirmDialog
                open={showRevokeAllDialog}
                title="Revoke all other sessions"
                description="Are you sure you want to sign out from all other devices? This will revoke all sessions except your current one."
                confirmText="Revoke all"
                confirmVariant="danger"
                onCancel={() => setShowRevokeAllDialog(false)}
                onConfirm={async () => {
                    setIsRevokingAll(true);
                    try {
                        const result = await revokeAllSessions();
                        if (result.success) {
                            showSuccessToast(result.message || `Revoked ${result.revokedCount} sessions`);
                        }
                    } finally {
                        setIsRevokingAll(false);
                        setShowRevokeAllDialog(false);
                    }
                }}
            />
        </div>
    );
}
