export default function Busy({ msg }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="spinner" />
      <p className="hint">{msg}</p>
    </div>
  );
}
