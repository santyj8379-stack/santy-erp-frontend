import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  onSnapshot, 
  collection, 
  addDoc, 
  updateDoc,
  setDoc,
  deleteDoc,
  writeBatch, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

// --- Firebase Configuration ---
// These are YOUR unique keys for the "santy-erp-platform" project.
const firebaseConfig = {
  apiKey: "AIzaSyC6fHG_uT8PBxWa0TrICo4zFyJiXehS5o8",
  authDomain: "santy-erp-platform.firebaseapp.com",
  projectId: "santy-erp-platform",
  storageBucket: "santy-erp-platform.firebasestorage.app",
  messagingSenderId: "564555902215",
  appId: "1:564555902215:web:67f61f1f7748ecbc6f69a2"
};

// --- Initialize Firebase ---
let app;
let db;
let auth;
try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (e) {
  console.error("Firebase initialization error", e);
  alert("CRITICAL ERROR: Firebase config is not set. Please update the file with your own project's config.");
}

// --- Pre-defined Module Templates ---
// THIS IS NOW EMPTY! We will fetch from the database.
// const TEMPLATES = [...]; // This is now gone


// --- Helper Components & Functions ---
const getIcon = (name) => {
  const icons = {
    Dashboard: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v4.875h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
    Transactions: 'M3 7.5l3.111-1.333a1.14 1.14 0 011.097 0L10.5 7.5M3 7.5v5.625c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125V7.5m-3.75 0h3.75m10.125-1.333L16.5 7.5m3.75 0h-3.75m0 0v5.625c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125V7.5m3 0V11.25A2.25 2.25 0 0118 13.5H6a2.25 2.25 0 01-2.25-2.25V7.5m14.25-1.333l-3.375-1.446a1.125 1.125 0 00-1.097 0L10.5 6.167m0 0L7.125 4.721a1.125 1.125 0 00-1.097 0L2.625 6.167',
    Inventory: 'M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z',
    Admin: 'M11.123 2.25l.498.498-6.17 6.17a.75.75 0 00-.22.53l-.26 2.798a.75.75 0 00.925.925l2.798-.26a.75.75 0 00.53-.22l6.17-6.17.498.498a.75.75 0 001.06 0l1.272-1.272a.75.75 0 000-1.06l-4.98-4.98a.75.75 0 00-1.06 0l-1.272 1.272a.75.75 0 000 1.061zm-3.08 7.32L6.75 8.25l5.903-5.903 1.293 1.293-5.902 5.902zM15 13.5a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H15zm-1.5-1.5a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM15 9a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H15zM3 3.75A1.5 1.5 0 014.5 2.25h6.19a.75.75 0 00.53-.22L13.34.91a2.25 2.25 0 013.182 0l4.98 4.98a2.25 2.25 0 010 3.182l-1.12 1.12a.75.75 0 00-.22.53v6.19A1.5 1.5 0 0118.75 18H15a.75.75 0 000 1.5h3.75A2.25 2.25 0 0021 17.25V4.5A2.25 2.25 0 0018.75 2.25h-3.52a.75.75 0 00-.53.22L13.58 3.6a.75.75 0 01-1.06 0L10.4 1.48a.75.75 0 00-.53-.22H4.5A1.5 1.5 0 003 3.75v13.5A1.5 1.5 0 004.5 18h6.19a.75.75 0 00.53.22l1.12 1.12a2.25 2.25 0 010 3.182l-4.98 4.98a2.25 2.25 0 01-3.182 0l-1.12-1.12a.75.75 0 00-.53-.22H4.5A2.25 2.25 0 012.25 17.25V3.75z',
    Logout: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3 0l3-3m0 0l-3-3m3 3H9',
    Close: 'M6 18L18 6M6 6l12 12',
    Trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.577 0c-.295.009-.59.026-.88.05c-.29.024-.58.052-.87.083m-1.577 0a48.11 48.11 0 013.478-.397m7.5 0a48.667 48.667 0 00-7.5 0',
    Recover: 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3',
    Module: 'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.125 1.125 0 010 2.25H5.625a1.125 1.125 0 010-2.25z',
    Sales: 'M2.25 18.75a60.07 60.07 0 0115.798-1.55.657.657 0 01.554.554 60.07 60.07 0 01-1.55 15.798.657.657 0 01-.554.554A60.07 60.07 0 012.25 18.75zM16.04 4.937a8.25 8.25 0 010 11.668M18.75 3.187a12 12 0 010 17.626M13.5 7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-.75-.75h-3a.75.75 0 01-.75-.75v-3z',
    Purchase: 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.182-3.182m-4.991-1.343a4.125 4.125 0 01-1.12 3.5m-3.111-3.5a4.125 4.125 0 00-1.12 3.5m0 0l-1.48 1.48m1.48-1.48l1.48 1.48m-1.48-1.48l-1.48-1.48m1.48 1.48l1.48-1.48m6.456-3.545a4.125 4.125 0 01-1.12 3.5m-3.111-3.5a4.125 4.125 0 00-1.12 3.5m0 0l-1.48 1.48m1.48-1.48l1.48 1.48m-1.48-1.48l-1.48-1.48m1.48 1.48l1.48-1.48',
    Store: 'M3.75 5.25a1.5 1.5 0 013 0v.516a.75.75 0 00.75.75h10.5a.75.75 0 00.75-.75V5.25a1.5 1.5 0 013 0v.516a2.25 2.25 0 01-2.25 2.25H15a2.25 2.25 0 01-2.25-2.25V5.25a.75.75 0 00-.75-.75H9a.75.75 0 00-.75.75v.516A2.25 2.25 0 016 8.016H3.75V5.25zM12 18.75A3 3 0 0015 15.75v-1.5a3 3 0 00-3-3V18.75zM12 18.75a3 3 0 013 3V21h-3v-2.25zM12 11.25a3 3 0 00-3 3v1.5a3 3 0 003 3V11.25zM12 11.25a3 3 0 01-3-3V6h3v2.25A2.25 2.25 0 019.75 10.5H6a3.75 3.75 0 00-3.75 3.75v1.5a3.75 3.75 0 003.75 3.75H9a2.25 2.25 0 012.25-2.25V11.25z',
    Accounts: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h6m3-3.75l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
    Expense: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0l.879-.659M12 21.75V19.5M12 6V4.5M3 15V4.5M3 15h9M3 15C3 16.51 4.444 18 6.182 18h9.636C17.556 18 19.5 16.51 19.5 15M12 6V3M16.5 4.5V15m3 0V4.5M16.5 15h3M16.5 15c0 1.51 1.444 3 3.182 3h.636C21.556 18 21 16.51 21 15',
    Export: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
    Logistics: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5h10.5m-10.5-4.5V6.375c0-.621.504-1.125 1.125-1.125h14.25c.621 0 1.125.504 1.125 1.125v7.875m-16.5-4.5h16.5',
    Seed: 'M6.75 7.5l3 2.25-3 2.25m3 0l3 2.25-3 2.25m3 0l3 2.25-3 2.25M6.75 21v-5.25a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25V21m-5.25 0h5.25m-12-1.5a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25V21m-5.25 0h5.25m-12-1.5a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25V21m-5.25 0h5.25M6 3.75l3 2.25-3 2.25m3 0l3 2.25-3 2.25m3 0l3 2.25-3 2.25M6 18v-5.25a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25V18m-5.25 0h5.25'
  };
  const path = icons[name] || icons.Module; // Default to 'Module' icon
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
};

