import { config } from "dotenv";

import { configureListingSearch } from "@/server/platform/search";

config({ path: ".env.local", quiet: true });
config({ quiet: true });

configureListingSearch()
  .then(() => console.log("Configured Algolia listing search"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
