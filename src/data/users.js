const USERS_KEY = 'mgl_users';
const SESSION_KEY = 'mgl_session';

const defaultUsers = [
  { id: 'U001', nombre: 'Ariana Vinzon', rol: 'Admin', color: '#0F6E56', initials: 'AV' },
];

export function getUsers() {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  saveUsers(defaultUsers);
  return defaultUsers;
}

export function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getCurrentUser() {
  try {
    const id = localStorage.getItem(SESSION_KEY);
    if (id) {
      const users = getUsers();
      return users.find((u) => u.id === id) || null;
    }
  } catch { /* ignore */ }
  return null;
}

export function setCurrentUser(userId) {
  localStorage.setItem(SESSION_KEY, userId);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getInitials(nombre) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export const ROL_COLORS = {
  Admin: '#0F6E56',
  Editor: '#006B70',
  Viewer: '#854F0B',
};
