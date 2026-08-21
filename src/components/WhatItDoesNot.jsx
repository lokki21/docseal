import { useLang } from "../i18n/useLang.jsx";

/* The "Qué no hace" panel, shared verbatim by the two audience pages so the
   copy lives in a single pair of translation keys. */
export default function WhatItDoesNot() {
  const { t } = useLang();
  return (
    <div className="banner info" style={{ textAlign: "left", marginBottom: 0 }}>
      <div className="eyebrow">{t.fitLimitTitle}</div>
      <div className="detail">{t.fitLimitBody}</div>
    </div>
  );
}
