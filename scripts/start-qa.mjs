import { spawn } from "node:child_process";
process.loadEnvFile(".env.qa.local");
if (new URL(process.env.DATABASE_URL).pathname !== "/moldtech_calendar_qa")
  throw Error("QA database required");
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", "-p", "3200"],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_OPTIONS: "", MOLDTECH_QA: "true" },
  },
);
child.on("exit", (code) => process.exit(code ?? 1));
