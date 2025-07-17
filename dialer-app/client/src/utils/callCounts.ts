export type CallCounts = Record<string, number>;

export function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `leadCallCounts_${y}${m}${day}`;
}

export function loadCallCounts(): CallCounts {
  try {
    const raw = localStorage.getItem(getTodayKey());
    return raw ? (JSON.parse(raw) as CallCounts) : {};
  } catch {
    return {};
  }
}

export function saveCallCounts(counts: CallCounts) {
  localStorage.setItem(getTodayKey(), JSON.stringify(counts));
}

export function incrementCallCount(leadId: string): number {
  const counts = loadCallCounts();
  counts[leadId] = (counts[leadId] || 0) + 1;
  saveCallCounts(counts);
  return counts[leadId];
}

export function deleteCallCount(leadId: string) {
  const counts = loadCallCounts();
  if (leadId in counts) {
    delete counts[leadId];
    saveCallCounts(counts);
  }
} 