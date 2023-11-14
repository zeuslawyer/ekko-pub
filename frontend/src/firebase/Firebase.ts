import firebase from "firebase/app";
// If you enabled Analytics in your project, add the Firebase SDK for Analytics
import "firebase/analytics";

// Add the Firebase products that you want to use
import "firebase/auth";
import "firebase/firestore";
import { firebaseConfig } from "../config/firebaseconfig";
import axios from "axios";
import { API_URL } from "../config/context";

console.log("CONTEXT", process.env.NODE_ENV);
class _Firebase {
    app: firebase.app.App;
    firestore: firebase.firestore.Firestore;
    auth: firebase.auth.Auth;

    constructor() {
        firebase.initializeApp(firebaseConfig);
        this.app = firebase.app();
        this.firestore = this.app.firestore();
        this.auth = this.app.auth();
    }

    async registerWithTz(data: { tz: string; email: string; pwd: string }) {
        const url = API_URL + "/register";
        return axios.put(url, data);
    }
}

export const Firebase = new _Firebase();
