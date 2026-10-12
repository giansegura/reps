import { backupFileName } from './backup.js';
import { shareOrDownload } from './share.js';
import { collectRawData } from './storage.js';

export const downloadRawData = () => {
  const json = `${JSON.stringify(collectRawData(), null, 2)}\n`;
  const name = backupFileName(new Date()).replace('reps-', 'reps-rescate-');
  shareOrDownload(new File([json], name, { type: 'application/json' })).catch(console.error);
};