// Simple currency formatter
const formatCurrency = (amount) => {
  if (typeof amount !== 'number') return 'N/A';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};

// Simple date formatter
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  // Check if timestamp is a Firestore timestamp object
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-GB'); // dd/mm/yyyy
  }
  // Check if it's a JS Date object
  if (timestamp instanceof Date) {
    return timestamp.toLocaleDateString('en-GB');
  }
  return 'Invalid Date';
};

// --- Reusable Components ---
const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      <p className="mt-4 text-xl font-semibold">Loading Business Platform...</p>
    </div>
  </div>
);

const Modal = ({ children, title, setShowModal }) => (
  <div className="fixed inset-0 bg-black bg-opacity-70 z-40 flex items-center justify-center animate-fadeIn" onClick={() => setShowModal(false)}>
    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center p-5 border-b border-gray-200">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
          <span className="w-6 h-6">{getIcon('Close')}</span>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// --- Authentication Hooks & Components ---

// 1. Auth state listener
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  return { user, loading };
};

// 2. User Profile listener (for Roles and Company ID)
const useUserProfile = (uid) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!db || !uid) { setLoading(false); return; }
    const userDocRef = doc(db, `users/${uid}`);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data());
      } else {
        setError("User profile not found. Please contact support or your Super Admin.");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching user profile:", err);
      setError(err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [uid]);
  return { profile, loading, error };
};

