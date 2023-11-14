import * as shell from "shelljs";

shell.cp("-R", "src/services/Email/templates", "lib/services/Email/");
shell.cp("-R", "src/db/ekkoappv0-service-account.json", "lib/db/");

// https://github.com/minwook-shin/typescript-express-ejs-node-starter/blob/master/package.json
