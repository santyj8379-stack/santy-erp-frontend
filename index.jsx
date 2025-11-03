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

// --- Helper Components & Functions ---
const getIcon = (name) => {
  const icons = {
    Dashboard: 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v4.875h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
    Admin: 'M11.123 2.25l.498.498-6.17 6.17a.75.75 0 00-.22.53l-.26 2.798a.75.75 0 00.925.925l2.798-.26a.75.75 0 00.53-.22l6.17-6.17.498.498a.75.75 0 001.06 0l1.272-1.272a.75.75 0 000-1.06l-4.98-4.98a.75.75 0 00-1.06 0l-1.272 1.272a.75.75 0 000 1.061zm-3.08 7.32L6.75 8.25l5.903-5.903 1.293 1.293-5.902 5.902zM15 13.5a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H15zm-1.5-1.5a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3a.75.75 0 01-.75-.75zM15 9a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H15zM3 3.75A1.5 1.5 0 014.5 2.25h6.19a.75.75 0 00.53-.22L13.34.91a2.25 2.25 0 013.182 0l4.98 4.98a2.25 2.25 0 010 3.182l-1.12 1.12a.75.75 0 00-.22.53v6.19A1.5 1.5 0 0118.75 18H15a.75.75 0 000 1.5h3.75A2.25 2.25 0 0021 17.25V4.5A2.25 2.25 0 0018.75 2.25h-3.52a.75.75 0 00-.53.22L13.58 3.6a.75.75 0 01-1.06 0L10.4 1.48a.75.75 0 00-.53-.22H4.5A1.5 1.5 0 003 3.75v13.5A1.5 1.5 0 004.5 18h6.19a.75.75 0 00.53.22l1.12 1.12a2.25 2.25 0 010 3.182l-4.98 4.98a2.25 2.25 0 01-3.182 0l-1.12-1.12a.75.75 0 00-.53-.22H4.5A2.25 2.25 0 012.25 17.25V3.75z',
    Logout: 'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m-3 0l3-3m0 0l-3-3m3 3H9',
    Close: 'M6 18L18 6M6 6l12 12',
    Trash: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.577 0c-.295.009-.59.026-.88.05c-.29.024-.58.052-.87.083m-1.577 0a48.11 48.11 0 013.478-.397m7.5 0a48.667 48.667 0 00-7.5 0',
    Recover: 'M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3',
    Module: 'M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.125 1.125 0 010 2.25H5.625a1.125 1.125 0 010-2.25z'
  };
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d={icons[name] || icons.Module} />
  </svg>;
};

const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
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

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
    <div className="flex flex-col items-center">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      <p className="mt-4 text-xl font-semibold">Loading Business Platform...</p>
    </div>
  </div>
);

