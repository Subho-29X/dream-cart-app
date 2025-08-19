"use client"; // This is the fix! It tells Next.js to run this code in the browser.

// ---------------------------------------------------------------- //
// ----------------- DREAM CART APPLICATION ----------------------- //
// ---------------------------------------------------------------- //
// This is a full-stack Next.js application.
// It uses Firebase for authentication and Firestore for the database.
// All components are included in this single file for portability.
// ---------------------------------------------------------------- //

import React, { useState, useEffect, createContext, useContext } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";

// --- Helper: Lucide Icons (as inline SVGs for portability) ---
// Using inline SVGs removes the need for an external library.

const Plus = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const LogOut = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const Trash2 = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" x2="10" y1="11" y2="17" />
    <line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

const Edit = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const X = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const Loader = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="animate-spin"
    {...props}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// ---------------------------------------------------------------- //
// --------------------- FIREBASE SETUP --------------------------- //
// ---------------------------------------------------------------- //

// IMPORTANT: Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-SSSQfJLJw-_uggsFOjXgsYCzSmnzayE",
  authDomain: "dream-cart-app.firebaseapp.com",
  projectId: "dream-cart-app",
  storageBucket: "dream-cart-app.firebasestorage.app",
  messagingSenderId: "607990550092",
  appId: "1:607990550092:web:0e32d76bf0fa97856aeee9",
};

// Initialize Firebase
// We add a check to prevent re-initialization in a Next.js hot-reload environment.
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase initialization error:", error.message);
  // You should display a user-friendly error message here
}

// ---------------------------------------------------------------- //
// -------------------- AUTHENTICATION CONTEXT -------------------- //
// ---------------------------------------------------------------- //
// This context provides user authentication state to the entire app.

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// ---------------------------------------------------------------- //
// -------------------- UI COMPONENTS ----------------------------- //
// ---------------------------------------------------------------- //

