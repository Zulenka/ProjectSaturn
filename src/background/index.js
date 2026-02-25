import '@/common/browser';
import { getActiveTab, makePause } from '@/common';
import { deepCopy } from '@/common/object';
import { handleHotkeyOrMenu } from './utils/icon';
import {
  logBackgroundAction,
  logBackgroundError,
  logCommandFailed,
  logCommandReceived,
  logCommandSucceeded,
} from './utils/diagnostics';
import { addPublicCommands, commands, init } from './utils';
import './sync';
import './utils/clipboard';
import './utils/notifications';
import './utils/preinject';
import './utils/script';
import './utils/storage-fetch';
import './utils/tab-redirector';
import './utils/tester';
import './utils/update';

addPublicCommands({
  /**
   * Timers in content scripts are shared with the web page so it can clear them.
   * await sendCmd('SetTimeout', 100) in injected/content
   * bridge.call('SetTimeout', 100, cb) in injected/web
   */
  SetTimeout(ms) {
    return ms > 0 && makePause(ms);
  },
});

function handleCommandMessage({ cmd, data, url, [kTop]: mode } = {}, src) {
  if (init) {
    return init.then(handleCommandMessage.bind(this, ...arguments));
  }
  const startedAt = performance.now();
  logCommandReceived({ cmd, data, mode, src });
  const func = hasOwnProperty(commands, cmd) && commands[cmd];
  if (!func) {
    logBackgroundAction('command.ignored', {
      cmd,
      sender: src && {
        origin: src.origin,
        tabId: src.tab?.id,
        url: src.url,
      },
    }, 'warn');
    return; // not responding to commands for popup/options
  }
  // The `src` is omitted when invoked via sendCmdDirectly unless fakeSrc is set.
  // The `origin` is Chrome-only, it can't be spoofed by a compromised tab unlike `url`.
  try {
    if (src) {
      let me = src.origin;
      if (url) src.url = url; // MessageSender.url doesn't change on soft navigation
      me = me ? me === extensionOrigin : `${url || src.url}`.startsWith(extensionRoot);
      if (!me && func.isOwn && !src.fake) {
        throw new SafeError(`Command is only allowed in extension context: ${cmd}`);
      }
      // TODO: revisit when link-preview is shipped in Chrome to fix tabId-dependent functionality
      if (!src.tab) {
        if (!me && (IS_FIREFOX ? !func.isOwn : !mode)) {
          if (process.env.DEBUG) console.log('No src.tab, ignoring:', ...arguments);
          return;
        }
        src.tab = false; // allowing access to props
      }
      if (mode) src[kTop] = mode;
    }
    return handleCommandMessageAsync(func, data, src, {
      cmd,
      startedAt,
    });
  } catch (error) {
    logCommandFailed({
      cmd,
      error,
      src,
      startedAt,
    });
    throw error;
  }
}

async function handleCommandMessageAsync(func, data, src, context) {
  try {
    // `await` is necessary to catch the error here
    const result = await func(data, src);
    logCommandSucceeded(context);
    return result;
  } catch (err) {
    logCommandFailed({
      ...context,
      error: err,
      src,
    });
    if (process.env.DEBUG) console.error(err);
    // Adding `stack` info + in FF a rejected Promise value is transferred only for an Error object
    throw err instanceof SafeError ? err
      : new SafeError(isObject(err) ? JSON.stringify(err) : err);
  }
}

globalThis._bg = 1;
global['handle' + 'CommandMessage' /* hiding the global from IDE */] = handleCommandMessage;
global['deep' + 'Copy' /* hiding the global from IDE */] = deepCopy;
browser.runtime.onMessage.addListener(handleCommandMessage);
browser.commands?.onCommand.addListener(async cmd => {
  try {
    const tab = await getActiveTab();
    logBackgroundAction('browser.command', {
      cmd,
      tabId: tab?.id,
      url: tab?.url,
    });
    handleHotkeyOrMenu(cmd, tab);
  } catch (error) {
    logBackgroundError('browser.command.failed', error, { cmd });
    if (process.env.DEBUG) console.error(error);
  }
});
