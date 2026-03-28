import React, { useEffect, useState } from "react";

type SocialKey =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "youtube"
  | "x"
  | "pinterest"
  | "canva"
  | "threads";

type SocialSettings = {
  url: string;
  hidden: boolean;
};

type SocialItem = {
  key: SocialKey;
  label: string;
  placeholder: string;
  enabled: boolean;
  comingSoon?: boolean;
};

type Props = {
  value?: Partial<Record<SocialKey, SocialSettings>>;
  order?: SocialKey[];
  onChange?: (nextLinks: Record<SocialKey, SocialSettings>, nextOrder: SocialKey[]) => void;
  className?: string;
};

const SOCIAL_CONFIG: SocialItem[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourname", enabled: true },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/yourpage", enabled: true },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourname", enabled: true },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel", enabled: true },
  { key: "x", label: "X", placeholder: "https://x.com/yourname", enabled: true },
  { key: "pinterest", label: "Pinterest", placeholder: "https://pinterest.com/yourname", enabled: true },
  { key: "canva", label: "Canva", placeholder: "https://canva.com/your-link", enabled: true },
  { key: "threads", label: "Threads", placeholder: "https://threads.net/@yourname", enabled: true },
];

export default function SocialIconGrid({ value, order: propOrder, onChange, className = "" }: Props) {
  const [links, setLinks] = useState<Record<SocialKey, SocialSettings>>(() => {
    const base = SOCIAL_CONFIG.reduce((acc, item) => ({
      ...acc,
      [item.key]: { url: "", hidden: false }
    }), {} as Record<SocialKey, SocialSettings>);
    return { ...base, ...(value || {}) };
  });

  const [order, setOrder] = useState<SocialKey[]>(propOrder || SOCIAL_CONFIG.map(i => i.key));
  const [activeKey, setActiveKey] = useState<SocialKey | null>(null);
  const [draft, setDraft] = useState("");
  const [draggedKey, setDraggedKey] = useState<SocialKey | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (value) setLinks((prev) => ({ ...prev, ...value }));
  }, [value]);

  useEffect(() => {
    if (propOrder) setOrder(propOrder);
  }, [propOrder]);

  const handleDragStart = (key: SocialKey) => setDraggedKey(key);

  const handleDragOver = (e: React.DragEvent, targetKey: SocialKey) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) return;
    const newOrder = [...order];
    const oldIdx = newOrder.indexOf(draggedKey);
    const newIdx = newOrder.indexOf(targetKey);
    newOrder.splice(oldIdx, 1);
    newOrder.splice(newIdx, 0, draggedKey);
    setOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    onChange?.(links, order);
  };

  const openEditor = (item: SocialItem) => {
    if (item.comingSoon) return;
    setActiveKey(item.key);
    setDraft(links[item.key]?.url || "");
  };

  const closeEditor = () => {
    setActiveKey(null);
    setCopyFeedback(false);
  };

  const updateSetting = (updates: Partial<SocialSettings>) => {
    if (!activeKey) return;
    const next = {
      ...links,
      [activeKey]: { ...links[activeKey], ...updates }
    };
    setLinks(next);
    onChange?.(next, order);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const activeItem = SOCIAL_CONFIG.find(i => i.key === activeKey);

  return (
    <>
      <div className={`w-full ${className}`}>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3">
          {order.map((key) => {
            const config = SOCIAL_CONFIG.find(i => i.key === key)!;
            const linkData = links[key];
            const filled = Boolean(linkData?.url);
            const isHidden = linkData?.hidden;
            const disabled = config.comingSoon;

            return (
              <button
                key={key}
                draggable={!disabled}
                onDragStart={() => handleDragStart(key)}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragEnd={handleDragEnd}
                type="button"
                onClick={() => openEditor(config)}
                className={[
                  "group relative flex flex-col items-center justify-center rounded-3xl border transition-all duration-200 h-[82px] w-full overflow-hidden",
                  disabled
                    ? "bg-zinc-200/70 border-zinc-300 opacity-60 cursor-not-allowed"
                    : "bg-white border-white/80 shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,0,0,0.18)] active:scale-[0.98] cursor-grab",
                  draggedKey === key ? "opacity-20" : "opacity-100"
                ].join(" ")}
              >
                <div className="mb-1 transition-transform duration-200 group-hover:scale-110">
                  <SocialIcon type={key} disabled={disabled} />
                </div>
                <span className={`text-[11px] font-semibold ${disabled ? "text-zinc-500" : "text-zinc-800"}`}>
                  {config.label}
                </span>

                {config.comingSoon ? (
                  <span className="absolute top-2 right-2 rounded-full bg-zinc-800 text-white text-[9px] px-2 py-1 leading-none">Soon</span>
                ) : isHidden ? (
                  <span className="absolute top-2 right-2 rounded-full bg-amber-500 text-white text-[9px] px-1.5 py-1 leading-none font-bold">Hidden</span>
                ) : filled ? (
                  <span className="absolute top-2 right-2 rounded-full bg-emerald-500 text-white text-[9px] px-2 py-1 leading-none">Set</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {activeKey && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[28px] bg-white shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <SocialIcon type={activeKey} />
                <h3 className="text-base font-bold text-zinc-900">{activeItem?.label} Link</h3>
              </div>
              <button onClick={closeEditor} className="h-9 w-9 rounded-full bg-zinc-100 text-zinc-700 flex items-center justify-center text-lg font-bold">×</button>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-zinc-800">URL</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-md hover:bg-indigo-100 transition-colors"
                  >
                    <CopyIcon size={12} /> {copyFeedback ? "Copied!" : "Copy"}
                  </button>
                  {draft && (
                    <a
                      href={draft}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase bg-zinc-100 px-2 py-1 rounded-md hover:bg-zinc-200"
                    >
                      <OpenIcon size={12} /> Open
                    </a>
                  )}
                </div>
              </div>

              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeItem?.placeholder}
                className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
              />

              <div className="mt-4 p-3 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${links[activeKey].hidden ? 'bg-amber-100 text-amber-600' : 'bg-zinc-200 text-zinc-500'}`}>
                    <EyeIcon size={16} crossed={links[activeKey].hidden} />
                  </div>
                  <span className="text-xs font-semibold text-zinc-600">Hide on PDF Export</span>
                </div>
                <button
                  onClick={() => updateSetting({ hidden: !links[activeKey].hidden })}
                  className={`h-6 w-10 rounded-full transition-colors relative ${links[activeKey].hidden ? 'bg-amber-500' : 'bg-zinc-300'}`}
                >
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${links[activeKey].hidden ? 'right-1' : 'left-1'}`} />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    setDraft("");
                    updateSetting({ url: "", hidden: false });
                    closeEditor();
                  }}
                  className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
                >
                  <TrashIcon size={16} /> Delete
                </button>
                <div className="flex gap-2">
                  <button onClick={closeEditor} className="rounded-2xl px-4 py-2.5 text-sm font-semibold bg-zinc-100">Cancel</button>
                  <button
                    onClick={() => {
                      updateSetting({ url: draft.trim() });
                      closeEditor();
                    }}
                    className="rounded-2xl px-6 py-2.5 text-sm font-semibold bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- Utility Icons ---
function CopyIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function OpenIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function TrashIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EyeIcon({ size = 16, crossed = false }: { size?: number; crossed?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
      {crossed && <line x1="1" y1="1" x2="23" y2="23" />}
    </svg>
  );
}

// --- Social Icons (inline SVG, no local PNGs) ---
function SocialIcon({ type, disabled = false }: { type: SocialKey; disabled?: boolean }) {
  const opacity = disabled ? 0.45 : 1;
  switch (type) {
    case "instagram": return (
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ opacity }}>
        <defs><linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f58529" /><stop offset="35%" stopColor="#dd2a7b" /><stop offset="70%" stopColor="#8134af" /><stop offset="100%" stopColor="#515bd4" /></linearGradient></defs>
        <rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig-grad)" /><rect x="7" y="7" width="10" height="10" rx="3.5" fill="none" stroke="white" strokeWidth="1.8" /><circle cx="12" cy="12" r="2.6" fill="none" stroke="white" strokeWidth="1.8" /><circle cx="17" cy="7" r="1.1" fill="white" />
      </svg>
    );
    case "facebook": return (
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ opacity }}>
        <rect width="24" height="24" rx="6" fill="#1877F2" /><path d="M13.3 19v-6.1h2.05l.35-2.4H13.3V9.05c0-.7.25-1.2 1.25-1.2h1.3V5.7c-.25-.03-1.1-.1-2.08-.1-2.05 0-3.47 1.25-3.47 3.55v1.35H8v2.4h2.3V19h3Z" fill="white" />
      </svg>
    );
    case "tiktok": return (
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ opacity }}>
        <rect width="24" height="24" rx="6" fill="#000" /><path d="M14.5 5.5c.5 1.4 1.8 2.5 3.3 2.8v2.2c-1.1-.05-2.2-.4-3.2-1v4.4a4.4 4.4 0 1 1-4.4-4.4c.25 0 .5.02.75.08v2.2a2.2 2.2 0 1 0 1.45 2.06V5.5h2.13Z" fill="white" />
      </svg>
    );
    case "youtube": return (
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ opacity }}>
        <rect width="24" height="24" rx="6" fill="#FF0000" /><path d="M9.5 8.2 16 12l-6.5 3.8V8.2Z" fill="white" />
      </svg>
    );
    case "x": return (
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ opacity }}>
        <rect width="24" height="24" rx="6" fill="#111" /><path d="M7 6h2.4l3.1 4.1L16 6h1.8l-4.3 4.9L18 18h-2.4l-3.4-4.5L8.4 18H6.6l4.7-5.4L7 6Z" fill="white" />
      </svg>
    );
    case "pinterest": return (
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ opacity }}>
        <rect width="24" height="24" rx="6" fill="#E60023" /><path d="M12.1 5.4c-3.65 0-5.5 2.6-5.5 4.8 0 1.32.5 2.48 1.58 2.92.18.07.35 0 .4-.2.05-.15.17-.52.22-.67.08-.2.05-.28-.11-.48-.34-.4-.56-.92-.56-1.66 0-2.15 1.6-4.08 4.18-4.08 2.28 0 3.53 1.39 3.53 3.24 0 2.43-1.08 4.48-2.68 4.48-.88 0-1.54-.73-1.33-1.63.25-1.08.73-2.24.73-3.02 0-.7-.38-1.28-1.15-1.28-.9 0-1.63.93-1.63 2.18 0 .8.27 1.34.27 1.34l-1.1 4.67c-.33 1.4-.05 3.12-.03 3.3.01.1.14.13.2.05.08-.1 1.1-1.37 1.45-2.63.1-.36.57-2.23.57-2.23.28.55 1.1 1.03 1.97 1.03 2.59 0 4.34-2.36 4.34-5.52 0-2.39-2.03-4.62-5.12-4.62Z" fill="white" />
      </svg>
    );
    case "canva": return (
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ opacity }}>
        <defs><linearGradient id="canva-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#00C4CC" /><stop offset="100%" stopColor="#7B61FF" /></linearGradient></defs>
        <rect width="24" height="24" rx="6" fill="url(#canva-grad)" /><path d="M14.9 8.9c-.63-.63-1.58-1.02-2.66-1.02-2.08 0-3.82 1.65-3.82 4.12 0 2.52 1.72 4.13 3.84 4.13 1.08 0 2-.35 2.68-.97l-.7-1.14c-.45.4-1.08.67-1.82.67-1.28 0-2.31-.98-2.31-2.69 0-1.68 1-2.68 2.32-2.68.75 0 1.36.28 1.83.7l.64-1.12Z" fill="white" />
      </svg>
    );
    case "threads": return (
      <svg width="34" height="34" viewBox="0 0 24 24" style={{ opacity }}>
        <rect width="24" height="24" rx="6" fill="#8b8b8b" /><path d="M13.45 10.15c-.15-1.2-.92-1.82-2.2-1.82-1.35 0-2.32.76-2.73 2.13l-1.5-.42c.6-1.95 2.13-3.04 4.34-3.04 2.3 0 3.72 1.18 3.94 3.28 1.18.25 1.9 1.1 1.9 2.3 0 2.06-1.62 3.44-4.06 3.44-2.84 0-4.74-1.72-4.74-4.28 0-.35.03-.67.1-.98h1.58c-.08.28-.12.58-.12.9 0 1.72 1.23 2.9 3.1 2.9 1.52 0 2.5-.76 2.5-1.88 0-.76-.45-1.22-1.38-1.4-.4 1.02-1.32 1.55-2.6 1.55-1.25 0-2.08-.63-2.08-1.62 0-1.12.92-1.82 2.38-1.82.53 0 1.04.07 1.57.18Zm-1.53 1.18c-.78 0-1.2.25-1.2.67 0 .37.33.6.87.6.7 0 1.2-.33 1.42-.92a4.16 4.16 0 0 0-1.1-.15Z" fill="white" />
      </svg>
    );
    default: return null;
  }
}
