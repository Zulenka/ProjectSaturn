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
  </div>
</template>

<script setup>
import { ref } from 'vue';
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
}

async function clearDiagnostics() {
  await runInBatch(async () => {
    const { cleared } = await sendCmdDirectly('DiagnosticsClearLog');
    labelDiagnosticsClear.value = `Diagnostics Log Cleared (${cleared})`;
  });
}
</script>
