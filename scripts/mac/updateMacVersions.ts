import agent from "secret-agent";
import UpToDown from "./UpToDown";

UpToDown.updateMacVersions(agent)
  .then(async () => {
    await agent.close();
    process.exit();
  })
  .catch(err => {
    console.log(err);
    process.exit(1);
  });
