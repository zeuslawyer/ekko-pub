import * as nodemailer from "nodemailer";
import * as Mail from "nodemailer/lib/mailer";
import ejs = require("ejs");

import { CURRENT_ENV, FIREBASE_ENV, BASE_URL } from "../../contexts";
import { ILink, IUser } from "../../db/models";
import path = require("path");

let transportConfig: any;

if (CURRENT_ENV === "development") {
    transportConfig = {
        host: "smtp.mailtrap.io",
        port: 2525,
        auth: {
            user: "59c1299ab84fce",
            pass: "4ee6fa2da84288",
        },
    };
} else if (CURRENT_ENV === "staging") {
    transportConfig = {
        service: "Zoho", // https://nodemailer.com/smtp/well-known/
        auth: {
            user: "hello@getremynd.com",
            pass: FIREBASE_ENV.app.smtppass,
        },
    };
}

class Email {
    private transporter: Mail;
    constructor() {
        this.transporter = nodemailer.createTransport({
            service: "Zoho", // https://nodemailer.com/smtp/well-known/
            auth: {
                user: "hello@getremynd.com",
                pass: "!!Zubster2000",
            },
        });
    }

    async sendDigest(
        to: string,
        templateData: {
            name: string;
            links: ILink[];
            digestId: string | null;
            tz: string;
        }
    ) {
        // add date formater to data object, so it can be called in ejs
        const formatDate = date => {
            const options = {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            };

            return new Intl.DateTimeFormat("en-GB", options).format(date);
        };

        const renderData = {
            formatDate,
            ...templateData,
        };

        // compose mail data
        const maildata: Mail.Options = {
            to,
            from: "hello@getremynd.com",
            subject:
                "The links you wanted to be Remynded about - Your weekly digest.",
            html: await ejs.renderFile(
                path.join(__dirname, "/templates/digest.ejs"),
                renderData
            ),
        };

        const info = await this.transporter.sendMail(maildata);
        return info;
    }

    async sendTzEmail(user: IUser) {
        // compose link for email
        const url =
            process.env.NODE_ENV === "development"
                ? `${BASE_URL}/register?email=${user.userEmail}`
                : `${BASE_URL}/register?email=${user.userEmail}`;

        // compose mail data
        const maildata: Mail.Options = {
            to: user.userEmail,
            from: "hello@getremynd.com",
            subject: "Timing is everything 😁",
            html: await ejs.renderFile(
                path.join(__dirname, "/templates/tzEmail.ejs"),
                { name: user.name, url }
            ),
        };

        const info = await this.transporter.sendMail(maildata);
        return info;
    }
}

const initialized = new Email();
export const Mailer = initialized;
