"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

const A4_PX = 794; // 210 mm at 96 dpi

/**
 * Screen-only preview of the invoice.
 *
 * The invoice is rendered inside an A4-wide iframe (so its A4 layout is used on a phone too),
 * with the app's "print" styles switched on, and then scaled down to fit the screen.
 * The real printed / PDF output is NOT affected: printing uses a separate copy of the invoice.
 */
export default function A4Preview({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [wrapW, setWrapW] = useState(0);
  const [height, setHeight] = useState(1123);
  const [zoomed, setZoomed] = useState(false);

  // available width -> scale
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // once the iframe document exists: copy the app CSS (print rules switched on) and mount the invoice
  const onLoad = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return;

    let css = "";
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) css += rule.cssText + "\n";
      } catch {
        /* cross-origin sheet – skip */
      }
    }
    css = css.replace(/@media\s*(\(\s*print\s*\)|print)/g, "@media all");

    if (css.length > 200) {
      const style = doc.createElement("style");
      style.textContent = css;
      doc.head.appendChild(style);
    } else {
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => doc.head.appendChild(n.cloneNode(true)));
    }
    doc.body.style.margin = "0";
    doc.body.style.background = "#fff";
    setMount(doc.body);
  }, []);

  // keep the iframe exactly as tall as the invoice
  useEffect(() => {
    if (!mount) return;
    const win = mount.ownerDocument.defaultView;
    if (!win) return;
    const measure = () => setHeight(Math.max(1123, mount.ownerDocument.documentElement.scrollHeight));
    measure();
    const ro = new win.ResizeObserver(measure);
    ro.observe(mount);
    return () => ro.disconnect();
  }, [mount]);

  const fit = wrapW > 0 ? Math.min(1, wrapW / A4_PX) : 1;
  const canZoom = fit < 0.99;
  const scale = zoomed && canZoom ? 1 : fit;

  return (
    <div ref={wrapRef} className="w-full">
      {canZoom && (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-stone-500">Invoice preview</p>
          <div className="inline-flex rounded-lg bg-stone-200/70 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className={`rounded-md px-3 py-1.5 ${!zoomed ? "bg-white text-brand shadow-sm" : "text-stone-500"}`}
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setZoomed(true)}
              className={`rounded-md px-3 py-1.5 ${zoomed ? "bg-white text-brand shadow-sm" : "text-stone-500"}`}
            >
              Zoom
            </button>
          </div>
        </div>
      )}

      <div className={zoomed && canZoom ? "overflow-x-auto rounded-xl" : ""}>
        <div
          className="mx-auto overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-stone-200"
          style={{ width: A4_PX * scale, height: height * scale }}
        >
          <iframe
            ref={frameRef}
            title="Invoice preview"
            onLoad={onLoad}
            srcDoc='<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>'
            style={{
              width: A4_PX,
              height,
              border: 0,
              display: "block",
              transform: `scale(${scale})`,
              transformOrigin: "0 0",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {mount && createPortal(children, mount)}
    </div>
  );
}
