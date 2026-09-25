const FormField = ({ label, error, id, ...inputProps }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
      {label}
    </label>
    <input
      id={id}
      className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 ${
        error
          ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
          : 'border-slate-300 focus:border-brand-500 focus:ring-brand-500'
      }`}
      {...inputProps}
    />
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

export default FormField;
