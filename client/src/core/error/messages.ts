/**
 * User-Facing Error Message Registry
 * 
 * Centralized source of truth for all error messages displayed to users.
 * Ensures consistent, premium, and friendly tone across the application.
 */

export const ERROR_MESSAGES = {
    // defaults
    DEFAULT: "An unexpected error occurred. Our team has been notified.",
    DEFAULT_TITLE: "Something went wrong",

    // network
    NETWORK_ERROR: "Unable to connect to Shipcrowd. Please check your internet connection.",
    TIMEOUT: "The request took too long to complete. Please check your connection and try again.",
    OFFLINE: "You remain offline. Changes will save when you reconnect.",
    BACK_ONLINE: "You are back online. Connectivity restored.",

    // http status codes
    HTTP_400: "The request was invalid. Please check your input and try again.",
    HTTP_401: "Your session has expired. Please log in again to continue.",
    HTTP_403: "You do not have the required permissions to access this resource.",
    HTTP_404: "We couldn't find the resource you're looking for.",
    HTTP_429: "You're making too many requests. Please wait a moment and try again.",
    HTTP_500: "We're experiencing a temporary server issue. Please try again shortly.",
    HTTP_502: "Received an invalid response from the server. Please try again.",
    HTTP_503: "Shipcrowd is currently undergoing maintenance. We'll be back online shortly.",
    HTTP_504: "The server took too long to respond. Please try again.",

    // authentication
    AUTH_FAILED: "Authentication failed. Please check your credentials.",
    SESSION_EXPIRED: "Your secure session has ended. Please sign in again.",

    // validation
    VALIDATION_ERROR: "Please correct the highlighted errors before proceeding.",

    // support
    CONTACT_SUPPORT: "Contact Support",
    TRY_AGAIN: "Try Again",
    RELOAD: "Reload Application",
    CLOSE: "Close",
};
