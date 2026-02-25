import { reactive } from 'vue';

export const emptyStore = () => ({
  scripts: [],
  frameScripts: [],
  idMap: {},
  commands: {},
  alerts: [],
  alertsUnread: 0,
  latestAlert: null,
  domain: '',
  injectionFailure: null,
  injectable: true,
});

export const store = reactive(emptyStore());
