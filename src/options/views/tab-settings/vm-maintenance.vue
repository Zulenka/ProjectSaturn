<template>
  <div class="mr-1c">
    <tooltip :content="i18n('hintVacuum')">
      <button @click="vacuum" :disabled="store.batch" v-text="labelVacuum" />
    </tooltip>
    <button @click="confirmDanger(resetSettings, i18nResetSettings)"
            :disabled="store.batch"
            :title="resetHint"
            v-text="resetText" />
    <button @click="exportDiagnostics"
            :disabled="store.batch"
            v-text="labelDiagnosticsExport" />
    <button @click="confirmDanger(clearDiagnostics, 'Clear diagnostics log?')"
            :disabled="store.batch"
            v-text="labelDiagnosticsClear" />
    <section class="mv3-health mt-1c" v-if="isMv3Runtime">
      <div class="diagnostics-console-head">
        <strong>MV3 Runtime Health</strong>
        <span v-text="mv3Health?.checkedAt ? `Checked: ${formatDiagnosticsTime(mv3Health.checkedAt)}` : ''" />
      </div>
      <div class="diagnostics-console-controls">
        <button @click="refreshMv3Health"
                :disabled="store.batch || mv3HealthLoading"
                v-text="labelMv3HealthRefresh" />
      </div>
      <pre class="mv3-health-body" v-text="formattedMv3Health" />
    </section>
    <section class="diagnostics-console mt-1c">
      <div class="diagnostics-console-head">
        <strong>Error Log Console</strong>
        <span>
          Showing {{diagnosticsEntries.length}} / {{diagnosticsMeta.entryCount || diagnosticsEntries.length}}
          <template v-if="diagnosticsMeta.dropped">
            (dropped: {{diagnosticsMeta.dropped}})
          </template>
        </span>
      </div>
      <div class="diagnostics-console-controls">
        <label>
          Level
          <select v-model="diagnosticsLevel">
            <option value="error">error</option>
            <option value="warn">warn</option>
            <option value="info">info</option>
            <option value="debug">debug</option>
          </select>
        </label>
        <label>
          <input v-model="diagnosticsErrorsOnly" type="checkbox">
          Errors only
        </label>
        <label>
          Limit
          <input v-model.number="diagnosticsLimit" type="number" min="20" max="1000" step="10">
        </label>
        <label>
          <input v-model="diagnosticsAutoRefresh" type="checkbox">
          Auto refresh
        </label>
        <button @click="refreshDiagnosticsConsole"
                :disabled="store.batch || diagnosticsLoading"
                v-text="labelDiagnosticsRefresh" />
        <button @click="copyDiagnosticsConsole"
                :disabled="store.batch || !diagnosticsEntries.length"
                v-text="labelDiagnosticsCopy" />
      </div>
      <div class="diagnostics-console-body">
        <div v-if="diagnosticsLoading" class="diagnostics-status">Loading diagnostics...</div>
        <div v-else-if="diagnosticsError" class="diagnostics-status has-error" v-text="diagnosticsError" />
        <div v-else-if="!diagnosticsEntries.length" class="diagnostics-status">
          No log entries for the current filter.
        </div>
        <details v-for="entry in diagnosticsEntries" :key="entry.id" class="diagnostics-entry">
          <summary>
            <span class="diagnostics-time" v-text="formatDiagnosticsTime(entry.ts)" />
            <span class="diagnostics-level" :class="`is-${entry.level}`" v-text="entry.level.toUpperCase()" />
            <span class="diagnostics-event" v-text="entry.event" />
            <span class="diagnostics-summary" v-text="summarizeDiagnostic(entry)" />
          </summary>
          <pre v-text="formatDiagnosticDetails(entry)" />
        </details>
      </div>
    </section>
  </div>
</template>

<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import Tooltip from 'vueleton/lib/tooltip';
import { i18n, sendCmdDirectly } from '@/common';
import { downloadBlob } from '@/common/download';
import options from '@/common/options';
import defaults from '@/common/options-defaults';
import { deepEqual, mapEntry } from '@/common/object';
import { showConfirmation } from '@/common/ui';
import { runInBatch, store } from '../../utils';

const labelVacuum = ref(i18n('buttonVacuum'));
const i18nResetSettings = i18n('buttonResetSettings');
const resetHint = ref('');
const resetText = ref(i18nResetSettings);
const labelDiagnosticsExport = ref('Export Diagnostics Log');
const labelDiagnosticsClear = ref('Clear Diagnostics Log');
const labelDiagnosticsRefresh = ref('Refresh Console');
const labelDiagnosticsCopy = ref('Copy Visible Logs');
const labelMv3HealthRefresh = ref('Refresh MV3 Runtime Health');
const diagnosticsLoading = ref(false);
const diagnosticsError = ref('');
const diagnosticsEntries = ref([]);
const diagnosticsMeta = ref({
  dropped: 0,
  entryCount: 0,
});
const diagnosticsLevel = ref('error');
const diagnosticsErrorsOnly = ref(true);
const diagnosticsAutoRefresh = ref(true);
const diagnosticsLimit = ref(150);
const mv3Health = ref(null);
const mv3HealthLoading = ref(false);
let diagnosticsTimer = 0;
const isMv3Runtime = extensionManifest.manifest_version === 3;

