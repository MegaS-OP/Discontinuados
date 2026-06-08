import { createContext, useContext, useState } from 'react';
import { getUsers, saveUsers, getCurrentUser, setCurrentUser, clearSession, getInitials, ROL_COLORS } from '../data/users';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [users, setUsers] = useState(() => getUsers());
  const [currentUser, setCurrentUserState] = useState(() => getCurrentUser());

  const login = (userId) => {
    setCurrentUser(userId);
    const user = users.find((u) => u.id === userId);
    setCurrentUserState(user || null);
  };

  const logout = () => {
    clearSession();
    setCurrentUserState(null);
  };

  const addUser = (nombre, rol) => {
    const newUser = {
      id: `U${Date.now()}`,
      nombre,
      rol,
      color: ROL_COLORS[rol] || '#0F6E56',
      initials: getInitials(nombre),
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveUsers(updated);
    return newUser;
  };

  const removeUser = (userId) => {
    const updated = users.filter((u) => u.id !== userId);
    setUsers(updated);
    saveUsers(updated);
    if (currentUser?.id === userId) logout();
  };

  const updateUser = (userId, changes) => {
    const updated = users.map((u) => {
      if (u.id !== userId) return u;
      const merged = { ...u, ...changes, initials: getInitials(changes.nombre || u.nombre) };
      if (changes.rol) merged.color = ROL_COLORS[changes.rol] || u.color;
      return merged;
    });
    setUsers(updated);
    saveUsers(updated);
    if (currentUser?.id === userId) {
      const fresh = updated.find((u) => u.id === userId);
      setCurrentUserState(fresh);
    }
  };

  return (
    <UserContext.Provider value={{ users, currentUser, login, logout, addUser, removeUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  return useContext(UserContext);
}
