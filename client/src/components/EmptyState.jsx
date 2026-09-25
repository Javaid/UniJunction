const EmptyState = ({ title = 'Nothing here yet', description }) => (
  <div className="rounded-md border border-dashed border-slate-300 px-6 py-10 text-center">
    <p className="text-sm font-medium text-slate-700">{title}</p>
    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
  </div>
);

export default EmptyState;
