import mongoose from 'mongoose';
import { OnboardingProgress, Achievement } from '../../../../infrastructure/database/mongoose/models';
import logger from '../../../../shared/logger/winston.logger';

export class OnboardingProgressService {
    /**
     * Get current progress for a company
     * Creates initial record if it doesn't exist
     */
    async getProgress(companyId: string, userId: string) {
        try {
            let progress = await OnboardingProgress.findOne({ companyId });

            if (!progress) {
                progress = new OnboardingProgress({
                    companyId,
                    userId,
                    steps: {
                        emailVerified: { completed: false },
                        kycSubmitted: { completed: false },
                        kycApproved: { completed: false },
                        // New steps
                        billingSetup: { completed: false },
                        courierPreferencesSet: { completed: false },
                        warehouseCreated: { completed: false },
                        testShipmentCreated: { completed: false },

                        // ✅ FEATURE 6.1: Missing Critical Steps
                        returnAddressConfigured: { completed: false },
                        packagingPreferencesSet: { completed: false },
                        rateCardAgreed: { completed: false },
                        platformTourCompleted: { completed: false },

                        // End new steps
                        firstOrderCreated: { completed: false },
                        walletRecharged: { completed: false },
                        demoDataCleared: { completed: false }
                    }
                });
                await progress.save();
            }

            // Check if we need to sync with Achievement system (e.g. create achievement record)
            await this.ensureAchievementRecord(companyId, userId);

            return progress;
        } catch (error) {
            logger.error('Error fetching onboarding progress:', error);
            throw error;
        }
    }

    /**
     * Update a specific step status
     * Also unlocks relevant badges
     */
    async updateStep(companyId: string, stepKey: string, userId?: string) {
        try {
            const progress = await OnboardingProgress.findOne({ companyId });

            if (!progress) {
                logger.warn(`Cannot update step ${stepKey}: Progress record not found for company ${companyId}`);
                return null;
            }

            // If already completed, do nothing
            // @ts-ignore
            if (progress.steps[stepKey]?.completed) {
                return progress;
            }

            // Update step
            // @ts-ignore
            progress.steps[stepKey] = {
                completed: true,
                completedAt: new Date()
            };

            await progress.save();

            // Trigger achievement unlock if userId is provided
            if (userId) {
                await this.checkStepAchievements(companyId, userId, stepKey);
            }

            return progress;
        } catch (error) {
            logger.error(`Error updating onboarding step ${stepKey}:`, error);
            throw error;
        }
    }

    /**
     * Skip an optional step
     */
    async skipStep(companyId: string, stepKey: string) {
        // Only allow skipping optional steps
        const optionalSteps = ['walletRecharged', 'demoDataCleared', 'platformTourCompleted'];

        if (!optionalSteps.includes(stepKey)) {
            throw new Error(`Step ${stepKey} cannot be skipped`);
        }

        try {
            const progress = await OnboardingProgress.findOne({ companyId });
            if (!progress) return null;

            // @ts-ignore
            progress.steps[stepKey] = {
                completed: true, // Mark as completed so progress bar fills
                skipped: true,
                completedAt: new Date()
            };

            await progress.save();
            return progress;
        } catch (error) {
            logger.error(`Error skipping step ${stepKey}:`, error);
            throw error;
        }
    }

