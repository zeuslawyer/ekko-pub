import * as functions from "firebase-functions";

// collection names
let USER_COLLECTION = "DEV_USERS";
let LINK_COLLECTION = "DEV_LINKS";
let ERROR_COLLECTION = "DEV_ERRORS";

// environment variables
let CURRENT_ENV: "development" | "production" | "staging";

CURRENT_ENV = "development";
const FIREBASE_ENV = functions.config();

if (FIREBASE_ENV.app) {
    CURRENT_ENV = FIREBASE_ENV.app.context;

    if (CURRENT_ENV === "staging") {
        USER_COLLECTION = "STG_USERS";
        LINK_COLLECTION = "STG_LINKS";
        ERROR_COLLECTION = "STG_ERRORS";
    } else if (CURRENT_ENV === "production") {
        USER_COLLECTION = "PRD_USERS";
        LINK_COLLECTION = "PRD_LINKS";
        ERROR_COLLECTION = "PRD_ERRORS";
    }
}

// api path
let API_URL: string;
let BASE_URL: string;
if (CURRENT_ENV === "development") {
    API_URL = "http://localhost:5001/ekkoappv0/us-central1/api";
    BASE_URL = "http://localhost:3000";
} else {
    API_URL = "https://us-central1-ekkoappv0.cloudfunctions.net/api";
    BASE_URL = "https://ekkoappv0.web.app";
}

export {
    USER_COLLECTION,
    LINK_COLLECTION,
    ERROR_COLLECTION,
    CURRENT_ENV,
    FIREBASE_ENV,
    API_URL,
    BASE_URL,
};
