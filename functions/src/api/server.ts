import * as express from "express";
import * as functions from "firebase-functions";

import { configUserRouter } from "./routes/configUser";
import { CURRENT_ENV } from "../contexts";

const app = express();

// middleware
// CORS.  NOTE: Firebase needs preflight approval for PUT, DELETE etc
// reference:  https://enable-cors.org/server_expressjs.html
app.use(function (req, res, next) {
    if (CURRENT_ENV === "development") {
        res.header("Access-Control-Allow-Origin", "http://localhost:3000");
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept"
        );
    } else {
        res.header("Access-Control-Allow-Origin", "https://ekkoappv0.web.app");
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, X-Requested-With, Content-Type, Accept"
        );
    }

    res.set("Access-Control-Allow-Methods", "PUT");

    next();
});

// routers
app.use(configUserRouter);

// catch all
app.all("*", async (req, res) => {
    throw new Error("Server Endpoint not found.");
});

// TODO
// server.use(errorHandler); // goes last

export const server = functions.https.onRequest(app);
