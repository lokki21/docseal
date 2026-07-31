export default function Verdict({ kind, title, detail }) {
  return (
    <div className={`banner ${kind}`}>
      <div className="eyebrow">{title}</div>
      {detail && <div className="detail">{detail}</div>}
    </div>
  );
}
