import * as cron from "./services/cron";
import * as webhook from "./services/webhook";
import { CURRENT_ENV } from "./contexts";

import { server } from "./api/server";

console.log(
    "Current environment: ",
    `'${CURRENT_ENV}'. Date: ${new Date().toString()}`
);
// functions
export const runTask = cron.sendMail;
export const processEmailIn = webhook.mailHook;
export const api = server;
