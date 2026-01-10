import express from 'express';
import { authenticate } from '../../../middleware/auth/auth';
import { requireCompany } from '../../../middleware/auth/company';
import onboardingController from '../../../controllers/onboarding/onboarding.controller';

const router = express.Router();

// All routes require authentication and company context
router.use(authenticate);
router.use(requireCompany);

// Progress & Actions
router.get('/progress', onboardingController.getProgress.bind(onboardingController));
router.get('/next-action', onboardingController.getNextAction.bind(onboardingController));
router.post('/skip-step/:step', onboardingController.skipStep.bind(onboardingController));

// Personalization
router.post('/personalize', onboardingController.submitPersonalization.bind(onboardingController));
router.get('/recommendations', onboardingController.getRecommendations.bind(onboardingController));

// Achievements (Gamification)
router.get('/achievements', onboardingController.getAchievements.bind(onboardingController));
router.get('/leaderboard', onboardingController.getLeaderboard.bind(onboardingController));

// Demo Data
router.post('/demo-data/generate', onboardingController.generateDemoData.bind(onboardingController));
router.delete('/demo-data/clear', onboardingController.clearDemoData.bind(onboardingController));

// Product Tours
router.get('/tours/available', onboardingController.getAvailableTours.bind(onboardingController));
router.post('/tours/:id/start', onboardingController.startTour.bind(onboardingController));
router.post('/tours/:id/complete', onboardingController.completeTour.bind(onboardingController));
router.patch('/tours/:id/progress', onboardingController.updateTourProgress.bind(onboardingController));

export default router;
