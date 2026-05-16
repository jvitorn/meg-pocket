import process from "node:process";
import { pathToFileURL } from "node:url";

import { main } from "./lib/run-sql-file.mjs";

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main(process.argv.slice(2));
}
