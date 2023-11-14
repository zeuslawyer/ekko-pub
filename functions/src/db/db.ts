import * as admin from "firebase-admin";
import * as parser from "cron-parser";
import { v4 } from "uuid";
import * as cheerio from "cheerio";

import { IZohoMail } from "../services/webhook";
import {
    USER_COLLECTION,
    LINK_COLLECTION,
    CURRENT_ENV,
    ERROR_COLLECTION,
} from "../contexts";
import {
    IUser,
    IBaseModel,
    ILink,
    TSubscriptionStatus,
    IErrorGeneric,
    ApiResponse,
    IError,
} from "./models";
import { Mailer } from "../services/Email";
import { logToSlack } from "../services/Slack/DevLogger";

// https://firebase.google.com/docs/admin/setup#initialize_the_sdk - needs environment variable to work
admin.initializeApp({
    credential: admin.credential.cert(
        require("./ekkoappv0-service-account.json")
    ),
});

const devCronString = "30 20 * * SUN-SAT"; // 830pm daily;
const prodCronString = "0 8 * * SAT"; // saturday morning
/** returns next due in Firestore TimeStamp */
export function calculateDueOn(timeZone: string, scheduleCron: string) {
    let timeString: string;
    if (CURRENT_ENV === "production") {
        timeString = scheduleCron || prodCronString;
    } else {
        // dev settings
        timeString = scheduleCron || devCronString;
        if (!timeZone) timeZone = "Australia/Sydney";
    }

    const interval = parser.parseExpression(timeString, { tz: timeZone });

    // return admin.firestore.Timestamp.fromDate(
    //     new Date(interval.next().toString())
    // );

    return new Date(interval.next().toString());
}

function computeOperationTime(startMillis: number) {
    const end = Date.now();
    return (end - startMillis) / 1000;
}

