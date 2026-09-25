const TONE_BY_STATUS = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  SUSPENDED: 'bg-red-50 text-red-700',
  DEACTIVATED: 'bg-slate-100 text-slate-600',
  ENDED: 'bg-slate-100 text-slate-600',
  INACTIVE: 'bg-slate-100 text-slate-600',
  UNVERIFIED: 'bg-slate-100 text-slate-600',
  REJECTED: 'bg-red-50 text-red-700',
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
      TONE_BY_STATUS[status] || 'bg-slate-100 text-slate-600'
    }`}
  >
    {status}
  </span>
);

export default StatusBadge;
