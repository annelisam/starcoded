"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { CARDS, getCard } from "@/lib/cards";
import { SPREADS, getSpread, type Spread } from "@/lib/spreads";

type Stage = "ask" | "identifying" | "confirm" | "reading";
type Pick = { card: string; reversed: boolean; lowConfidence?: boolean };
type Photo = { dataUrl: string; base64: string };
// "spread": one photo of the whole layout. "cards": one photo per card, in position order.
type Capture = { mode: "spread" | "cards"; photos: Photo[] };

const SPREAD_EDGE = 1568;
const CARD_EDGE = 1024;

// Shrink the photo in the browser so uploads stay small and fast.
function toPhoto(source: CanvasImageSource, width: number, height: number, maxEdge: number): Photo {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { dataUrl, base64: dataUrl.split(",")[1] };
}

function fileToPhoto(file: File): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve(toPhoto(img, img.naturalWidth, img.naturalHeight, SPREAD_EDGE));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

// A device with a mouse or trackpad is treated as a desktop: its camera faces the person, not the table.
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
function subscribePointer(onChange: () => void) {
  const mq = window.matchMedia(FINE_POINTER);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
function useIsDesktop() {
  return useSyncExternalStore(
    subscribePointer,
    () => window.matchMedia(FINE_POINTER).matches,
    () => false,
  );
}

const CARD_W = 10;
const CARD_H = 17;

// Numbered card outlines drawn over the live camera so cards land in the right place and order.
function Guide({ slots, firstNumber = 1 }: { slots: Spread["slots"]; firstNumber?: number }) {
  const pad = 3;
  const boxes = slots.map((s) => {
    const cx = s.x + CARD_W / 2;
    const cy = s.y + CARD_H / 2;
    const w = s.sideways ? CARD_H : CARD_W;
    const h = s.sideways ? CARD_W : CARD_H;
    return { cx, cy, w, h, lx: cx + (s.lx ?? 0), ly: cy + (s.ly ?? 0) };
  });
  const minX = Math.min(...boxes.map((b) => b.cx - b.w / 2)) - pad;
  const minY = Math.min(...boxes.map((b) => b.cy - b.h / 2)) - pad;
  const maxX = Math.max(...boxes.map((b) => b.cx + b.w / 2)) + pad;
  const maxY = Math.max(...boxes.map((b) => b.cy + b.h / 2)) + pad;
  return (
    <svg className="guide" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} aria-hidden="true">
      {boxes.map((b, i) => (
        <g key={i}>
          <rect className="guide-shadow" x={b.cx - b.w / 2} y={b.cy - b.h / 2} width={b.w} height={b.h} rx={0.8} />
          <rect className="guide-line" x={b.cx - b.w / 2} y={b.cy - b.h / 2} width={b.w} height={b.h} rx={0.8} />
          <text className="guide-number" x={b.lx} y={b.ly} textAnchor="middle" dominantBaseline="central">
            {i + firstNumber}
          </text>
        </g>
      ))}
    </svg>
  );
}

const ONE_SLOT: Spread["slots"] = [{ x: 0, y: 0 }];

