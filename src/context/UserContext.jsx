import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ref, onValue, set, remove } from 'firebase/database';
import { auth, db } from '../firebase';
import { getInitials, ROL_COLORS, emailKey } from '../data/users';

const UserContext = createContext(null);

const USERS_PATH = 'users';

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [authUser, setAuthUser] = useState(undefined); // undefined = loading
  const [currentUser, setCurrentUserState] = useState(null);
  const [loginError, setLoginError] = useState('');

  // Live list of all user profiles (for Configuración and current user lookup)
  useEffect(() => {
    const usersRef = ref(db, USERS_PATH);
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const val = snapshot.val() || {};
      setUsers(Object.entries(val).map(([key, u]) => ({ id: key, ...u })));
    });
    return () => unsubscribe();
  }, []);

  // Track Firebase Auth session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Resolve current user's profile (create a default Viewer profile on first login)
  useEffect(() => {
    if (!authUser) {
      setCurrentUserState(null);
      return;
    }
    const key = emailKey(authUser.email);
    const profileRef = ref(db, `${USERS_PATH}/${key}`);
    const unsubscribe = onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentUserState({ id: key, ...snapshot.val() });
      } else {
        const nombre = authUser.email.split('@')[0];
        const profile = {
          email: authUser.email,
          nombre,
          rol: 'Viewer',
          color: ROL_COLORS.Viewer,
          initials: getInitials(nombre),
        };
        set(profileRef, profile);
        setCurrentUserState({ id: key, ...profile });
      }
    });
    return () => unsubscribe();
  }, [authUser]);

  const login = async (email, password) => {
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      setLoginError('Email o contraseña incorrectos.');
      return false;
    }
  };

  const logout = () => {
    signOut(auth);
  };

  const addUser = (email, nombre, rol) => {
    const key = emailKey(email);
    const profile = {
      email: email.toLowerCase(),
      nombre,
      rol,
      color: ROL_COLORS[rol] || '#0F6E56',
      initials: getInitials(nombre),
    };
    set(ref(db, `${USERS_PATH}/${key}`), profile);
  };

  const removeUser = (userId) => {
    remove(ref(db, `${USERS_PATH}/${userId}`));
  };

  const updateUser = (userId, changes) => {
    const existing = users.find((u) => u.id === userId);
    if (!existing) return;
    const merged = { ...existing, ...changes, initials: getInitials(changes.nombre || existing.nombre) };
    if (changes.rol) merged.color = ROL_COLORS[changes.rol] || existing.color;
    delete merged.id;
    set(ref(db, `${USERS_PATH}/${userId}`), merged);
  };

  // authUser === undefined -> still resolving session
  const loading = authUser === undefined || (authUser && currentUser === null);

  return (
    <UserContext.Provider value={{ users, currentUser, authUser, loading, loginError, login, logout, addUser, removeUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  return useContext(UserContext);
}
