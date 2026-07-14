const variantClasses = {
  primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};

function Button({
  type = 'button',
  variant = 'primary',
  className = '',
  children,
  ...buttonProps
}) {
  const selectedVariant = variantClasses[variant] || variantClasses.primary;

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${selectedVariant} ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export default Button;
