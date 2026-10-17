export function formatUGX(amount: number): string {
  if (amount >= 1_000_000) {
    return `UGX ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `UGX ${(amount / 1_000).toFixed(0)}K`;
  }
  return `UGX ${amount.toLocaleString()}`;
}

export function formatUGXFull(amount: number): string {
  return `UGX ${amount.toLocaleString()}`;
}

export function normalizeUgandaMobileNumber(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const localNumber = digits.startsWith('256') ? digits.slice(3) : digits.startsWith('0') ? digits.slice(1) : digits;
  return /^7\d{8}$/.test(localNumber) ? `+256${localNumber}` : null;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export function getAvailabilityColor(status: string): string {
  switch (status) {
    case 'available': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'busy': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'vacation': return 'text-slate-500 bg-slate-50 border-slate-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export function getAvailabilityLabel(status: string): string {
  switch (status) {
    case 'available': return 'Available';
    case 'busy': return 'Busy';
    case 'vacation': return 'On Vacation';
    default: return status;
  }
}

export function getBookingStatusColor(status: string): string {
  switch (status) {
    case 'requested': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'accepted': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'on_the_way': return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'in_progress': return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export function getBookingStatusLabel(status: string): string {
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function getUrgencyColor(urgency: string): string {
  switch (urgency) {
    case 'emergency': return 'text-red-600 bg-red-50 border-red-200';
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
    default: return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}
