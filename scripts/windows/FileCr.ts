import { Agent } from 'secret-agent';
import Versions from '../Versions';

export default class FileCr {
  static async updateDownloadUrls(agent: Agent) {
    await agent.configure({
      humanEmulatorId: 'skipper',
      blockedResourceTypes: ['All'],
    });

    for (let page = 1; page <= 6; page += 1) {
      const fpage = page > 1 ? `?fpage=${page}` : '';
      await agent.goto(`https://filecr.com/windows/google-chrome/${fpage}#versions-tb`);
      for (const entry of await agent.document.querySelectorAll('.purchase-item')) {
        const version = (await entry.querySelector('.category.primary').textContent).replace(
          'Version: ',
          '',
        );

        const form = await entry.querySelector('form');
        const index = await form.querySelector('.current_index').value;
        const fileId = await form.querySelector('input[name="current_post"]').value;
        const win64Response = await agent.fetch('/wp-admin/admin-ajax.php', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: `action=sh_download_file&is_ajax=1&download_post_id=${fileId}&current_file=official_site_server&current_index=${index}`,
        });
        const win64Result = await win64Response.json();

        const win32Response = await agent.fetch('/wp-admin/admin-ajax.php', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded; charset=UTF-8' },
          body: `action=sh_download_file&is_ajax=1&download_post_id=${fileId}&current_file=official_site_server_new&current_index=${index}`,
        });
        const win32Result = await win32Response.json();

        Versions.set(version, {
          win32: win32Result.url,
          win64: win64Result.url,
        });
      }
    }
    console.log('Extracted data');
  }
}
