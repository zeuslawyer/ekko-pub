import axios from "axios";
import { CURRENT_ENV } from "../../contexts";

const SLACK_WEBHOOK =
    "https://hooks.slack.com/services/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";

interface ISlackLog {
    message: string;
    [key: string]: any;
}

/**
 * Development logs are logged to console.  Other Logs sent to zubinprata.slack.com -> channel #my-dev-logs
 
 * Reference: https://api.slack.com/messaging/webhooks
 */
export function logToSlack(data: ISlackLog, logLevel: "INFO" | "ERROR") {
    if (CURRENT_ENV === "development") {
        console.log(`${logLevel}:  `, data);
        return;
    }

    // only do in staging/prod
    const d = new Date().toLocaleString("en-AU", {
        timeZone: "Australia/Melbourne",
    });

    const APP_NAME = "REMYND_EKKO";

    const blocks = [
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `${APP_NAME}-${CURRENT_ENV.toUpperCase()}-${logLevel}. ${d} `,
            },
        },
    ];

    Object.keys(data).map((key, idx) => {
        blocks.push({
            type: "section",
            text: {
                type: "mrkdwn",
                text: `\n${idx + 1}. _${key}_: ${data[key]}`,
            },
        });
    });

    axios
        .post(
            SLACK_WEBHOOK,
            {
                blocks,
            },
            { headers: { "content-type": "application/json" } }
        )
        .catch(error =>
            axios.post(SLACK_WEBHOOK, {
                text: `ERROR LOGGING message of level ${logLevel}TO SLACK. Arose in Remynd-Ekko. Slack Error: ${error.message}. Application Error: ${data.message} `,
            })
        );
}
