import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';
import config from '../config';

// Tokens are kept in sessionStorage (cleared when the tab closes), NOT localStorage.
// Passwords are never stored anywhere; they are only sent to Cognito over HTTPS (SRP).
let pool = null;
const getPool = () => {
  if (!config.userPoolId || !config.clientId) {
    throw new Error('Cognito is not configured. Set REACT_APP_COGNITO_USER_POOL_ID and REACT_APP_COGNITO_CLIENT_ID.');
  }
  if (!pool) {
    pool = new CognitoUserPool({
      UserPoolId: config.userPoolId,
      ClientId: config.clientId,
      Storage: window.sessionStorage,
    });
  }
  return pool;
};

const cognitoUser = (email) =>
  new CognitoUser({ Username: email.trim().toLowerCase(), Pool: getPool(), Storage: window.sessionStorage });

export const friendlyError = (err) => {
  const map = {
    UsernameExistsException: 'An account with this email already exists.',
    InvalidPasswordException: 'Password must be 8+ characters with upper and lower case letters, a number and a symbol.',
    NotAuthorizedException: 'Invalid email or password.',
    UserNotFoundException: 'Invalid email or password.',
    CodeMismatchException: 'That verification code is incorrect.',
    ExpiredCodeException: 'That verification code has expired. Request a new one.',
    LimitExceededException: 'Too many attempts. Please wait a while and try again.',
    TooManyRequestsException: 'Too many attempts. Please wait a while and try again.',
  };
  return map[err?.code] || err?.message || 'Something went wrong. Please try again.';
};

export const signUp = (email, password, name) =>
  new Promise((resolve, reject) => {
    const attrs = [
      new CognitoUserAttribute({ Name: 'email', Value: email.trim().toLowerCase() }),
      new CognitoUserAttribute({ Name: 'name', Value: name.trim() }),
    ];
    getPool().signUp(email.trim().toLowerCase(), password, attrs, null, (err, result) =>
      err ? reject(err) : resolve(result)
    );
  });

export const confirmSignUp = (email, code) =>
  new Promise((resolve, reject) => {
    cognitoUser(email).confirmRegistration(code.trim(), true, (err, res) => (err ? reject(err) : resolve(res)));
  });

export const resendCode = (email) =>
  new Promise((resolve, reject) => {
    cognitoUser(email).resendConfirmationCode((err, res) => (err ? reject(err) : resolve(res)));
  });

const sessionToUser = (session) => {
  const p = session.getIdToken().decodePayload();
  const groups = p['cognito:groups'] || [];
  return { email: p.email, name: p.name || p.email, isAdmin: groups.includes('admins') };
};

export const signIn = (email, password) =>
  new Promise((resolve, reject) => {
    const user = cognitoUser(email);
    user.authenticateUser(new AuthenticationDetails({ Username: email.trim().toLowerCase(), Password: password }), {
      onSuccess: (session) => resolve(sessionToUser(session)),
      onFailure: reject,
      newPasswordRequired: () => reject({ code: 'NewPasswordRequired', message: 'A new password is required for this account.' }),
    });
  });

const currentSession = () =>
  new Promise((resolve) => {
    let cu;
    try {
      cu = getPool().getCurrentUser();
    } catch {
      return resolve(null);
    }
    if (!cu) return resolve(null);
    // getSession refreshes the tokens automatically when they have expired.
    cu.getSession((err, session) => resolve(!err && session && session.isValid() ? session : null));
  });

export const getCurrentUser = async () => {
  const s = await currentSession();
  return s ? sessionToUser(s) : null;
};

export const getIdToken = async () => {
  const s = await currentSession();
  return s ? s.getIdToken().getJwtToken() : null;
};

export const signOut = () => {
  try {
    const cu = getPool().getCurrentUser();
    if (cu) cu.signOut();
  } catch {
    /* not configured: nothing to sign out of */
  }
};
