import "dotenv/config";

import { defaultNodeEnvForLocalProcess } from "../src/lib/env/default-node-env";

const nodeEnv = defaultNodeEnvForLocalProcess(process.env);
if (nodeEnv) Object.assign(process.env, { NODE_ENV: nodeEnv });