const diagnosticsFilter = computed(() => ({
  level: diagnosticsLevel.value,
  limit: Math.max(20, Math.min(1000, +diagnosticsLimit.value || 150)),
  ...(diagnosticsErrorsOnly.value ? { type: 'error' } : null),
}));
const formattedMv3Health = computed(() => (
  mv3Health.value
    ? JSON.stringify(mv3Health.value, null, 2)
    : 'MV3 health snapshot not loaded.'
));

async function confirmDanger(fn, title) {
  if (!await showConfirmation(title, { ok: { className: 'has-error' } })) {
    return;
  }
  return runInBatch(fn);
}

function resetSettings() {
  const ignoredKeys = [
    'lastModified',
    'lastUpdate',
    'sync',
  ];
  const diff = defaults::mapEntry(null, (key, defVal) => !ignoredKeys.includes(key)
    && !deepEqual(defVal, options.get(key))
    && key);
  resetHint.value = JSON.stringify(diff, null, 2)
    .slice(1, -1).replace(/^\s{2}/gm, '');
  resetText.value = `${i18nResetSettings} (${Object.keys(diff).length})`;
  return sendCmdDirectly('SetOptions', diff);
}

async function vacuum() {
  await runInBatch(async () => {
    labelVacuum.value = i18n('buttonVacuuming');
    const { fixes, errors } = await sendCmdDirectly('Vacuum');
    const errorText = errors?.join('\n');
    labelVacuum.value = i18n('buttonVacuumed') + (fixes ? ` (${fixes})` : '');
    if (errorText) {
      showConfirmation(i18n('msgErrorFetchingResource') + '\n\n' + errorText, { cancel: false });
    }
  });
}

async function exportDiagnostics() {
  await runInBatch(async () => {
    labelDiagnosticsExport.value = 'Exporting Diagnostics Log...';
    const payload = await sendCmdDirectly('DiagnosticsExportLog', {
      level: 'debug',
      limit: 1500,
    });
    downloadBlob(new Blob([payload.content], { type: payload.mimeType }), payload.fileName);
    labelDiagnosticsExport.value = `Export Diagnostics Log (${payload.entryCount})`;
  });
  await loadDiagnosticsConsole({ quiet: true });
}

async function clearDiagnostics() {
  await runInBatch(async () => {
    const { cleared } = await sendCmdDirectly('DiagnosticsClearLog');
    labelDiagnosticsClear.value = `Diagnostics Log Cleared (${cleared})`;
  });
  await loadDiagnosticsConsole({ quiet: true });
}

