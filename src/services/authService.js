import api from './api';

const AUTH_ENDPOINT = '/auth';

/**
 * Authentication Service
 * Handles all HTTP requests related to user authentication, registration, and session management.
 */
const authService = {
  /**
   * Initiates the owner registration process.
   * Creates an account in PENDING state and sends an activation OTP.
   * @param {Object} data - { name, phone, email, password, organization_name, farm_name }
   * @returns {Promise<Object>} Response containing success message.
   */
  registerOwner: async (data) => {
    const response = await api.post(`${AUTH_ENDPOINT}/register-owner`, data);
    return response.data;
  },

  /**
   * Verifies the registration OTP and activates the account.
   * @param {Object} data - { email, otp }
   * @returns {Promise<Object>} Response containing tokens and user data.
   */
  verifyRegistration: async (data) => {
    const response = await api.post(`${AUTH_ENDPOINT}/verify-registration`, data);
    return response.data;
  },

  /**
   * Resends the activation OTP to the user's email if the previous one expired or was not received.
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Response containing success message.
   */
  resendActivationOTP: async (email) => {
    const response = await api.post(`${AUTH_ENDPOINT}/resend-activation-otp`, { email });
    return response.data;
  },

  /**
   * Authenticates a user and starts a new session.
   * @param {Object} credentials - { phone, password }
   * @returns {Promise<Object>} Response containing tokens and user data.
   */
  login: async (credentials) => {
    const response = await api.post(`${AUTH_ENDPOINT}/login`, credentials);
    return response.data;
  },

  /**
   * Requests a password reset OTP to be sent to the user's email.
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Response containing success message.
   */
  forgotPassword: async (email) => {
    const response = await api.post(`${AUTH_ENDPOINT}/forgot-password`, { email });
    return response.data;
  },

  /**
   * Resets the user's password using the provided OTP.
   * @param {Object} data - { email, otp, new_password, confirm_password }
   * @returns {Promise<Object>} Response containing success message.
   */
  resetPassword: async (data) => {
    const response = await api.post(`${AUTH_ENDPOINT}/reset-password`, data);
    return response.data;
  },

  /**
   * Updates the Firebase Cloud Messaging (FCM) token for the authenticated user.
   * This is a protected route.
   * @param {string} fcmToken - The device FCM token
   * @returns {Promise<Object>} Response containing success message.
   */
  updateFcmToken: async (fcmToken) => {
    const response = await api.put(`${AUTH_ENDPOINT}/fcm-token`, { fcm_token: fcmToken });
    return response.data;
  }
};

export default authService;