// --- Add/Edit Item Modal Component ---
const ItemModal = ({ item, onClose, onSave }) => {
  const [name, setName] = useState(item ? item.name : "");
  const [imageUrl, setImageUrl] = useState(item ? item.imageUrl : "");
  const [price, setPrice] = useState(item ? item.price : "");
  const [priority, setPriority] = useState(
    item ? item.priority : "good-to-have"
  );
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !imageUrl) {
      setError("Please fill in at least the name and image URL.");
      return;
    }
    setError("");
    setIsSaving(true);

    const itemData = {
      name,
      imageUrl,
      price: price ? parseFloat(price) : 0,
      priority,
    };

    await onSave(itemData);
    setIsSaving(false);
    onClose();
  };

  const priorityClasses = {
    "must-have": "bg-red-500/20 text-red-300 border-red-500/50",
    "good-to-have": "bg-blue-500/20 text-blue-300 border-blue-500/50",
    "long-term-goal": "bg-purple-500/20 text-purple-300 border-purple-500/50",
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-900/80 border border-gray-700 rounded-2xl shadow-2xl shadow-purple-500/10 p-8 w-full max-w-md relative animate-fade-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X />
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">
          {item ? "Edit Dream Item" : "Add a New Dream"}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Item Name (e.g., Sony Headphones)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
            />
            <input
              type="text"
              placeholder="Image URL"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
            />
            <input
              type="number"
              placeholder="Estimated Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
            />

            <div>
              <label className="text-sm font-medium text-gray-400 mb-2 block">
                Priority
              </label>
              <div className="flex space-x-2">
                {Object.entries({
                  "must-have": "Must Have!",
                  "good-to-have": "Good to Have",
                  "long-term-goal": "Long-term Goal",
                }).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPriority(key)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-full border transition-all duration-200 ${
                      priority === key
                        ? priorityClasses[key] +
                          " ring-2 ring-offset-2 ring-offset-gray-900 " +
                          priorityClasses[key].replace("bg-", "ring-")
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              {isSaving ? <Loader /> : item ? "Save Changes" : "Add to Cart"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Dream Item Card Component ---
const ItemCard = ({ item, onEdit, onDelete }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(item.id);
    // No need to set isDeleting to false as the component will unmount
  };

  const priorityStyles = {
    "must-have": {
      label: "Must Have!",
      classes: "bg-red-500/10 text-red-400 border border-red-500/20",
      glow: "shadow-red-500/20",
    },
    "good-to-have": {
      label: "Good to Have",
      classes: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
      glow: "shadow-blue-500/20",
    },
    "long-term-goal": {
      label: "Long-term Goal",
      classes: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
      glow: "shadow-purple-500/20",
    },
  };

  const style = priorityStyles[item.priority] || priorityStyles["good-to-have"];

  return (
    <div
      className={`bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden group relative transition-all duration-300 hover:border-purple-500/50 hover:shadow-2xl hover:shadow-purple-500/10 ${style.glow} animate-fade-in`}
    >
      <div className="absolute top-3 right-3 z-10 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={() => onEdit(item)}
          className="bg-gray-800/50 backdrop-blur-sm p-2 rounded-full text-gray-300 hover:text-white hover:bg-blue-500/50 transition-colors"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="bg-gray-800/50 backdrop-blur-sm p-2 rounded-full text-gray-300 hover:text-white hover:bg-red-500/50 transition-colors"
        >
          {isDeleting ? (
            <Loader className="w-4 h-4" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>

      <img
        src={item.imageUrl}
        alt={item.name}
        className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src =
            "https://placehold.co/600x400/0f172a/94a3b8?text=Image+Not+Found";
        }}
      />
      <div className="p-5">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-bold text-white mb-2 pr-4">
            {item.name}
          </h3>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${style.classes}`}
          >
            {style.label}
          </span>
        </div>
        {item.price > 0 && (
          <p className="text-2xl font-light text-purple-400">
            ${item.price.toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- //
// -------------------- PAGES / SCREENS --------------------------- //
// ---------------------------------------------------------------- //

// --- Dashboard Page (Main Screen) ---
const Dashboard = () => {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [fetchError, setFetchError] = useState(null); // New state for fetch errors

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setFetchError(null); // Reset error on re-fetch

    // Set up a real-time listener for the user's dream items
    const q = query(collection(db, "users", user.uid, "dreamItems"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const itemsData = [];
        querySnapshot.forEach((doc) => {
          itemsData.push({ id: doc.id, ...doc.data() });
        });
        setItems(itemsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching items:", error);
        // Check for permission denied error and set a user-friendly message
        if (error.code === "permission-denied") {
          setFetchError(
            "Permission Denied: Could not load your items. Please ensure your Firestore security rules are set up correctly in the Firebase console."
          );
        } else {
          setFetchError("An error occurred while fetching your items.");
        }
        setLoading(false);
      }
    );

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [user]);

  const handleAddItem = async (itemData) => {
    if (!user) return;
    try {
      await addDoc(collection(db, "users", user.uid, "dreamItems"), itemData);
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const handleEditItem = async (itemData) => {
    if (!user || !editingItem) return;
    try {
      const itemRef = doc(db, "users", user.uid, "dreamItems", editingItem.id);
      await updateDoc(itemRef, itemData);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "dreamItems", itemId));
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  const handleOpenModal = (item = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const handleSave = (itemData) => {
    if (editingItem) {
      handleEditItem(itemData);
    } else {
      handleAddItem(itemData);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="absolute top-0 left-0 w-full h-full bg-grid-gray-700/[0.2] z-0"></div>
      <div className="relative z-10">
        <header className="py-6 px-4 sm:px-8 flex justify-between items-center border-b border-gray-800">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            My Dream Cart
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-400 hidden sm:block">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 rounded-full text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <LogOut />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-8">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader className="w-8 h-8 text-purple-500" />
            </div>
          ) : fetchError ? (
            <div className="text-center py-10 px-4 bg-red-900/20 border border-red-500/30 rounded-lg">
              <h2 className="text-2xl font-bold text-red-400 mb-4">
                Failed to Load Data
              </h2>
              <p className="text-red-300 max-w-lg mx-auto">{fetchError}</p>
              <p className="text-gray-500 mt-4 text-sm">
                Please go to Firestore {" > "} Rules in your Firebase project
                and ensure they allow reads for authenticated users.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="text-3xl font-bold text-gray-400 mb-4">
                Your Dream Cart is Empty
              </h2>
              <p className="text-gray-500 mb-8">
                Let's add something you're aspiring to own!
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="mr-2 -ml-1" />
                Add First Dream
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleOpenModal}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </main>

        {/* Floating Action Button */}
        {items.length > 0 && !fetchError && (
          <button
            onClick={() => handleOpenModal()}
            className="fixed bottom-8 right-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white p-4 rounded-full shadow-lg shadow-purple-500/30 hover:scale-110 transition-transform duration-300 z-20"
          >
            <Plus className="w-8 h-8" />
          </button>
        )}

        {isModalOpen && (
          <ItemModal
            item={editingItem}
            onClose={handleCloseModal}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  );
};

// --- Login/Signup Page ---
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
        <div className="absolute inset-0 bg-grid-purple-500/[0.05]"></div>
      </div>
      <div className="w-full max-w-md bg-gray-900/60 backdrop-blur-xl border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-500/10 p-8 z-10 animate-fade-in">
        <h1 className="text-4xl font-bold text-center text-white mb-2">
          Dream Cart
        </h1>
        <p className="text-center text-gray-400 mb-8">
          Visualize your future purchases.
        </p>

        <form onSubmit={handleAuthAction}>
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:outline-none transition"
              required
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:bg-purple-800 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader /> : isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-400 mt-6">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-purple-400 hover:text-purple-300 ml-2"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- //
// -------------------- MAIN APP COMPONENT ------------------------ //
// ---------------------------------------------------------------- //
// This component handles the routing between the Login page and the
// Dashboard based on the user's authentication status.

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const AppContent = () => {
  const { user, loading } = useAuth();

  // The main CSS for the app, including custom animations
  const GlobalStyles = () => {
    const css = `
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.5s ease-out forwards;
            }
            .bg-grid-gray-700\\[\\[0\\.2\\]] {
                background-image: linear-gradient(to right, rgba(107, 114, 128, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(107, 114, 128, 0.1) 1px, transparent 1px);
                background-size: 30px 30px;
            }
            .bg-grid-purple-500\\[\\[0\\.05\\]] {
                background-image: linear-gradient(to right, rgba(168, 85, 247, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(168, 85, 247, 0.05) 1px, transparent 1px);
                background-size: 40px 40px;
            }
        `;
    return <style dangerouslySetInnerHTML={{ __html: css }} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center">
        <Loader className="w-10 h-10 text-purple-500" />
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      {user ? <Dashboard /> : <LoginPage />}
    </>
  );
};
