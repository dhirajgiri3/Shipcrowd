const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(true),
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendShipmentStatusEmail: jest.fn().mockResolvedValue(true),
    sendBatchEmail: jest.fn().mockResolvedValue(true),
    sendNewsletterEmail: jest.fn().mockResolvedValue(true),
    sendTeamInvitationEmail: jest.fn().mockResolvedValue(true),
    sendEmailChangeVerification: jest.fn().mockResolvedValue(true),
    sendEmailChangeNotification: jest.fn().mockResolvedValue(true),
    sendRecoveryEmail: jest.fn().mockResolvedValue(true),
    sendOwnerInvitationEmail: jest.fn().mockResolvedValue(true),
};

export const sendEmail = mockEmailService.sendEmail;
export const sendVerificationEmail = mockEmailService.sendVerificationEmail;
export const sendPasswordResetEmail = mockEmailService.sendPasswordResetEmail;
export const sendWelcomeEmail = mockEmailService.sendWelcomeEmail;
export const sendShipmentStatusEmail = mockEmailService.sendShipmentStatusEmail;
export const sendBatchEmail = mockEmailService.sendBatchEmail;
export const sendNewsletterEmail = mockEmailService.sendNewsletterEmail;
export const sendTeamInvitationEmail = mockEmailService.sendTeamInvitationEmail;
export const sendEmailChangeVerification = mockEmailService.sendEmailChangeVerification;
export const sendEmailChangeNotification = mockEmailService.sendEmailChangeNotification;
export const sendRecoveryEmail = mockEmailService.sendRecoveryEmail;
export const sendOwnerInvitationEmail = mockEmailService.sendOwnerInvitationEmail;

export default mockEmailService;
