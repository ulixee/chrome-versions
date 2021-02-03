import agent from "secret-agent";
import FileCr from "./FileCr";

FileCr.updateDownloadUrls(agent)
  .then(async () => {
    await agent.close();
    process.exit();
  })
  .catch(err => {
    console.log(err);
    process.exit(1);
  });