function formatDiagnosticsTime(ts) {
  return new Date(+ts || Date.now()).toLocaleString([], {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function summarizeDiagnostic(entry) {
  const details = entry?.details || {};
  const errorMessage = details.error?.message || details.error?.name;
  const rawMessage = errorMessage || details.message || '';
  if (rawMessage) return `${rawMessage}`.slice(0, 180);
  return JSON.stringify(details).slice(0, 180);
}

function formatDiagnosticDetails(entry) {
  return JSON.stringify(entry?.details || {}, null, 2);
}

async function loadDiagnosticsConsole({ quiet } = {}) {
  if (diagnosticsLoading.value && quiet) return;
  diagnosticsLoading.value = true;
  diagnosticsError.value = '';
  if (!quiet) labelDiagnosticsRefresh.value = 'Refreshing...';
  try {
    const payload = await sendCmdDirectly('DiagnosticsGetLog', diagnosticsFilter.value);
    diagnosticsEntries.value = payload.entries || [];
    diagnosticsMeta.value = payload.meta || {
      dropped: 0,
      entryCount: diagnosticsEntries.value.length,
    };
    labelDiagnosticsRefresh.value = `Refresh Console (${diagnosticsEntries.value.length})`;
  } catch (err) {
    diagnosticsError.value = `${err?.message || err || 'Failed to load diagnostics log.'}`;
    labelDiagnosticsRefresh.value = 'Refresh Console (error)';
  } finally {
    diagnosticsLoading.value = false;
  }
}

function refreshDiagnosticsConsole() {
  return loadDiagnosticsConsole();
}

async function copyDiagnosticsConsole() {
  if (!diagnosticsEntries.value.length) return;
  labelDiagnosticsCopy.value = 'Copying...';
  const lines = diagnosticsEntries.value.map(entry => (
    `[${entry.iso || new Date(entry.ts).toISOString()}] `
    + `${entry.level.toUpperCase()} `
    + `${entry.event} `
    + `${summarizeDiagnostic(entry)}`
  )).join('\n');
  try {
    await navigator.clipboard?.writeText(lines);
    labelDiagnosticsCopy.value = `Copied (${diagnosticsEntries.value.length})`;
  } catch (err) {
    labelDiagnosticsCopy.value = 'Copy failed';
  }
}

async function refreshMv3Health() {
  if (!isMv3Runtime) return;
  mv3HealthLoading.value = true;
  labelMv3HealthRefresh.value = 'Refreshing MV3 Runtime Health...';
  try {
    mv3Health.value = await sendCmdDirectly('DiagnosticsGetMv3Health', { force: true });
    labelMv3HealthRefresh.value = `Refresh MV3 Runtime Health (${mv3Health.value?.userscripts?.state || 'ok'})`;
  } catch (err) {
    mv3Health.value = {
      checkedAt: new Date().toISOString(),
      error: `${err?.message || err || 'Failed to fetch MV3 runtime health.'}`,
    };
    labelMv3HealthRefresh.value = 'Refresh MV3 Runtime Health (error)';
  } finally {
    mv3HealthLoading.value = false;
  }
}

function syncDiagnosticsAutoRefresh() {
  clearInterval(diagnosticsTimer);
  diagnosticsTimer = 0;
  if (!diagnosticsAutoRefresh.value) return;
  diagnosticsTimer = setInterval(() => {
    loadDiagnosticsConsole({ quiet: true });
  }, 5e3);
}

watch(
  () => [diagnosticsLevel.value, diagnosticsErrorsOnly.value, diagnosticsLimit.value],
  () => {
    loadDiagnosticsConsole({ quiet: true });
  },
);
watch(diagnosticsAutoRefresh, syncDiagnosticsAutoRefresh);

onMounted(() => {
  loadDiagnosticsConsole();
  syncDiagnosticsAutoRefresh();
  refreshMv3Health();
});
onBeforeUnmount(() => {
  clearInterval(diagnosticsTimer);
  diagnosticsTimer = 0;
});
</script>

<style scoped>
.diagnostics-console {
  margin-right: .5rem;
}
.mv3-health-body {
  margin: 0;
  max-height: 11rem;
  overflow: auto;
  border: 1px solid var(--fill-5);
  border-radius: 6px;
  background: color-mix(in srgb, var(--bg) 88%, var(--fill-2));
  padding: .6rem .7rem;
  font-size: .74rem;
  line-height: 1.25;
}
.diagnostics-console-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: .75rem;
  margin-bottom: .4rem;
  font-size: .9rem;
}
.diagnostics-console-head span {
  opacity: .8;
  font-size: .82rem;
}
.diagnostics-console-controls {
  display: flex;
  flex-wrap: wrap;
  gap: .4rem .8rem;
  align-items: center;
  margin-bottom: .45rem;
}
.diagnostics-console-controls label {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  font-size: .82rem;
}
.diagnostics-console-controls input[type="number"] {
  width: 4.4rem;
}
.diagnostics-console-body {
  max-height: 17rem;
  overflow: auto;
  border: 1px solid var(--fill-5);
  border-radius: 6px;
  background: color-mix(in srgb, var(--bg) 90%, var(--fill-2));
}
.diagnostics-status {
  padding: .55rem .7rem;
  font-style: italic;
  opacity: .9;
}
.diagnostics-status.has-error {
  color: #d93025;
}
.diagnostics-entry {
  border-bottom: 1px solid var(--fill-2);
}
.diagnostics-entry:last-child {
  border-bottom: none;
}
.diagnostics-entry summary {
  cursor: pointer;
  display: grid;
  grid-template-columns: auto auto auto 1fr;
  gap: .45rem;
  align-items: baseline;
  padding: .45rem .6rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: .78rem;
}
.diagnostics-time {
  opacity: .8;
  white-space: nowrap;
}
.diagnostics-level {
  font-weight: 600;
}
.diagnostics-level.is-error {
  color: #d93025;
}
.diagnostics-level.is-warn {
  color: #b26a00;
}
.diagnostics-level.is-info {
  color: #2f6ec9;
}
.diagnostics-level.is-debug {
  color: var(--fill-9);
}
.diagnostics-event {
  white-space: nowrap;
}
.diagnostics-summary {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.diagnostics-entry pre {
  margin: 0;
  padding: .6rem .7rem .7rem;
  background: color-mix(in srgb, var(--bg) 82%, var(--fill-1));
  border-top: 1px dashed var(--fill-4);
  font-size: .75rem;
  line-height: 1.25;
  overflow: auto;
}
</style>
