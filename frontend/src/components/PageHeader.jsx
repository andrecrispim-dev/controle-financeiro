export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="pageHeader">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
