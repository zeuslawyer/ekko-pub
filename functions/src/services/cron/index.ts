import * as functions from "firebase-functions";
import { appDb } from "../../db/db";

/** runs the outbound email process */
export const sendMail = functions.https.onRequest(async (request, response) => {
    console.log("Cron hit the endpoint.  Starting job.");

    // Check is POST
    if (request.method.toLowerCase() !== "post") {
        response.status(400).end();
        return;
    }

    appDb
        .doEmailTask()
        .catch(err => console.error("Cron Error: ", err.message));

    response.send("OK");
});
