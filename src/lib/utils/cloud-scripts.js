const STORAGE_KEY_PREFIX = 'webweave-cloud-scripts-';

export function getStorageKey(userId) {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

export function getCloudScriptIds(userId) {
  if (!userId) return [];
  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addCloudScriptId(userId, scriptId) {
  const ids = getCloudScriptIds(userId);
  if (ids.includes(scriptId)) return ids;
  const next = [...ids, scriptId];
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  return next;
}

export function removeCloudScriptId(userId, scriptId) {
  const next = getCloudScriptIds(userId).filter((id) => id !== scriptId);
  window.localStorage.setItem(getStorageKey(userId), JSON.stringify(next));
  return next;
}

export function toggleCloudScriptId(userId, scriptId) {
  const ids = getCloudScriptIds(userId);
  if (ids.includes(scriptId)) {
    return removeCloudScriptId(userId, scriptId);
  }
  return addCloudScriptId(userId, scriptId);
}
