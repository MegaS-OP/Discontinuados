import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBiwlQ-MRDeLWV4YFhb4B-0Bro_xRIeNTI",
  authDomain: "discontinuados-megalabs.firebaseapp.com",
  databaseURL: "https://discontinuados-megalabs-default-rtdb.firebaseio.com",
  projectId: "discontinuados-megalabs",
  storageBucket: "discontinuados-megalabs.firebasestorage.app",
  messagingSenderId: "304152428140",
  appId: "1:304152428140:web:628c3ec8c5d3a28466e249",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
