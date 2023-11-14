export type TSubscriptionStatus = "ACTIVE" | "CANCELED" | "BETA";

export interface IBaseModel {
    createdAt: number | Date | null;
    updatedAt: number | Date | null;
    userEmail: string;
}

export interface IUser extends IBaseModel {
    name: string;
    tz: string;
    subscriptionStatus: TSubscriptionStatus;
    scheduleCron: string;
}

/* export interface IDue extends IBaseModel {
    dueOn: number | Date | FirebaseFirestore.Timestamp;
    subscriptionStatus: TSubscriptionStatus;
} */
export interface ILink extends IBaseModel {
    dueOn: number | Date;
    inMsgId: string;
    outMsgId: string | null;
    digestId: string | null;
    status: "SENT" | "UNSENT";
    url: string;
    tags: string; // cs vals extracted from subject line?
    cc: string; // cs vals
}

export interface IError {
    type:
        | "incoming_mail"
        | "incoming_links"
        | "new_user_creation"
        | "outgoing_email";
    userEmail: string;
    message: string;
    stack: string;
    inMsgId: string;
    timestamp?: number | Date | FirebaseFirestore.Timestamp;
}

// custom data on errors
export interface IErrorGeneric extends IError {
    [key: string]: any;
}

export interface ApiResponse {
    message: string;
    code: number;
}
