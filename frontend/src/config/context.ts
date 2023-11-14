let API_URL: string;
let BASE_URL: string;

if (process.env.NODE_ENV === "development") {
    API_URL = "http://localhost:5001/ekkoappv0/us-central1/api";
    BASE_URL = "http://localhost:3000";
} else {
    // if undefined, its running in firebase hosting and not locally
    API_URL = "https://us-central1-ekkoappv0.cloudfunctions.net/api";
    BASE_URL = "https://ekkoappv0.web.app";
}

export { API_URL, BASE_URL };
