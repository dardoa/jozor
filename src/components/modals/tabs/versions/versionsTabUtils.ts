import type { DriveFile } from '../../../../types';

export type VersionsPanelText = {
  createDescription?: string;
  listDescription?: string;
  pinAction?: string;
  unpinAction?: string;
  infoPrefix?: string;
};

export const getVersionsPanelText = (t: unknown): VersionsPanelText =>
  ((t as { adminHub?: { versionsPanel?: VersionsPanelText } }).adminHub?.versionsPanel) || {};

export const isPinnedSnapshot = (snapshot: DriveFile) => snapshot.name.startsWith('pinned_');

export const getSnapshotPinnedName = (snapshot: DriveFile) =>
  isPinnedSnapshot(snapshot) ? snapshot.name.replace('pinned_', '') : `pinned_${snapshot.name}`;

export const getSnapshotDisplayName = (snapshot: DriveFile, untitledLabel: string) => {
  const cleanName = snapshot.name.replace('pinned_', '').replace('.json', '');
  const parts = cleanName.split('_');
  return parts.slice(3).join(' ') || untitledLabel;
};
