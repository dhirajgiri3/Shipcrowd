'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, Mail } from 'lucide-react';
import { Loader } from '@/src/components/ui/feedback/Loader';
import { useVerifyEmail } from '@/src/core/api/hooks/auth/useVerifyEmail';

function VerifyEmailContent() {
  const {
    status,
    message,
    countdown,
    isResending,
    canResend,
    redirectDestination,
    handleResendVerification,
    email
  } = useVerifyEmail();

  return (
    <motion.div
      className="w-full max-w-md bg-[var(--bg-elevated)] rounded-2xl shadow-[var(--shadow-lg)] p-8 text-center border border-[var(--border-default)]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Link href="/" className="inline-block mb-8">
        <img src="https://res.cloudinary.com/divbobkmd/image/upload/v1769869575/Shipcrowd-logo_utcmu0.png" alt="Shipcrowd" className="h-8 w-auto mx-auto rounded-full" />
      </Link>

      {status === "loading" && (
        <div className="space-y-4">
          <Loader variant="spinner" size="lg" />
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Verifying your email...</h1>
          <p className="text-[var(--text-secondary)]">Please wait while we verify your email address.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <motion.div
            className="w-16 h-16 mx-auto bg-[var(--success-bg)] rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            <CheckCircle2 className="w-8 h-8 text-[var(--success)]" />
          </motion.div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Email Verified!</h1>
          <p className="text-[var(--text-secondary)]">{message}</p>
          <p className="text-sm text-[var(--text-tertiary)] flex items-center justify-center gap-2">
            <Clock className="w-4 h-4" />
            Redirecting to {redirectDestination} in {countdown} seconds...
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => window.location.href = redirectDestination}
              className="flex-1 py-3 bg-[var(--primary-blue)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--primary-blue-deep)] transition-colors font-medium"
            >
              Continue Now
            </button>
            <Link
              href="/login"
              className="flex-1 py-3 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] rounded-[var(--radius-lg)] hover:bg-[var(--bg-hover)] transition-colors font-medium text-center"
            >
              Go to Login
            </Link>
          </div>
        </div>
      )}

      {status === "already_verified" && (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-[var(--primary-blue)]/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[var(--primary-blue)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Already Verified</h1>
          <p className="text-[var(--text-secondary)]">{message}</p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center w-full py-3 mt-4 bg-[var(--primary-blue)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--primary-blue-deep)] transition-colors font-medium"
          >
            Continue to Login
          </Link>
        </div>
      )}

      {status === "expired" && (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-[var(--warning-bg)] rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-[var(--warning)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Link Expired</h1>
          <p className="text-[var(--text-secondary)]">{message}</p>
          <div className="space-y-2 mt-4">
            <button
              onClick={handleResendVerification}
              disabled={!canResend || isResending || !email}
              className="inline-flex items-center justify-center w-full py-3 bg-[var(--primary-blue)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--primary-blue-deep)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>Resending...</>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </button>
            {!email && (
              <p className="text-xs text-[var(--text-tertiary)]">
                Email required to resend verification. Check your previous email for the verification link.
              </p>
            )}
            {!canResend && email && (
              <p className="text-xs text-[var(--text-tertiary)]">
                Please wait 60 seconds before requesting another email
              </p>
            )}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-[var(--error-bg)] rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-[var(--error)]" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Verification Failed</h1>
          <p className="text-[var(--text-secondary)]">{message}</p>
          <div className="space-y-2 mt-4">
            <button
              onClick={handleResendVerification}
              disabled={!canResend || isResending || !email}
              className="inline-flex items-center justify-center w-full py-3 bg-[var(--primary-blue)] text-white rounded-[var(--radius-lg)] hover:bg-[var(--primary-blue-deep)] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <>Resending...</>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </button>
            <Link
              href="/login"
              className="inline-block w-full py-3 text-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      )}
    </motion.div>
  )
}

export function VerifyEmailClient() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <Suspense fallback={
        <div className="w-full max-w-md bg-[var(--bg-elevated)] rounded-2xl shadow-lg p-8 text-center">
          <Loader variant="spinner" size="lg" />
          <p className="mt-4 text-[var(--text-secondary)]">Loading...</p>
        </div>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}
