import * as express from "express";

import { appDb } from "../../db/db";
import { ApiResponse } from "../../db/models";

const router = express.Router();

/**
 * Route for react app front end to hit to set the timezone for the user
 */

router.put("/register", async (req: express.Request, res: express.Response) => {
    const data: { email: string; tz: string; pwd: string } = req.body;

    let response: ApiResponse;

    if (!data.email || !data.tz) {
        response = {
            message: "Invalid data. Something is missing.",
            code: 400,
        };
    } else {
        // data ok
        response = await appDb.updateUserTz(data.email, data.tz);
    }
    res.send(response);
});

export { router as configUserRouter };