    /**
     * Get recommended next action
     */
    async getNextAction(companyId: string) {
        const progress = await OnboardingProgress.findOne({ companyId });
        if (!progress) return null;

        const steps = progress.steps;

        if (!steps.emailVerified.completed) {
            return {
                action: 'verify_email',
                title: 'Verify Your Email',
                description: 'Check your inbox to verify your account security.',
                cta: 'Resend Email',
                url: '/verify-email'
            };
        }

        if (!steps.kycSubmitted.completed) {
            return {
                action: 'submit_kyc',
                title: 'Submit KYC Documents',
                description: 'Required to start shipping. Takes about 5 minutes.',
                cta: 'Start KYC',
                url: '/companies/kyc'
            };
        }

        if (!steps.kycApproved.completed) {
            // Check for timeout/delay (48 hours)
            const kycSubmittedAt = steps.kycSubmitted.completedAt;
            const isDelayed = kycSubmittedAt && (Date.now() - new Date(kycSubmittedAt).getTime() > 48 * 60 * 60 * 1000);

            if (isDelayed) {
                return {
                    action: 'kyc_delayed',
                    title: 'KYC Review Delayed',
                    description: 'We apologize for the delay. Our team has been notified and is prioritizing your review.',
                    cta: 'Contact Support',
                    url: '/support?subject=KYC%20Delay',
                    isPending: true,
                    isDelayed: true
                };
            }

            return {
                action: 'wait_kyc',
                title: 'KYC Verification Pending',
                description: 'Our team is reviewing your documents. Usually takes 24-48 hours.',
                cta: 'Check Status',
                url: '/companies/kyc/status',
                isPending: true
            };
        }

        // ✅ FEATURE 6: New Onboarding Steps Logic
        if (!steps.billingSetup?.completed) {
            return {
                action: 'setup_billing',
                title: 'Setup Billing',
                description: 'Add your billing details to enable payments.',
                cta: 'Setup Billing',
                url: '/settings/billing'
            };
        }

        // ADDED: Rate Card
        if (!steps.rateCardAgreed?.completed) {
            return {
                action: 'agree_rate_card',
                title: 'Accept Rate Card',
                description: 'Review and accept our shipping rates.',
                cta: 'View Rates',
                url: '/settings/rates'
            };
        }

        // ADDED: Return Address
        if (!steps.returnAddressConfigured?.completed) {
            return {
                action: 'setup_returns',
                title: 'Setup Return Address',
                description: 'Where should undelivered shipments go?',
                cta: 'Add Address',
                url: '/settings/returns'
            };
        }

        if (!steps.courierPreferencesSet?.completed) {
            return {
                action: 'setup_courier',
                title: 'Configure Couriers',
                description: 'Select your preferred courier partners.',
                cta: 'Configure',
                url: '/settings/courier-preferences'
            };
        }

        // ADDED: Packaging
        if (!steps.packagingPreferencesSet?.completed) {
            return {
                action: 'setup_packaging',
                title: 'Packaging Preferences',
                description: 'Set your default box sizes and preferences.',
                cta: 'Setup Packaging',
                url: '/settings/packaging'
            };
        }

        if (!steps.warehouseCreated.completed) {
            return {
                action: 'create_warehouse',
                title: 'Add Pickup Location',
                description: 'Tell us where you will be shipping from.',
                cta: 'Add Warehouse',
                url: '/warehouses/new'
            };
        }

        // ADDED: Tour
        if (!steps.platformTourCompleted?.completed) {
            return {
                action: 'take_tour',
                title: 'Take Platform Tour',
                description: 'Learn how to use the platform in 2 minutes.',
                cta: 'Start Tour',
                url: '/tour/start'
            };
        }

        if (!steps.testShipmentCreated?.completed) {
            return {
                action: 'create_test_shipment',
                title: 'Create Test Shipment',
                description: 'Try creating a dummy shipment in Sandbox mode.',
                cta: 'Create Test Shipment',
                url: '/shipments/create?mode=test'
            };
        }
        // End new steps logic

        if (!steps.firstOrderCreated.completed) {
            return {
                action: 'create_order',
                title: 'Ship Your First Order',
                description: 'Create a manual order or connect your store.',
                cta: 'Create Order',
                url: '/orders/create'
            };
        }

        return {
            action: 'complete',
            title: 'Onboarding Complete!',
            description: 'You are all set to scale your business.',
            cta: 'Go to Dashboard',
            url: '/dashboard'
        };
    }

    // Private helpers

    private async ensureAchievementRecord(companyId: string, userId: string) {
        const exists = await Achievement.findOne({ companyId, userId });
        if (!exists) {
            await Achievement.create({
                companyId,
                userId,
                badges: [],
                totalPoints: 0,
                level: 1
            });
        }
    }

    private async checkStepAchievements(companyId: string, userId: string, stepKey: string) {
        const achievement = await Achievement.findOne({ companyId, userId });
        if (!achievement) return;

        let badgeId = null;

        switch (stepKey) {
            case 'emailVerified': badgeId = 'email_verified'; break;
            case 'kycSubmitted': badgeId = 'kyc_submitted'; break;
            case 'kycApproved': badgeId = 'kyc_approved'; break;
            case 'warehouseCreated': badgeId = 'warehouse_created'; break;
            case 'firstOrderCreated': badgeId = 'first_order'; break;
            case 'walletRecharged': badgeId = 'wallet_recharged'; break;
        }

        if (badgeId) {
            // @ts-ignore
            const unlocked = achievement.unlockBadge(badgeId);
            if (unlocked) {
                await achievement.save();
            }
        }
    }
}

export default new OnboardingProgressService();
