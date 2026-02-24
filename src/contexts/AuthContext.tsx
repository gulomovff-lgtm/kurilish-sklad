import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as fbSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { auth, db, secondaryAuth } from '../firebase';
import type { AppUser, UserRole } from '../types';

interface AuthContextType {
  currentUser: AppUser | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  createUser: (email: string, password: string, name: string, role: UserRole) => Promise<void>;
  updateUserRole: (uid: string, role: UserRole) => Promise<void>;
  updateUserName: (uid: string, name: string) => Promise<void>;
  toggleUserActive: (uid: string, isActive: boolean) => Promise<void>;
  deleteUserDoc: (uid: string) => Promise<void>;
  adminCount: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminCount, setAdminCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data() as AppUser;
          // Заблокированный пользователь не может войти
          if (data.isActive === false) {
            await signOut(auth);
            setCurrentUser(null);
          } else {
            setCurrentUser(data);
          }
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Следим за кол-вом админов
  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'admin'))).then(snap => {
      setAdminCount(snap.size);
    });
  }, [currentUser]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Создаём юзера через ВТОРИЧНЫЙ auth — текущая сессия не сбрасывается
  const createUser = async (email: string, password: string, name: string, role: UserRole) => {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // Сразу разлогиниваем вторичный app чтобы не было активных сессий
    await fbSignOut(secondaryAuth);
    const appUser: AppUser = {
      uid: cred.user.uid,
      email,
      displayName: name,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      ...(currentUser?.uid ? { createdBy: currentUser.uid } : {}),
    };
    await setDoc(doc(db, 'users', cred.user.uid), appUser);
  };

  const updateUserRole = async (uid: string, role: UserRole) => {
    await updateDoc(doc(db, 'users', uid), { role });
    // Если меняем свою роль — обновляем текущий стейт
    if (currentUser?.uid === uid) {
      setCurrentUser(prev => prev ? { ...prev, role } : null);
    }
  };

  const updateUserName = async (uid: string, displayName: string) => {
    await updateDoc(doc(db, 'users', uid), { displayName });
  };

  const toggleUserActive = async (uid: string, isActive: boolean) => {
    await updateDoc(doc(db, 'users', uid), { isActive });
  };

  const deleteUserDoc = async (uid: string) => {
    // Удаляем документ из Firestore (Firebase Auth запись останется, но войти не получится)
    await deleteDoc(doc(db, 'users', uid));
  };

  return (
    <AuthContext.Provider value={{
      currentUser, firebaseUser, loading,
      login, logout, createUser,
      updateUserRole, updateUserName, toggleUserActive, deleteUserDoc,
      adminCount
    }}>
      {children}
    </AuthContext.Provider>
  );
}
