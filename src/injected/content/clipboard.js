import bridge, { addHandlers, onScripts } from './bridge';
import { sendCmd } from './util';

export let onClipboardCopy;
let doCopy;
let clipboardData;
let setClipboard;

function ensureExecCopyInterceptor() {
  if (doCopy) return;
  const { setData } = DataTransfer[PROTO];
  const { get: getClipboardData } = describeProperty(ClipboardEvent[PROTO], 'clipboardData');
  const { preventDefault, stopPropagation } = Event[PROTO];
  doCopy = e => {
    e::stopPropagation();
    e::stopImmediatePropagation();
    e::preventDefault();
    e::getClipboardData()::setData(clipboardData.type || 'text/plain', clipboardData.data);
  };
  // Attaching in capture mode so page handlers can't consume/override our clipboard payload.
  on('copy', onClipboardCopy = e => clipboardData && doCopy(e), true);
}

async function setClipboardWithExec(params) {
  ensureExecCopyInterceptor();
  clipboardData = params;
  let ok;
  try {
    ok = document.execCommand('copy');
  } catch { /* NOP */ }
  clipboardData = null;
  if (!ok && process.env.DEBUG) {
    log('warn', null, 'GM_setClipboard failed!');
  }
  return !!ok;
}

async function setClipboardAuto(params) {
  await bridge[REIFY];
  if ((params.type || 'text/plain') === 'text/plain') {
    const clipboard = global.navigator?.clipboard;
    if (clipboard?.writeText) {
      try {
        await clipboard.writeText(`${params.data ?? ''}`);
        return true;
      } catch { /* NOP */ }
    }
  }
  if (await setClipboardWithExec(params)) return true;
  // Last resort: background route (MV2 DOM page or MV3-specific fallback logic there).
  return sendCmd('SetClipboard', params);
}

onScripts.push(({ clipFF }) => {
  if (clipFF) {
    setClipboard = async params => {
      await bridge[REIFY];
      return setClipboardWithExec(params);
    };
  }
  addHandlers({
    SetClipboard: setClipboard || setClipboardAuto,
  });
});
