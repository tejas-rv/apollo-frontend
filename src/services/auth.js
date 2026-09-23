const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_ROLE_KEY = "userRole";
const USERNAME_KEY = "username";

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveSession({ accessToken, refreshToken, role, username }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  saveUser({ role, username });
}

export function saveUser({ role, username }) {
  if (role) localStorage.setItem(USER_ROLE_KEY, role);
  if (username) localStorage.setItem(USERNAME_KEY, username);
}

export function getStoredUser() {
  const role = localStorage.getItem(USER_ROLE_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  return role && username ? { role, username } : null;
}

export function clearSession() {
  localStorage.clear();
}
