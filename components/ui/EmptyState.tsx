interface Props {
  icon?: string;
  label: string;
  sub?: string;
}

export default function EmptyState({ icon, label, sub }: Props) {
  return (
    <div className="empty-state-v2">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <div className="empty-state-label">{label}</div>
      {sub && <div className="empty-state-sub">{sub}</div>}
    </div>
  );
}
