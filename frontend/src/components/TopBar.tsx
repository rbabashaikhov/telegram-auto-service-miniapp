import { Link } from 'react-router-dom';

interface TopBarProps {
  title: string;
  backTo?: string;
}

export function TopBar({ title, backTo }: TopBarProps) {
  return (
    <div className="topbar">
      {backTo ? (
        <Link className="btn btn-ghost topbar-back" to={backTo}>
          ← Назад
        </Link>
      ) : (
        <span className="topbar-spacer" />
      )}
      <h1>{title}</h1>
      <span className="topbar-spacer" />
    </div>
  );
}
