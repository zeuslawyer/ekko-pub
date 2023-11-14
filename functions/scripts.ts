import { appDb, firebaseAdmin } from "./src/db/db";
import { USER_COLLECTION, CURRENT_ENV } from "./src/contexts";
import { Mailer } from "./src/services/Email";
import { IUser, IError } from "./src/db/models";

import axios from "axios";

// '30 20 * * SUN-SAT'

const SLACK_WEBHOOK =
    "https://hooks.slack.com/services/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";

const error: IError = {
    type: "incoming_mail",
    inMsgId: "1597105497849110000",
    message: "Cannot read property 'match' of undefined",
    timestamp: new Date(),
    userEmail: "zubin@test.com",
    stack: "",
};

// reference for message structure https://api.slack.com/messaging/webhooks#create_a_webhook
// payloads: https://api.slack.com/reference/messaging/payload
// block kit builder https://api.slack.com/block-kit/building

const d = new Date().toLocaleString("en-AU", {
    timeZone: "Australia/Melbourne",
});

const blocks = [
    {
        type: "section",
        text: {
            type: "mrkdwn",
            text: `${CURRENT_ENV.toUpperCase()}-ERROR. ${d} `,
        },
    },
];

Object.keys(error).map((key, idx) => {
    blocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text: `\n${idx + 1}. _${key}_: ${error[key]}`, // numbered list
        },
    });
});

console.log(blocks);
axios
    .post(
        SLACK_WEBHOOK,
        {
            blocks,
        },
        { headers: { "content-type": "application/json" } }
    )
    .catch(error => console.log(error.message));