export default function Home() {
  const isDesktop = useIsDesktop();

  const [stage, setStage] = useState<Stage>("ask");
  const [question, setQuestion] = useState("");
  const [spreadId, setSpreadId] = useState(SPREADS[1].id);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [notes, setNotes] = useState("");
  const [reading, setReading] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");

  // Camera. In "cards" mode, `shots` collects one photo per position before the camera closes.
  const [camera, setCamera] = useState<"spread" | "cards" | null>(null);
  const [shots, setShots] = useState<Photo[]>([]);
  const [videoRatio, setVideoRatio] = useState(16 / 9);

  // Phone handoff.
  const [qr, setQr] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const mediaStream = useRef<MediaStream | null>(null);

  const spread = SPREADS.find((s) => s.id === spreadId)!;
  const total = spread.positions.length;

  // A phone that scanned the QR code arrives with the question and spread in the URL fragment.
  // The fragment never leaves the browser, so the question is not sent to the server by the link itself.
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const q = params.get("q");
    const s = params.get("s");
    if (!q && !s) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (q) setQuestion(q.slice(0, 500));
    if (s && getSpread(s)) setSpreadId(s);
    /* eslint-enable react-hooks/set-state-in-effect */
    history.replaceState(null, "", window.location.pathname);
  }, []);

  const closeCamera = useCallback(() => {
    mediaStream.current?.getTracks().forEach((t) => t.stop());
    mediaStream.current = null;
    setCamera(null);
    setShots([]);
  }, []);

  useEffect(() => closeCamera, [closeCamera]);

  useEffect(() => {
    if (camera && video.current && mediaStream.current) {
      video.current.srcObject = mediaStream.current;
    }
  }, [camera]);

  function chooseSpread(id: string) {
    setSpreadId(id);
    // Per-card photos are tied to the spread's positions, so they do not carry over.
    if (capture?.mode === "cards") setCapture(null);
  }

  async function openCamera() {
    setError("");
    setQr(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInput.current?.click();
      return;
    }
    try {
      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setShots([]);
      setCamera(isDesktop ? "cards" : "spread");
    } catch {
      setError("The camera is blocked or unavailable. Upload a photo instead.");
    }
  }

  function takePhoto() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    if (camera === "spread") {
      setCapture({ mode: "spread", photos: [toPhoto(v, v.videoWidth, v.videoHeight, SPREAD_EDGE)] });
      closeCamera();
      return;
    }
    const next = [...shots, toPhoto(v, v.videoWidth, v.videoHeight, CARD_EDGE)];
    if (next.length >= total) {
      setCapture({ mode: "cards", photos: next });
      closeCamera();
    } else {
      setShots(next);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    setQr(null);
    try {
      setCapture({ mode: "spread", photos: [await fileToPhoto(file)] });
    } catch {
      setError("That file could not be opened as a photo. Try a JPEG or PNG.");
    }
  }

  async function showQr() {
    setError("");
    const params = new URLSearchParams({ s: spreadId });
    if (question.trim()) params.set("q", question.trim());
    const url = `${window.location.origin}/#${params.toString()}`;
    try {
      setQr(await QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: "#000000", light: "#ffffff" } }));
    } catch {
      setError("The QR code could not be made. Open this page on your phone instead.");
    }
  }

  async function identify() {
    if (!capture) return;
    setError("");
    setStage("identifying");
    try {
      const images = capture.photos.map((p) => p.base64);
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(capture.mode === "cards" ? { images } : { image: images[0] }),
          mediaType: "image/jpeg",
          spreadId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const found: Pick[] = data.cards;
      setPicks(spread.positions.map((_, i) => found[i] ?? { card: "", reversed: false }));
      setNotes(found.length === 0 ? "No tarot cards were found. Choose them by hand or try another photo." : data.notes);
      setStage("confirm");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The photo could not be read. Try again.");
      setStage("ask");
    }
  }

  async function interpret() {
    setError("");
    setReading("");
    setStage("reading");
    setStreaming(true);
    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, spreadId, cards: picks.map(({ card, reversed }) => ({ card, reversed })) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setReading(text);
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The reading could not be completed. Try again.");
      setStage("confirm");
    } finally {
      setStreaming(false);
    }
  }

  function reset() {
    setStage("ask");
    setQuestion("");
    setCapture(null);
    setPicks([]);
    setNotes("");
    setReading("");
    setError("");
    setQr(null);
  }

  const updatePick = (i: number, patch: Partial<Pick>) =>
    setPicks((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch, lowConfidence: false } : p)));

  const canRead = question.trim().length > 0 && capture !== null;
  const allChosen = picks.length > 0 && picks.every((p) => p.card);

  const photos = capture && (
    <div className={capture.mode === "cards" ? "thumbs" : undefined}>
      {capture.photos.map((p, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={p.dataUrl}
          alt={capture.mode === "cards" ? `card ${i + 1}, ${spread.positions[i]?.name}` : "your tarot spread"}
        />
      ))}
    </div>
  );

  return (
    <div className="shell">
      <header className="top">
        <span className="wordmark">starcoded</span>
        {stage !== "ask" && stage !== "identifying" && (
          <button className="link" onClick={reset}>
            new reading
          </button>
        )}
      </header>

      <main>
        {(stage === "ask" || stage === "identifying") && (
          <form
            className="ask"
            onSubmit={(e) => {
              e.preventDefault();
              if (canRead && stage === "ask") identify();
            }}
          >
            <label className="sr" htmlFor="question">
              your question
            </label>
            <textarea
              id="question"
              className="question"
              placeholder="what do you want to know?"
              value={question}
              maxLength={500}
              rows={3}
              onChange={(e) => {
                setQuestion(e.target.value);
                setQr(null);
              }}
            />

            <fieldset className="block">
              <legend>which spread did you lay out?</legend>
              {SPREADS.map((s) => (
                <label key={s.id} className="spread">
                  <input
                    type="radio"
                    name="spread"
                    value={s.id}
                    checked={spreadId === s.id}
                    onChange={() => {
                      chooseSpread(s.id);
                      setQr(null);
                    }}
                  />
                  <span className="spread-name">{s.name}</span>
                  <span className="quiet">
                    {s.positions.length} {s.positions.length === 1 ? "card" : "cards"}
                  </span>
                </label>
              ))}
              <p className="quiet hint">lay it out as {spread.layout}.</p>
            </fieldset>

            <div className="block">
              <p className="legend">show me the cards</p>
              {capture ? (
                <figure className="photo">
                  {photos}
                  <button type="button" className="link" onClick={() => setCapture(null)}>
                    {capture.mode === "cards" ? "retake the cards" : "use a different photo"}
                  </button>
                </figure>
              ) : qr ? (
                <div className="handoff">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR code that opens this reading on your phone" />
                  <div>
                    <p>scan this with your phone camera.</p>
                    <p className="quiet">
                      starcoded opens with your question and spread filled in. photograph the spread from above and the
                      reading continues on your phone.
                    </p>
                    <button type="button" className="link" onClick={() => setQr(null)}>
                      go back
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={isDesktop ? "photo-actions three" : "photo-actions"}>
                    <button type="button" className="ghost" onClick={openCamera}>
                      {isDesktop ? "use my webcam" : "take a photo"}
                    </button>
                    {isDesktop && (
                      <button type="button" className="ghost" onClick={showQr}>
                        continue on my phone
                      </button>
                    )}
                    <button type="button" className="ghost" onClick={() => fileInput.current?.click()}>
                      upload a photo
                    </button>
                  </div>
                  <p className="quiet hint">
                    {isDesktop
                      ? total === 1
                        ? "with a webcam, you hold the card up to the camera. with your phone, you photograph it on the table."
                        : "with a webcam, you hold each card up to the camera in order. with your phone, you photograph the whole spread at once."
                      : "shoot from above, in even light, with every card fully in frame."}
                  </p>
                </>
              )}
              <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
            </div>

            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}

            <button className="primary" type="submit" disabled={!canRead || stage === "identifying"}>
              {stage === "identifying" ? "looking at your cards" : "read my cards"}
            </button>
          </form>
        )}

        {stage === "confirm" && (
          <section className="confirm">
            <h1 className="display">check the cards before i read them.</h1>
            {notes && <p className="note">{notes}</p>}
            {capture && <figure className="photo small">{photos}</figure>}
            <ol className="picks">
              {spread.positions.map((pos, i) => (
                <li key={pos.name}>
                  <label htmlFor={`card-${i}`} className="pos">
                    {pos.name}
                    {picks[i]?.lowConfidence && <span className="flag">not sure about this one</span>}
                  </label>
                  <select
                    id={`card-${i}`}
                    value={picks[i]?.card ?? ""}
                    onChange={(e) => updatePick(i, { card: e.target.value })}
                  >
                    <option value="">choose a card</option>
                    {CARDS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <label className="rev">
                    <input
                      type="checkbox"
                      checked={picks[i]?.reversed ?? false}
                      onChange={(e) => updatePick(i, { reversed: e.target.checked })}
                    />
                    reversed
                  </label>
                </li>
              ))}
            </ol>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <button className="primary" onClick={interpret} disabled={!allChosen}>
              interpret these cards
            </button>
          </section>
        )}

        {stage === "reading" && (
          <article className="reading">
            <h1 className="display asked">{question}</h1>
            <ol className="drawn">
              {picks.map((p, i) => (
                <li key={i}>
                  <span className="quiet">{spread.positions[i].name}</span>
                  <span>
                    {getCard(p.card)?.name}
                    {p.reversed && <em> reversed</em>}
                  </span>
                </li>
              ))}
            </ol>
            <div className="prose" aria-live="polite" aria-busy={streaming}>
              {reading
                ? reading.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
                : <p className="quiet">reading your cards</p>}
            </div>
            {!streaming && reading && (
              <>
                <p className="quiet fine">
                  a reading is a mirror for reflection. it does not replace medical, legal, or financial advice.
                </p>
                <button className="primary" onClick={reset}>
                  ask another question
                </button>
              </>
            )}
          </article>
        )}
      </main>

      {camera && (
        <div className="camera" role="dialog" aria-modal="true" aria-label="camera">
          <div className="camera-stage">
            <div className="camera-frame" style={{ "--ar": videoRatio } as React.CSSProperties}>
              <video
                ref={video}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (v.videoWidth && v.videoHeight) setVideoRatio(v.videoWidth / v.videoHeight);
                }}
              />
              {camera === "cards" ? (
                <Guide slots={ONE_SLOT} firstNumber={shots.length + 1} />
              ) : (
                <Guide slots={spread.slots} />
              )}
            </div>
          </div>
          <p className="camera-hint" aria-live="polite">
            {camera === "cards" ? (
              <>
                <strong>
                  card {shots.length + 1} of {total}: {spread.positions[shots.length].name}.
                </strong>{" "}
                hold it inside the outline, the same way up as it sits on the table.
              </>
            ) : total === 1 ? (
              "fit your card inside the outline."
            ) : (
              "place each card inside its numbered outline."
            )}
          </p>
          <div className="camera-actions">
            {camera === "cards" && shots.length > 0 ? (
              <button className="ghost" onClick={() => setShots(shots.slice(0, -1))}>
                redo card {shots.length}
              </button>
            ) : (
              <button className="ghost" onClick={closeCamera}>
                cancel
              </button>
            )}
            <button className="primary" onClick={takePhoto}>
              {camera === "cards" ? `capture card ${shots.length + 1}` : "take photo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
