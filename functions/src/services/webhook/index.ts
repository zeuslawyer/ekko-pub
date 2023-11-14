import * as functions from "firebase-functions";
import * as crypto from "crypto";

import { CURRENT_ENV } from "../../contexts";
import { appDb, firebaseAdmin } from "../../db/db";
import { IError } from "../../db/models";
import { logToSlack } from "../Slack/DevLogger";

// reference: https://www.zoho.com/mail/help/dev-platform/webhook.html#alink4
export interface IZohoMail {
    summary: string;
    sentDateInGMT: number;
    subject: string;
    sender: string;
    messageId: number;
    toAddress: string;
    ccAddress: string;
    fromAddress: string;
    zuid: number;
    size: number;
    receivedTime: number;
    html: string;
    folderId: string;
}

// Helper function. Runs only on the first request from ZOHO.
function VerifyWebhookRequest(
    request: functions.https.Request,
    secret: string
) {
    const headerHash = request.headers["x-hook-signature"];
    const createdHash = crypto
        .createHmac("sha256", secret)
        .update(request.body)
        .digest("base64");
    return headerHash === createdHash;
}

export const mailHook = functions.https.onRequest(async (request, response) => {
    const incoming = request.body as IZohoMail;

    // Check is POST
    if (request.method.toLowerCase() !== "post") {
        response.status(400).end();
        return;
    }

    // if POST, check for secret
    if (!incoming?.messageId) {
        if (request.headers["x-hook-secret"]) {
            console.log(" SECRET ", request.headers["x-hook-secret"]);
            const headersRef = firebaseAdmin
                .firestore()
                .collection("ZOHO")
                .doc("secret");

            await headersRef.set({
                [`${CURRENT_ENV}-ZOHO`]: request.headers["x-hook-secret"],
            });
        }
        response.status(200).end();
        return;
    }

    logToSlack(
        {
            message: `(Webhook endoint OK) Received email from: ${incoming.fromAddress}`,
        },
        "INFO"
    );

    // process email and user
    appDb.processIncoming(incoming).catch(error => {
        const err = {
            type: "incoming_mail",
            userEmail: incoming.fromAddress,
            message: `(Webhook endoint Error). ${error.message}`,
            stack: error.stack,
            timestamp: new Date(),
            inMsgId: incoming.messageId.toString(),
        };

        // tslint:disable-next-line: no-floating-promises
        appDb.saveError(error);
    });

    response.status(200).send("OK");
});
