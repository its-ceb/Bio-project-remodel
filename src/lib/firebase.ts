import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBvwXsjmR3lpw_G41aSrpYHmkEa0d2l8xc",
  authDomain: "bio-project-chat.firebaseapp.com",
  databaseURL: "https://bio-project-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bio-project-chat",
  storageBucket: "bio-project-chat.firebasestorage.app",
  messagingSenderId: "505418063500",
  appId: "1:505418063500:web:5c59c1536061be7f8265a9",
  measurementId: "G-ZGG0QNM6Z9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize & export Realtime Database
export const database = getDatabase(app);

// Initialize Analytics safely
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

export default app;