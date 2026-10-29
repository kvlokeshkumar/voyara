// All deploy-time settings come from environment variables (see .env.example).
const config = {
  apiUrl: (process.env.REACT_APP_API_URL || '').replace(/\/+$/, ''),
  userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID || '',
  clientId: process.env.REACT_APP_COGNITO_CLIENT_ID || '',
};

export const isConfigured = () => Boolean(config.apiUrl && config.userPoolId && config.clientId);

export default config;