const Modal = ({ children, title, setShowModal }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center animate-fadeIn" onClick={() => setShowModal(false)}>
    <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center p-4 border-b">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
          <span className="w-6 h-6">{getIcon('Close')}</span>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

// --- Authentication Hooks & Components ---

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
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center text-blue-400">{isLogin ? 'Business Platform Login' : 'Create Account'}</h2>
        <p className="text-center text-gray-400 text-sm">{isLogin ? 'Log in to access your company dashboard.' : 'After signing up, please contact your Super Admin to have your account activated.'}</p>
        <form onSubmit={handleAuthAction} className="space-y-6">
          {error && <div className="p-3 bg-red-800 text-red-100 rounded-lg text-center">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <div>
            <button type="submit" disabled={loading} className="w-full px-4 py-2 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition-all duration-200 disabled:opacity-50">
              {loading ? 'Processing...' : (isLogin ? 'Log In' : 'Sign Up')}
            </button>
          </div>
        </form>
        <div className="text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-blue-400 hover:underline">
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
    return <div className="flex flex-col items-center justify-center h-screen bg-gray-100 text-red-500">
       <h1 className="text-2xl font-bold mb-4">Account Not Activated</h1>
       <p className="text-center mb-4">{profileError || "Your user profile could not be found."}<br/> Please contact your Super Admin to have your account set up.</p>
       <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Log Out</button>
     </div>;
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
    return <PlaceholderView department="Unknown" />;
  };
  
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-lg">
        <div className="text-2xl font-bold p-5 border-b border-gray-700">Business Platform</div>
        <nav className="flex-1 overflow-y-auto">
          {/* Static Dashboard Link */}
          <button
            onClick={() => setActiveView('Dashboard')}
            className={`w-full flex items-center space-x-3 p-4 text-left transition-all duration-200 ${
              activeView === 'Dashboard' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="w-6 h-6">{getIcon('Dashboard')}</span>
            <span>Dashboard</span>
          </button>
          
          {/* Dynamic Module Links */}
          {modules.map(module => (
            <button
              key={module.id}
              onClick={() => setActiveView(module.id)}
              className={`w-full flex items-center space-x-3 p-4 text-left transition-all duration-200 ${
                activeView === module.id ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="w-6 h-6">{getIcon(module.icon)}</span>
              <span>{module.name}</span>
            </button>
          ))}
          
          {/* Static Admin Link (Role-Gated) */}
          {(userRole === 'admin' || userRole === 'super_admin') && (
            <button
              onClick={() => setActiveView('Admin')}
              className={`w-full flex items-center space-x-3 p-4 text-left transition-all duration-200 ${
                activeView === 'Admin' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="w-6 h-6">{getIcon('Admin')}</span>
              <span>Admin Panel</span>
            </button>
          )}
        </nav>
        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-700 text-sm text-gray-400 space-y-2">
          <div>
            <span className={`px-2 py-1 text-xs font-bold text-white rounded ${profile.role === 'super_admin' ? 'bg-red-600' : 'bg-blue-500'}`}>{profile.role || '...'}</span>
            <br />
            <span className="font-mono text-xs break-all text-gray-400">{user.email}</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 p-3 text-left transition-all duration-200 text-red-400 hover:bg-red-800 hover:text-white rounded-lg"
          >
            <span className="w-6 h-6">{getIcon('Logout')}</span>
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-md p-4 flex justify-between items-center z-10">
          <h1 className="text-3xl font-bold text-gray-800">{activeModuleSchema?.name || activeView}</h1>
          {/* Dynamic "Add New" button */}
          {activeModuleSchema && (userRole !== 'read_only') && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
            >
              + Add New {activeModuleSchema.name}
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto p-6">
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

// --- DYNAMIC VIEWS & COMPONENTS ---

const DashboardView = ({ companyId, modules }) => {
  // This view is now simplified. We pass in the module list
  // to potentially show stats about each module.
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Modules" value={modules.length} loading={!modules} />
        <StatCard title="Company ID" value={companyId} loading={!companyId} />
        <StatCard title="Status" value="Platform Active" loading={false} type="success" />
      </div>
       <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Welcome to Your Dynamic Platform!</h2>
          <p className="text-gray-700">
            This is your new dashboard. The sidebar is now built dynamically from the modules
            you create in the **Admin Panel**.
          </p>
           <p className="text-gray-700 mt-4">
            To get started, go to the **Admin Panel** &gt; **Module Builder** and create your
            first module, such as "CRM Leads" or "Transactions".
          </p>
        </div>
    </div>
  );
};

const StatCard = ({ title, value, loading, type = 'default' }) => {
  const colorClasses = {
    success: 'text-green-500',
    danger: 'text-red-500',
    default: 'text-gray-900'
  };
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {loading ? (
        <div className="h-8 bg-gray-200 rounded animate-pulse mt-2"></div>
      ) : (
        <p className={`text-3xl font-bold mt-1 ${colorClasses[type]} truncate`}>{value}</p>
      )}
    </div>
  );
};

// --- THIS IS THE NEW "ENGINE" ---
// This component renders a table and form for ANY module you design.
const DynamicModuleView = ({ schema, companyId, userRole }) => {
  const { data, loading } = useModuleData(companyId, schema.id);

  // Dynamically get table headers from the schema
  // We'll show the first 4 fields by default.
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
    <div className="bg-white p-6 rounded-lg shadow-lg animate-fadeIn">
      <h2 className="text-2xl font-bold mb-4">{schema.name}</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Render headers dynamically */}
              {tableHeaders.map(header => (
                <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
              ))}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
              {(userRole === 'admin' || userRole === 'super_admin') && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={tableHeaders.length + 2} className="text-center p-4">Loading...</td></tr>
            ) : (
              data.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  {/* Render data dynamically */}
                  {tableHeaders.map(header => (
                    <td key={`${item.id}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {item[header] ? (schema.fields.find(f => f.name === header)?.type === 'currency' ? formatCurrency(item[header]) : item[header].toString()) : 'N/A'}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.createdBy?.email || 'N/A'}</td>
                  {(userRole === 'admin' || userRole === 'super_admin') && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button onClick={() => handleSoftDelete(item.id)} className="text-red-600 hover:text-red-900">Delete</button>
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
// This component renders a form for ANY module you design.
const DynamicModuleForm = ({ schema, setShowForm, companyId, user }) => {
  const [formData, setFormData] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle form input changes dynamically
  const handleChange = (fieldName, value, fieldType) => {
    let processedValue = value;
    if (fieldType === 'number' || fieldType === 'currency') {
      processedValue = parseFloat(value) || 0; // Use 0 if parse fails
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
      if (field.required && (formData[field.name] === undefined || formData[field.name] === '')) {
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
  
  // Dynamically build the form based on schema fields
  const renderField = (field) => {
    const { name, type, options, required } = field;
    
    const commonProps = {
      value: formData[name] || '',
      onChange: (e) => handleChange(name, e.target.value, type),
      className: "mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm",
      required: required || false // Add required attribute to input
    };

    switch(type) {
      case 'text':
      case 'phone':
        return <input type="text" {...commonProps} />;
      case 'date':
        return <input type="date" {...commonProps} />;
      case 'number':
        return <input type="number" {...commonProps} />;
      case 'currency':
         return <input type="number" step="0.01" {...commonProps} />;
      case 'dropdown':
        return (
          <select {...commonProps} required={required || false}>
            <option value="">Select an option</option>
            {options && options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
            <label className="block text-sm font-medium text-gray-700">
              {field.name} {field.required && <span className="text-red-500">*</span>}
            </label>
            {renderField(field)}
          </div>
        ))}
        
        <div className="flex justify-end space-x-3 pt-4">
          <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? "Saving..." : "Save"}</button>
        </div>
      </form>
    </Modal>
  );
};

const PlaceholderView = ({ department }) => (
  <div className="bg-white p-10 rounded-lg shadow-lg text-center animate-fadeIn">
    <h2 className="text-3xl font-bold text-gray-800 mb-2">{department}</h2>
    <p className="text-lg text-gray-600">This module is under construction.</p>
  </div>
);

// --- Admin Panel (NOW THE MODULE BUILDER) ---
const AdminView = ({ companyId, currentUserRole, modules }) => {
  // 1. User Management (Stays the same)
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
    try {
      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, { role: newRole });
    } catch (err) {
      alert("Error updating role: " + err.message);
    }
  };
  
  // 2. NEW! Module Builder
  const [newModuleName, setNewModuleName] = useState('');
  const [newModuleId, setNewModuleId] = useState('');
  const [newModuleIcon, setNewModuleIcon] = useState('Module');
  const [fields, setFields] = useState([{ name: '', type: 'text', options: [], required: true }]);

  const handleAddField = () => {
    setFields([...fields, { name: '', type: 'text', options: [], required: true }]);
  };

  const handleRemoveField = (index) => {
    const newFields = fields.filter((_, i) => i !== index);
    setFields(newFields);
  };
  
  const handleFieldChange = (index, event) => {
    const { name, value, type, checked } = event.target;
    const newFields = [...fields];
    
    if (type === 'checkbox') {
      newFields[index][name] = checked;
    } else {
      newFields[index][name] = value;
    }
    
    // Reset options if type is not dropdown
    if (name === 'type' && value !== 'dropdown') {
      newFields[index].options = [];
    }
    
    setFields(newFields);
  };
  
  const handleOptionsChange = (index, event) => {
     const { value } = event.target;
     const newFields = [...fields];
     // Split by comma, trim whitespace
     newFields[index].options = value.split(',').map(opt => opt.trim().replace(/['"]+/g, '')); // Remove quotes
     setFields(newFields);
  };
  
  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!newModuleName || !newModuleId) {
      alert("Please provide a Module Name and a unique Module ID (e.g., 'crm_leads')");
      return;
    }
    
    // Validate fields
    const validFields = fields.filter(f => f.name.trim());
    if (validFields.length === 0) {
      alert("You must define at least one field for the module.");
      return;
    }
    
    const newModuleSchema = {
      id: newModuleId.toLowerCase().replace(/\s+/g, '_'), // Ensure ID is safe
      name: newModuleName,
      icon: newModuleIcon,
      fields: validFields, // Only save fields with a name
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

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Module Builder Panel (Only for Super Admin) */}
      {currentUserRole === 'super_admin' && (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Module Builder (Developer UI)</h2>
          <form onSubmit={handleCreateModule} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Module Name</label>
                <input type="text" value={newModuleName} onChange={(e) => setNewModuleName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm" placeholder="e.g., CRM Leads" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Module ID (Unique)</label>
                <input type="text" value={newModuleId} onChange={(e) => setNewModuleId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm" placeholder="e.g., crm_leads (no spaces)" />
              </div>
              <div>
                 <label className="block text-sm font-medium text-gray-700">Icon</label>
                 <select value={newModuleIcon} onChange={(e) => setNewModuleIcon(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm bg-white">
                    {allIcons.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                 </select>
              </div>
            </div>
            
            <hr className="my-4" />
            
            <h3 className="text-lg font-medium">Define Fields</h3>
            {fields.map((field, index) => (
              <div key={index} className="relative grid grid-cols-1 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg border">
                {/* Remove Field Button */}
                {fields.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveField(index)} 
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                  >
                    &times;
                  </button>
                )}
                
                <div>
                  <label className="block text-xs font-medium text-gray-700">Field Name</label>
                  <input type="text" name="name" value={field.name} onChange={(e) => handleFieldChange(index, e)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm" placeholder="e.g., Lead Name" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Field Type</label>
                  <select name="type" value={field.type} onChange={(e) => handleFieldChange(index, e)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm bg-white">
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="currency">Currency (INR)</option>
                    <option value="date">Date</option>
                    <option value="phone">Phone</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                </div>
                {field.type === 'dropdown' ? (
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Dropdown Options (comma-separated)</label>
                    <input type="text" name="options" onChange={(e) => handleOptionsChange(index, e)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm" placeholder="e.g., New, Contacted, Closed" />
                  </div>
                ) : <div />}
                 <div className="flex items-end pb-1">
                  <input 
                    type="checkbox" 
                    name="required" 
                    checked={field.required} 
                    onChange={(e) => handleFieldChange(index, e)} 
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded" 
                    id={`required-${index}`} 
                  />
                  <label htmlFor={`required-${index}`} className="ml-2 block text-sm text-gray-900">Required</label>
                </div>
              </div>
            ))}
            
            <div className="flex justify-between items-center pt-4">
              <button type="button" onClick={handleAddField} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                + Add Another Field
              </button>
              <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">
                Create Module
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium">Current Modules</h3>
            <ul className="list-disc list-inside">
              {modules.map(m => <li key={m.id}>{m.name} (ID: {m.id})</li>)}
            </ul>
          </div>
        </div>
      )}
      
      {/* User Management Panel (Stays the same) */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">User Management</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
             <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingUsers ? <tr><td colSpan="2">Loading...</td></tr> : users.map(user => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={user.role === 'super_admin' && currentUserRole !== 'super_admin'}
                      className="block w-full border-gray-300 rounded-md shadow-sm"
                    >
                      <option value="read_only">Read Only</option>
                      <option value="user">User (Can Add)</option>
                      <option value="admin">Admin</option>
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

