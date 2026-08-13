import type { SettingsSyncPayload } from '@/features/settings';

export type SettingsSyncSnapshot = {
  settings: SettingsSyncPayload;
  clientUpdatedAt: string;
};

function clockMs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/** Pure LWW: remote wins when its clock is >= local. */
export function mergeSettingsLww(
  local: SettingsSyncSnapshot,
  remote: SettingsSyncSnapshot,
): SettingsSyncSnapshot {
  if (clockMs(remote.clientUpdatedAt) >= clockMs(local.clientUpdatedAt)) {
    return remote;
  }
  return local;
}

/**
 * After server LWW, response is source of truth.
 * Still runs through merge for defensive local clocks.
 */
export function applySettingsSyncResponse(
  local: SettingsSyncSnapshot,
  response: SettingsSyncSnapshot,
): SettingsSyncSnapshot {
  return mergeSettingsLww(local, response);
}
