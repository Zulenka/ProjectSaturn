import { sendCmdDirectly } from '@/common';

const runtime = global.browser.runtime;
const extension = global.browser.extension;
const { extensionManifest } = global;

let sendMessage;
let getBackgroundPage;
let manifestVersion;

beforeEach(() => {
  sendMessage = runtime.sendMessage;
  getBackgroundPage = extension.getBackgroundPage;
  manifestVersion = extensionManifest.manifest_version;
});

afterEach(() => {
  runtime.sendMessage = sendMessage;
  extension.getBackgroundPage = getBackgroundPage;
  extensionManifest.manifest_version = manifestVersion;
});

test('sendCmdDirectly falls back to runtime messaging when no bg page exists', async () => {
  extension.getBackgroundPage = undefined;
  runtime.sendMessage = jest.fn(async payload => payload);
  const data = { id: 1, nested: { ok: true } };
  const res = await sendCmdDirectly('GetData', data);
  expect(runtime.sendMessage).toHaveBeenCalledWith({ cmd: 'GetData', data });
  expect(res).toEqual({ cmd: 'GetData', data });
});

test('sendCmdDirectly uses direct bg handler when available', async () => {
  runtime.sendMessage = jest.fn(async () => ({ via: 'runtime' }));
  const bg = {
    deepCopy: val => JSON.parse(JSON.stringify(val)),
    handleCommandMessage: jest.fn(async payload => ({ ...payload, via: 'bg' })),
  };
  extension.getBackgroundPage = () => bg;
  const data = { id: 2, nested: { ok: true } };
  const res = await sendCmdDirectly('GetData', data);
  expect(bg.handleCommandMessage).toHaveBeenCalledWith({ cmd: 'GetData', data }, undefined);
  expect(runtime.sendMessage).not.toHaveBeenCalled();
  expect(res).toEqual({ cmd: 'GetData', data, via: 'bg' });
});

test('sendCmdDirectly skips bg direct calls in MV3 mode', async () => {
  extensionManifest.manifest_version = 3;
  runtime.sendMessage = jest.fn(async payload => ({ ...payload, via: 'runtime' }));
  const bg = {
    deepCopy: val => JSON.parse(JSON.stringify(val)),
    handleCommandMessage: jest.fn(async payload => ({ ...payload, via: 'bg' })),
  };
  extension.getBackgroundPage = () => bg;
  const data = { id: 3 };
  const res = await sendCmdDirectly('GetData', data);
  expect(bg.handleCommandMessage).not.toHaveBeenCalled();
  expect(runtime.sendMessage).toHaveBeenCalledWith({ cmd: 'GetData', data });
  expect(res).toEqual({ cmd: 'GetData', data, via: 'runtime' });
});