export function extractLinks(html: string): string[] {
    // reference: https://www.twilio.com/blog/web-scraping-and-parsing-html-with-node-js-and-cheerio
    const $ = cheerio.load(html);
    const urlRegex = /(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/gi;
    const result = new Set<string>();

    $("a").each((idx, link) => {
        const href: string = link.attribs.href;

        if (!href) return;

        const matched = href.match(urlRegex);
        if (matched) result.add(matched[0]);
        // if(!href.includes("mailto:")) result.add(href.trim());
    });

    const arr = Array.from(result);
    return Array.from(arr);
}

export class Database {
    private db: FirebaseFirestore.Firestore;
    private _userCollectionRef: FirebaseFirestore.CollectionReference;
    private _linksCollRef: FirebaseFirestore.CollectionReference;
    private _errorCollRef: FirebaseFirestore.CollectionReference;

    constructor() {
        this.db = admin.firestore();
        this._userCollectionRef = this.db.collection(USER_COLLECTION);
        this._linksCollRef = this.db.collection(LINK_COLLECTION);
        this._errorCollRef = this.db.collection(ERROR_COLLECTION);
    }

    async processIncoming(incoming: IZohoMail) {
        const userEmail = incoming.fromAddress.trim();

        // check if USER exists, else create
        const userSnap = await this._userCollectionRef.doc(userEmail).get();
        let user: IUser;
        if (userSnap.exists) {
            // get data
            user = userSnap.data() as IUser;
        } else {
            // create new user
            user = {
                userEmail,
                tz: "Australia/Sydney", // default tz
                scheduleCron:
                    CURRENT_ENV === "development"
                        ? devCronString
                        : prodCronString,
                name: incoming.sender || "Remynd User",
                subscriptionStatus: "BETA",
                createdAt: null,
                updatedAt: null,
            };

            this.createDoc(user, this._userCollectionRef.doc(userEmail))
                .then(result =>
                    logToSlack(
                        {
                            message: `Processing incoming - New User created for '${userEmail}`,
                        },
                        "INFO"
                    )
                )
                .catch(e =>
                    this.saveError({
                        type: "new_user_creation",
                        userEmail,
                        inMsgId: incoming.messageId.toString(),
                        message: "(Process Incoming ) " + e.message,
                        stack: e.stack,
                    })
                );

            // send TZ setting email in parallel
            Mailer.sendTzEmail(user)
                .then(_ =>
                    logToSlack(
                        {
                            message: `Sent '${user.userEmail}' the TZ setting link`,
                        },
                        "INFO"
                    )
                )
                .catch(error =>
                    this.saveError({
                        type: "outgoing_email",
                        message: `Failed to send the TZ setting email to '${user.userEmail}'`,
                        userEmail: user.userEmail,
                        inMsgId: "null",
                        stack: "null",
                    })
                );
        }
        // save each link entry with its due date
        const datas: ILink[] = [];
        const links = extractLinks(incoming.html);

        for (const link of links) {
            datas.push({
                userEmail,
                digestId: null,
                url: link.trim(),
                status: "UNSENT",
                dueOn: calculateDueOn(user.tz, user.scheduleCron),
                inMsgId: incoming.messageId.toString(),
                outMsgId: null,
                cc: incoming.ccAddress,
                tags: incoming.subject,
                createdAt: null,
                updatedAt: null,
            });
        }

        // serial writes.  fastest:  https://stackoverflow.com/questions/58897274/what-is-the-fastest-way-to-write-a-lot-of-documents-to-firestore
        try {
            links.length > 0 &&
                (await Promise.all(
                    datas.map(
                        link => this.createDoc(link, this._linksCollRef.doc()) // auto creates docId
                    )
                ));

            logToSlack(
                {
                    message: `Processing incoming -  Link saving for '${userEmail}' done. '${links.length}' links saved to ${CURRENT_ENV}.`,
                },
                "INFO"
            );
        } catch (error) {
            error.message =
                `Occurred during parallel link saves on incoming email from '${userEmail}'. ` +
                error.message;

            // tslint:disable-next-line: no-floating-promises
            this.saveError({
                type: "incoming_links",
                userEmail,
                timestamp: new Date(),
                message: error.message,
                stack: error.stack,
                inMsgId: incoming.messageId.toString(),
            });

            throw error;
        }
    }

    async updateUserTz(email: string, tz: string): Promise<ApiResponse> {
        const userSnap = await this._userCollectionRef.doc(email).get();

        if (!userSnap.exists) {
            return {
                code: 404,
                message: `User with email '${email}' does not exist`,
            };
        }

        // else  update
        await this.updateDoc<IUser>({ tz }, this._userCollectionRef.doc(email));

        return {
            code: 200,
            message: "OK",
        };
    }

    async doEmailTask() {
        // get elible users
        const users = await this.getEligibleUsers();

        // for each -> get links, send email, update links
        const start = Date.now(); // tracking time used

        for (const user of users) {
            const links: ILink[] = [];
            const linkRefs: string[] = [];

            // get link data
            const linksDocData = await this._linksCollRef
                .where("userEmail", "==", user.userEmail)
                .where("status", "==", "UNSENT")
                .where("dueOn", "<=", new Date())
                .get();

            logToSlack(
                {
                    message: `'${linksDocData.docs.length}' links due for '${user.userEmail}'`,
                },
                "INFO"
            );
            if (linksDocData.docs.length === 0) {
                continue;
            }

            // transform. get Doc Ids, and change timeStamp to JS date
            linksDocData.docs.forEach(doc => {
                const docData = doc.data() as ILink;

                const date = doc.createTime.toDate(); // Dates are returned by Firestore as a Timestamp object. convert to Date.
                docData.createdAt = date;

                links.push(docData);
                linkRefs.push(doc.id);
            });

            const digestId = v4(); // for each user's set of links, create a digest ID to include in email footer
            const templateData = {
                name: user.name,
                links,
                digestId,
                tz: user.tz,
            };

            // dont await. run parallel.
            Mailer.sendDigest(user.userEmail, templateData)
                .then(mailerRes => {
                    // update each link for that user
                    for (const ref of linkRefs) {
                        this._linksCollRef
                            .doc(ref)
                            .update({
                                status: "SENT",
                                outMsgId: mailerRes.messageId,
                                digestId,
                            })
                            .catch(err => {
                                // tslint:disable-next-line: no-floating-promises
                                this.saveError({
                                    type: "outgoing_email",
                                    userEmail: user.userEmail,
                                    message:
                                        "Error updating link status on send" +
                                        err.message,
                                    stack: err.stack,
                                    inMsgId: links[0].inMsgId, // all the users links have the same inMsgId
                                    digestId,
                                });
                            });
                    }

                    const msg = `Sent to ${user.userEmail}. Mailer Response message id; '${mailerRes.messageId}'`;
                    `\n  Total time so far: ${computeOperationTime(
                        start
                    )} seconds \n\n`;

                    logToSlack({ message: msg }, "INFO");
                })
                .catch(e => {
                    // email error
                    // tslint:disable-next-line: no-floating-promises
                    this.saveError({
                        type: "outgoing_email",
                        userEmail: user.userEmail,
                        message:
                            `Failed for ${user.userEmail}: ${e.message}. ` +
                            e.message,
                        stack: e.stack,
                        inMsgId: links[0].inMsgId, // all the users links have the same inMsgId
                        digestId,
                    });
                });
        }
    }

    async getUserByStatus(status: TSubscriptionStatus) {
        const snaps = await this._userCollectionRef
            .where("subscriptionStatus", "==", status)
            .get();

        const res: IUser[] = [];
        snaps.forEach(doc => res.push(doc.data() as IUser));
        return res;
    }

    async getEligibleUsers() {
        const beta = await this.getUserByStatus("BETA");
        const active = await this.getUserByStatus("ACTIVE");

        return beta.concat(active);
    }

    /** replaces document if exists. Does not merge. */
    async createDoc<T extends IBaseModel>(
        doc: T,
        docRef: FirebaseFirestore.DocumentReference
    ) {
        doc.createdAt = new Date();
        return await docRef.set(doc);
    }

    /** merges the object provided into the document */
    async updateDoc<T extends IBaseModel>(
        updates: Partial<T>,
        docRef: FirebaseFirestore.DocumentReference
    ) {
        updates.updatedAt = new Date();
        return await docRef.update(updates);
    }

    /** logs to slack as well. */
    saveError(data: IErrorGeneric) {
        logToSlack(data, "ERROR");
        this._errorCollRef
            .add({ data })
            .catch(error =>
                logToSlack({ ...error, sourceData: data }, "ERROR")
            );
    }

    async deleteCollection(collectionName: string) {
        if (
            CURRENT_ENV === "production" ||
            !collectionName.toUpperCase().includes("DEV")
        ) {
            return;
        }

        const db = firebaseAdmin.firestore();
        const deleteIds: any = [];
        const allDocs = await db.collection(collectionName).get();
        allDocs.forEach(doc => {
            deleteIds.push(doc.id);
        });

        const allDeletes: Promise<any>[] = [];
        deleteIds.forEach((id: string) => {
            allDeletes.push(db.collection(collectionName).doc(id).delete());
        });

        console.warn(`Deleting everything in collect '${collectionName}'. `);

        return Promise.all(allDeletes);
    }
}

export const appDb = new Database();
export const firebaseAdmin = admin;
