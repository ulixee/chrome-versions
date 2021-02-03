import agent from "secret-agent";
import UpToDown from "./UpToDown";

UpToDown.updateMacDownloadPages(agent)
  .then(async () => {
    await agent.close();
    process.exit();
  })
  .catch(err => {
    console.log(err);
    process.exit(1);
  });
