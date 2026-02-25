import { addPublicCommands } from './init';

let clipboardData;
const hasDomClipboard = typeof document !== 'undefined' && document?.body;
const textarea = hasDomClipboard && document.createElement('textarea');

addPublicCommands({
  async SetClipboard(data) {
    clipboardData = data;
    if (textarea) {
      textarea.focus();
      const ok = document.execCommand('copy', false, null);
      if (!ok && process.env.DEBUG) {
        console.warn('Copy failed!');
      }
      return ok;
    }
    const type = data?.type || 'text/plain';
    const text = `${data?.data ?? ''}`;
    const clipboard = globalThis.navigator?.clipboard;
    if (type === 'text/plain' && clipboard?.writeText) {
      return clipboard.writeText(text).then(() => true, (err) => {
        if (process.env.DEBUG) console.warn('Copy failed:', err);
        return false;
      });
    }
    if (process.env.DEBUG) {
      console.warn('Clipboard API unavailable in this runtime.');
    }
    return false;
  },
});

if (textarea) {
  document.body.appendChild(textarea);
  addEventListener('copy', e => {
    e.preventDefault();
    const { type, data } = clipboardData;
    e.clipboardData.setData(type || 'text/plain', data);
  });
}
