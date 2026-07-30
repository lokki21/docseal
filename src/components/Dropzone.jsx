import { useRef, useState } from "react";

export default function Dropzone({ label, sub, accept = ".pdf,application/pdf", onFile }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  return (
    <>
      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <div className={"dropzone" + (drag ? " drag" : "")}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer?.files?.[0]; if (f) onFile(f); }}>
        <p style={{ margin: "0 0 6px", fontSize: 15 }}>{label}</p>
        {sub && <p className="hint" style={{ margin: 0 }}>{sub}</p>}
      </div>
    </>
  );
}
