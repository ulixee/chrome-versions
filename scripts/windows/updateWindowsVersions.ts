import FilePuma from './FilePuma';
import agent from 'secret-agent';

FilePuma.updateWindowsDownloadPages(agent)
  .then(async () => {
    await agent.close();
    process.exit();
  })
  .catch(err => {
    console.log(err);
    process.exit(1);
  });
