import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
	apiKey: "AIzaSyB4f-X8GHKK_91_BE55TLkiFvFIbZdfL7I",
	authDomain: "alyce-gps.firebaseapp.com",
	projectId: "alyce-gps",
	storageBucket: "alyce-gps.appspot.com",
	messagingSenderId: "134802377511",
	appId: "1:134802377511:web:d0e4cbf56b345ef851f702",
	measurementId: "G-9YLK1TS1XZ",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