// 3. Login Screen
const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!auth) { setError("Auth service not initialized."); setLoading(false); return; }
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800 rounded-lg shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-indigo-400">
          {isLogin ? 'Business Platform Login' : 'Create Account'}
        </h2>
        <p className="text-center text-slate-400 text-sm">
          {isLogin ? 'Log in to access your company dashboard.' : 'After signing up, please contact your Super Admin to have your account activated.'}
        </p>
        
        <form onSubmit={handleAuthAction} className="space-y-6">
          {error && <div className="p-3 bg-red-800 text-red-100 rounded-lg text-center font-medium">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" required />
          </div>
          
          <div>
            <button type="submit" disabled={loading} className="w-full px-4 py-2 text-lg font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
          </div>
        </form>
        
        <div className="text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-indigo-400 hover:underline">
            {isLogin ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
          </button>
        </div>
      </div>
    </div>
  );
};


// --- NEW DYNAMIC DATA HOOKS ---

// Hook to get the list of available modules for the company
const useModuleSchemas = (companyId) => {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const modulesPath = useMemo(() => companyId ? `companies/${companyId}/modules` : null, [companyId]);

  useEffect(() => {
    if (!db || !modulesPath) { setLoading(false); return; }
    
    const q = query(collection(db, modulesPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setModules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching modules:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [modulesPath]);
  
  return { modules, loading };
};

// Hook to get the *data* for a *specific* dynamic module
const useModuleData = (companyId, moduleId) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const dataPath = useMemo(() => {
    // The data for a module is stored in a collection named "data_[moduleId]"
    return companyId && moduleId ? `companies/${companyId}/data_${moduleId}` : null;
  }, [companyId, moduleId]);

  useEffect(() => {
    if (!db || !dataPath) { setLoading(false); return; }
    
    // Only fetch items that are NOT soft-deleted
    const q = query(collection(db, dataPath), where("isDeleted", "==", false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error(`Error fetching data for ${moduleId}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [dataPath]);

  return { data, loading };
};


// --- Main App Entry Point ---
function App() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return user ? <DashboardApp user={user} /> : <LoginScreen />;
}

// --- Main Dashboard Application ---
const DashboardApp = ({ user }) => {
  const [activeView, setActiveView] = useState('Dashboard'); // 'Dashboard' or a moduleId
  const [showForm, setShowForm] = useState(false);
  
  const { profile, loading: profileLoading, error: profileError } = useUserProfile(user.uid);

  const companyId = profile?.companyId;
  const userRole = profile?.role;
  
  // Fetch the list of DYNAMIC modules
  const { modules, loading: modulesLoading } = useModuleSchemas(companyId);

  const loading = profileLoading || modulesLoading;
  
  const handleLogout = async () => {
    if (auth) await signOut(auth);
  };
  
  if (loading) return <LoadingScreen />;
  
  // Handle new users who haven't been set up by an admin yet
  if (profileError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100 text-red-600 p-4">
         <div className="bg-white p-8 rounded-lg shadow-xl text-center">
           <h1 className="text-2xl font-bold mb-4 text-red-700">Account Not Activated</h1>
           <p className="text-center mb-4 text-slate-700">{profileError || "Your user profile could not be found."}<br/> Please contact your Super Admin to have your account set up.</p>
           <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">Log Out</button>
         </div>
       </div>
    );
  }
  
  // Find the schema for the currently active view
  const activeModuleSchema = modules.find(m => m.id === activeView);

  const renderView = () => {
    if (activeView === 'Dashboard') {
      return <DashboardView companyId={companyId} modules={modules} />;
    }
    if (activeView === 'Admin') {
      return <AdminView companyId={companyId} currentUserRole={userRole} modules={modules} />;
    }
    // If it's not Dashboard or Admin, it must be a dynamic module
    if (activeModuleSchema) {
      return <DynamicModuleView 
                key={activeModuleSchema.id} // Ensures component re-mounts when schema changes
                schema={activeModuleSchema} 
                companyId={companyId} 
                userRole={userRole} 
              />;
    }
    // Fallback for a module that might have been deleted
    return <DashboardView companyId={companyId} modules={modules} />;
  };
  
  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-lg">
        <div className="text-2xl font-bold p-5 border-b border-slate-700 flex items-center space-x-2">
          <svg className="w-8 h-8 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-2.25-1.313M21 7.5v13.5m0-13.5l-2.25 1.313M3 7.5l2.25-1.313M3 7.5v13.5m0-13.5l2.25 1.313M21 7.5L12 2.25 3 7.5m18 0l-2.25 1.313M3 7.5l2.25 1.313M12 21.75l9-5.25m-9 5.25l-9-5.25m9 5.25v-9m0 0l-9-5.25m9 5.25l9-5.25" /></svg>
          <span className="text-slate-100">Santy ERP</span>
        </div>
        <nav className="flex-1 overflow-y-auto mt-2">
          {/* Static Dashboard Link */}
          <SidebarButton
            name="Dashboard"
            icon="Dashboard"
            activeView={activeView}
            onClick={() => setActiveView('Dashboard')}
          />
          
          {/* Dynamic Module Links */}
          {modules.map(module => (
            <SidebarButton
              key={module.id}
              name={module.name}
              icon={module.icon}
              activeView={activeView}
              onClick={() => setActiveView(module.id)}
            />
          ))}
          
          {/* Static Admin Link (Role-Gated) */}
          {(userRole === 'admin' || userRole === 'super_admin') && (
            <SidebarButton
              name="Admin Panel"
              icon="Admin"
              activeView={activeView}
              onClick={() => setActiveView('Admin')}
            />
          )}
        </nav>
        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-700 text-sm text-slate-400 space-y-3">
          <div>
            <span className={`px-2 py-1 text-xs font-bold text-white rounded-full ${profile.role === 'super_admin' ? 'bg-red-600' : 'bg-indigo-600'}`}>
              {profile.role.replace('_', ' ')}
            </span>
          </div>
          <span className="font-mono text-xs break-all text-slate-400" title={user.email}>{user.email}</span>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 p-3 text-left transition-all duration-200 text-slate-400 hover:bg-slate-700 hover:text-red-400 rounded-lg"
          >
            <span className="w-6 h-6">{getIcon('Logout')}</span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-slate-200 p-4 flex justify-between items-center z-10">
          <h1 className="text-3xl font-bold text-slate-800">{activeModuleSchema?.name || activeView}</h1>
          {/* Dynamic "Add New" button */}
          {activeModuleSchema && (userRole !== 'read_only') && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 transform hover:-translate-y-0.5"
            >
              + Add New {activeModuleSchema.name}
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {renderView()}
        </div>
      </main>

      {/* Modal Form: Renders dynamically based on active module */}
      {showForm && activeModuleSchema && (
        <DynamicModuleForm 
          schema={activeModuleSchema}
          setShowForm={setShowForm} 
          companyId={companyId} 
          user={user} 
        />
      )}
    </div>
  );
};

// --- Reusable Sidebar Button ---
const SidebarButton = ({ name, icon, activeView, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 p-4 text-left transition-all duration-200 text-sm font-medium ${
      activeView === name || activeView === icon || activeView === name.toLowerCase().replace(' ', '_') || activeView === name.toLowerCase()
        ? 'bg-indigo-700 text-white shadow-inner-lg'
        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
    }`}
  >
    <span className="w-6 h-6">{getIcon(icon)}</span>
    <span>{name}</span>
  </button>
);


// --- DYNAMIC VIEWS & COMPONENTS ---

const DashboardView = ({ companyId, modules }) => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Modules" value={modules.length} loading={!modules} />
        <StatCard title="Company ID" value={companyId} loading={!companyId} />
        <StatCard title="Status" value="Platform Active" loading={false} type="success" />
      </div>
       <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
          <h2 className="text-2xl font-bold mb-4 text-slate-800">Welcome to Your Dynamic Platform!</h2>
          <p className="text-slate-700">
            This is your new dashboard. The sidebar is now built dynamically from the modules
            you create in the **Admin Panel**.
          </p>
           <p className="text-slate-700 mt-4">
            To get started, go to the **Admin Panel** &gt; **Install Templates** and install your
            first module pack, such as the "Accounting Foundation Pack".
          </p>
        </div>
    </div>
  );
};

const StatCard = ({ title, value, loading, type = 'default' }) => {
  const colorClasses = {
    success: 'text-green-600',
    danger: 'text-red-600',
    default: 'text-slate-900'
  };
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 transform transition-all duration-300 hover:shadow-xl">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</h3>
      {loading ? (
        <div className="h-8 bg-slate-200 rounded animate-pulse mt-2"></div>
      ) : (
        <p className={`text-3xl font-bold mt-1 ${colorClasses[type]} truncate`}>{value}</p>
      )}
    </div>
  );
};

// --- THIS IS THE NEW "ENGINE" ---
const DynamicModuleView = ({ schema, companyId, userRole }) => {
  const { data, loading } = useModuleData(companyId, schema.id);

  const tableHeaders = schema.fields.slice(0, 4).map(field => field.name);
  
  const handleSoftDelete = async (docId) => {
    if (window.confirm("Are you sure you want to delete this item? This can be undone by an Admin.")) {
      try {
        const docRef = doc(db, 'companies', companyId, `data_${schema.id}`, docId);
        await updateDoc(docRef, {
          isDeleted: true,
          deletedAt: serverTimestamp(),
          deletedBy: auth.currentUser.email
        });
      } catch (error) {
        console.error("Error soft-deleting document:", error);
        alert("Error: " + error.message);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200 animate-fadeIn">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">{schema.name}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {tableHeaders.map(header => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">{header}</th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Created By</th>
              {(userRole === 'admin' || userRole === 'super_admin') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan={tableHeaders.length + 2} className="text-center p-4 text-slate-500">Loading data...</td></tr>
            ) : data.length === 0 ? (
               <tr><td colSpan={tableHeaders.length + 2} className="text-center p-4 text-slate-500">No data found for this module.</td></tr>
            ) : (
              data.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  {tableHeaders.map(header => (
                    <td key={`${item.id}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                      {item[header] ? (schema.fields.find(f => f.name === header)?.type === 'currency' ? formatCurrency(item[header]) : item[header].toString()) : 'N/A'}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{item.createdBy?.email || 'N/A'}</td>
                  {(userRole === 'admin' || userRole === 'super_admin') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleSoftDelete(item.id)} className="text-red-600 hover:text-red-900 transition-colors">Delete</button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- THIS IS THE NEW "ENGINE" FORM ---
const DynamicModuleForm = ({ schema, setShowForm, companyId, user }) => {
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (fieldName, value, fieldType) => {
    let processedValue = value;
    if (fieldType === 'number' || fieldType === 'currency') {
      processedValue = parseFloat(value);
    }
    setFormData(prev => ({ ...prev, [fieldName]: processedValue }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const newDocument = {
      ...formData,
      isDeleted: false,
      createdAt: serverTimestamp(),
      createdBy: {
        uid: user.uid,
        email: user.email
      }
    };
    
    // Basic validation
    for (const field of schema.fields) {
      if (field.required && !formData[field.name]) {
        setError(`Field "${field.name}" is required.`);
        setLoading(false);
        return;
      }
    }

    try {
      const collectionRef = collection(db, 'companies', companyId, `data_${schema.id}`);
      await addDoc(collectionRef, newDocument);
      setShowForm(false);
    } catch (err) {
      console.error("Error adding document: ", err);
      setError(err.message || "Failed to add document. Check security rules.");
    }
    setLoading(false);
  };
  
  const renderField = (field) => {
    const { name, type, options, required, placeholder } = field;
    const inputClass = "mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500";
    
    switch(type) {
      case 'text':
      case 'phone':
        return <input type={type === 'phone' ? 'tel' : 'text'} value={formData[name] || ''} onChange={(e) => handleChange(name, e.target.value, type)} className={inputClass} required={required} placeholder={placeholder} />;
      case 'date':
      case 'datetime':
        return <input type={type === 'datetime' ? 'datetime-local' : 'date'} value={formData[name] || ''} onChange={(e) => handleChange(name, e.target.value, type)} className={inputClass} required={required} />;
      case 'number':
        return <input type="number" value={formData[name] || ''} onChange={(e) => handleChange(name, e.target.value, type)} className={inputClass} required={required} placeholder={placeholder} />;
      case 'currency':
         return <input type="number" step="0.01" value={formData[name] || ''} onChange={(e) => handleChange(name, e.target.value, type)} className={inputClass} required={required} placeholder={placeholder} />;
      case 'dropdown':
        return (
          <select value={formData[name] || ''} onChange={(e) => handleChange(name, e.target.value, type)} className={`${inputClass} bg-white`} required={required}>
            <option value="">Select an option</option>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      default:
        return <p className="text-red-500">Unknown field type: {type}</p>;
    }
  };

  return (
    <Modal title={`Add New ${schema.name}`} setShowModal={setShowForm}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>}
        
        {schema.fields.map(field => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-slate-700">{field.name} {field.required && '*'}</label>
            {renderField(field)}
          </div>
        ))}
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 mt-6">
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// --- Admin Panel (NOW THE MODULE BUILDER & TEMPLATE INSTALLER) ---
const AdminView = ({ companyId, currentUserRole, modules }) => {
  const [activeTab, setActiveTab] = useState('templates'); // 'templates', 'builder', 'users'

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Admin Tabs */}
      <div className="flex border-b border-slate-300">
        <AdminTab name="Install Templates" id="templates" activeTab={activeTab} onClick={() => setActiveTab('templates')} />
        <AdminTab name="Module Builder" id="builder" activeTab={activeTab} onClick={() => setActiveTab('builder')} />
        <AdminTab name="User Management" id="users" activeTab={activeTab} onClick={() => setActiveTab('users')} />
      </div>

      {/* Render Active Tab Content */}
      <div className="animate-fadeIn">
        {activeTab === 'templates' && <TemplateInstallerView companyId={companyId} currentUserRole={currentUserRole} />}
        {activeTab === 'builder' && <ModuleBuilderView companyId={companyId} currentUserRole={currentUserRole} modules={modules} />}
        {activeTab === 'users' && <UserManagementView companyId={companyId} currentUserRole={currentUserRole} />}
      </div>
    </div>
  );
};

const AdminTab = ({ name, id, activeTab, onClick }) => (
  <button
    onClick={onClick}
    className={`py-3 px-6 font-medium text-sm transition-colors
      ${activeTab === id
        ? 'border-b-2 border-indigo-600 text-indigo-600'
        : 'text-slate-500 hover:text-slate-800'
      }
    `}
  >
    {name}
  </button>
);


// --- Template Installer Component ---
const TemplateInstallerView = ({ companyId, currentUserRole }) => {
  const [isPreviewing, setIsPreviewing] = useState(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState(null);
  
  // *** THIS IS THE NEW "SEED" BUTTON LOGIC ***
  const [isSeeding, setIsSeeding] = useState(false);
  const handleSeedTemplates = async () => {
    if (currentUserRole !== 'super_admin') {
      alert("Error: Only Super Admins can seed templates.");
      return;
    }
    if (!window.confirm(`Are you sure you want to seed all ${TEMPLATES.length} hard-coded templates to the /platform_templates collection in your database? This is a one-time operation.`)) {
      return;
    }
    
    setIsSeeding(true);
    setError(null);
    try {
      const batch = writeBatch(db);
      const collectionRef = collection(db, 'platform_templates');
      
      TEMPLATES.forEach(template => {
        const docRef = doc(collectionRef, template.id);
        batch.set(docRef, template);
      });
      
      await batch.commit();
      alert("Success! All templates have been seeded to the /platform_templates collection. You can now update the app to Phase 2.");
    } catch (err) {
      console.error("Error seeding templates: ", err);
      setError("Error seeding: " + err.message);
    }
    setIsSeeding(false);
  };
  
  
  const handleInstall = async (template) => {
    if (currentUserRole !== 'super_admin') {
      alert("Error: Only Super Admins can install new module templates.");
      return;
    }
    if (!window.confirm(`Are you sure you want to install the "${template.name}"? This will add ${template.modules.length} new modules.`)) {
      return;
    }
    
    setIsInstalling(true);
    setError(null);
    
    try {
      const batch = writeBatch(db);
      
      template.modules.forEach(moduleSchema => {
        const moduleRef = doc(db, 'companies', companyId, 'modules', moduleSchema.id);
        batch.set(moduleRef, {
          ...moduleSchema,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser.email
        });
      });
      
      await batch.commit();
      alert("Template installed successfully! The sidebar will update.");
    } catch (err) {
      console.error("Error installing template: ", err);
      setError(err.message);
    }
    setIsInstalling(false);
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">Install Templates</h2>
      <p className="text-slate-600 mb-6">Install pre-built module packs (like "Accounting" or "CRM") to get started quickly. Only Super Admins can install templates.</p>
      
      {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg my-4">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TEMPLATES.map(template => (
          <div key={template.id} className="border border-slate-200 rounded-lg shadow-md flex flex-col bg-slate-50">
            <div className="p-5">
              <h3 className="text-xl font-bold text-indigo-700">{template.name}</h3>
              <p className="text-slate-600 mt-2 text-sm">{template.description}</p>
            </div>
            <div className="bg-white p-4 mt-auto flex justify-end space-x-3 border-t border-slate-200">
              <button 
                onClick={() => setIsPreviewing(template)}
                className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors text-sm font-medium"
              >
                Preview
              </button>
              <button
                onClick={() => handleInstall(template)}
                disabled={isInstalling || currentUserRole !== 'super_admin'}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInstalling ? 'Installing...' : 'Install'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* --- NEW SEEDER BUTTON --- */}
      {currentUserRole === 'super_admin' && (
        <div className="mt-8 p-4 border-t border-dashed border-slate-300">
          <h3 className="text-lg font-semibold text-slate-700">Developer Tools</h3>
          <p className="text-sm text-slate-500 mb-3">This button will copy the 4 hard-coded templates from the app into the `/platform_templates` database collection. This is the first step for migrating to Phase 2.</p>
          <button
            onClick={handleSeedTemplates}
            disabled={isSeeding}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {isSeeding ? 'Seeding Database...' : 'Run One-Time Template Seed'}
          </button>
        </div>
      )}
      
      {isPreviewing && (
        <Modal title={`Preview: ${isPreviewing.name}`} setShowModal={() => setIsPreviewing(null)}>
          <p className="text-slate-600 mb-4">{isPreviewing.description}</p>
          <h4 className="text-lg font-semibold text-slate-800 mb-2">Modules to be installed:</h4>
          <div className="space-y-3">
            {isPreviewing.modules.map(module => (
              <div key={module.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                <h5 className="font-bold text-indigo-700">{module.name} (ID: <span className="font-mono text-sm">{module.id}</span>)</h5>
                <p className="text-sm text-slate-600">Fields:</p>
                <ul className="list-disc list-inside text-sm text-slate-500 pl-4">
                  {module.fields.map(field => (
                    <li key={field.name}>
                      {field.name} (<span className="font-mono text-xs">{field.type}</span>)
                      {field.options && ` [${field.options.join(', ')}]`}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
           <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 mt-6">
            <button onClick={() => setIsPreviewing(null)} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 transition-colors">
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};


// --- Module Builder Component ---
const ModuleBuilderView = ({ companyId, currentUserRole, modules }) => {
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleId, setNewModuleId] = useState('');
  const [newModuleIcon, setNewModuleIcon] = useState('Module');
  const [fields, setFields] = useState([{ name: '', type: 'text', options: [], required: true }]);

  const handleAddField = () => {
    setFields([...fields, { name: '', type: 'text', options: [], required: true }]);
  };
  
  const handleRemoveField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };
  
  const handleFieldChange = (index, event) => {
    const { name, value, type, checked } = event.target;
    const newFields = [...fields];
    newFields[index][name] = type === 'checkbox' ? checked : value;
    setFields(newFields);
  };
  
  const handleOptionsChange = (index, event) => {
     const { value } = event.target;
     const newFields = [...fields];
     newFields[index].options = value.split(',').map(opt => opt.trim());
     setFields(newFields);
  };
  
  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!newModuleName || !newModuleId) {
      alert("Please provide a Module Name and a unique Module ID (e.g., 'crm_leads')");
      return;
    }
    
    const newModuleSchema = {
      id: newModuleId.toLowerCase().replace(/\s+/g, '_'), // Ensure ID is safe
      name: newModuleName,
      icon: newModuleIcon,
      fields: fields.filter(f => f.name), // Only save fields with a name
      createdAt: serverTimestamp(),
    };
    
    try {
      const moduleRef = doc(db, 'companies', companyId, 'modules', newModuleSchema.id);
      await setDoc(moduleRef, newModuleSchema);
      // Reset form
      setNewModuleName('');
      setNewModuleId('');
      setNewModuleIcon('Module');
      setFields([{ name: '', type: 'text', options: [], required: true }]);
      alert(`Module "${newModuleName}" created successfully!`);
    } catch (err) {
      console.error("Error creating module: ", err);
      alert("Error: " + err.message);
    }
  };
  
  const allIcons = ['Dashboard', 'Transactions', 'Inventory', 'Admin', 'Sales', 'Purchase', 'Store', 'Accounts', 'Expense', 'Export', 'Logistics', 'Module'];

  if (currentUserRole !== 'super_admin') {
    return (
      <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
        <h2 className="text-2xl font-bold mb-4 text-slate-800">Module Builder</h2>
        <p className="text-red-600">Only Super Admins can create or edit new modules.</p>
        <h3 className="text-lg font-medium mt-6 text-slate-700">Current Modules</h3>
        <ul className="list-disc list-inside text-slate-600">
          {modules.map(m => <li key={m.id}>{m.name} (<span className="font-mono text-sm">{m.id}</span>)</li>)}
        </ul>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">Module Builder (Developer UI)</h2>
      <form onSubmit={handleCreateModule} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Module Name</label>
            <input type="text" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm" placeholder="e.g., CRM Leads" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Module ID (Unique)</label>
            <input type="text" value={newModuleId} onChange={(e) => setNewModuleId(e.target.value.toLowerCase().replace(/\s+/g, '_'))} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm" placeholder="e.g., crm_leads (no spaces)" />
          </div>
          <div>
             <label className="block text-sm font-medium text-slate-700">Icon</label>
             <select value={newModuleIcon} onChange={(e) => setNewModuleIcon(e.target.value)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm bg-white">
                {allIcons.map(icon => <option key={icon} value={icon}>{icon}</option>)}
             </select>
          </div>
        </div>
        
        <hr className="my-4" />
        
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-slate-800">Define Fields</h3>
          <button type="button" onClick={handleAddField} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 text-sm font-medium">
            + Add Field
          </button>
        </div>

        {fields.map((field, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-medium text-slate-700">Field Name</label>
              <input type="text" name="name" value={field.name} onChange={(e) => handleFieldChange(index, e)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm" placeholder="e.g., Lead Name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Field Type</label>
              <select name="type" value={field.type} onChange={(e) => handleFieldChange(index, e)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm bg-white">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="currency">Currency (INR)</option>
                <option value="date">Date</option>
                <option value="datetime">Date & Time</option>
                <option value="phone">Phone</option>
                <option value="dropdown">Dropdown</option>
              </select>
            </div>
            {field.type === 'dropdown' ? (
              <div>
                <label className="block text-xs font-medium text-slate-700">Options (comma-separated)</label>
                <input type="text" name="options" onChange={(e) => handleOptionsChange(index, e)} className="mt-1 block w-full border border-slate-300 rounded-md shadow-sm" placeholder="New,Contacted,Closed" />
              </div>
            ) : <div />}
            <div className="flex items-end justify-between">
               <div className="flex items-center h-full ml-4">
                  <input type="checkbox" name="required" checked={field.required} onChange={(e) => handleFieldChange(index, e)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                  <label className="ml-2 block text-sm text-slate-700">Required</label>
                </div>
              <button type="button" onClick={() => handleRemoveField(index)} className="text-slate-400 hover:text-red-600 p-1">
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.577 0c-.295.009-.59.026-.88.05c-.29.024-.58.052-.87.083m-1.577 0a48.11 48.11 0 013.478-.397m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            </div>
          </div>
        ))}
        
        <div className="flex justify-end pt-4 border-t border-slate-200 mt-6">
          <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-colors">
            Create Module
          </button>
        </div>
      </form>
    </div>
  );
};


// --- User Management Component ---
const UserManagementView = ({ companyId, currentUserRole }) => {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  useEffect(() => {
    if (!db || !companyId) return;
    const usersQuery = query(collection(db, 'users'), where("companyId", "==", companyId));
    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoadingUsers(false);
    });
    return () => unsubscribe();
  }, [companyId]);
  
  const handleRoleChange = async (targetUserId, newRole) => {
    if (currentUserRole !== 'super_admin' && newRole === 'super_admin') {
      alert("Error: Only a Super Admin can assign another Super Admin.");
      return;
    }
    // This is a "write" operation. Our firestore.rules will automatically
    // check if the current user is an 'admin' and block this if they are not.
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { role: newRole });
    } catch (err) {
      console.error("Error updating role:", err);
      alert("Error updating role. You may not have permission. " + err.message);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-slate-200">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">User Management</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loadingUsers ? <tr><td colSpan="2" className="p-4 text-center text-slate-500">Loading users...</td></tr> : users.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowTsp text-sm">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    // Only Super Admins can modify a Super Admin's role
                    disabled={user.role === 'super_admin' && currentUserRole !== 'super_admin'}
                    className="block w-full border-slate-300 rounded-md shadow-sm bg-white p-2"
                  >
                    <option value="read_only">Read Only</option>
                    <option value="user">User (Can Add)</option>
                    <option value="admin">Admin</option>
                    {/* Only a Super Admin can *see* the option to make someone else a Super Admin */}
                    {currentUserRole === 'super_admin' && (
                      <option value="super_admin">Super Admin</option>
                    )}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// --- Mount the App ---
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Root element #root not found. Please ensure your index.html has a <div id='root'></div>.");
}

