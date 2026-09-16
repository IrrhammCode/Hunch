import { syncIndex, currentRound } from "./index";

syncIndex()
  .then((s) => {
    console.log("ok rounds", Object.keys(s.rounds).length, "cur", currentRound(s));
  })
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
