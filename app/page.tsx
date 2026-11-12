"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CARDS, getCard } from "@/lib/cards";
import { SPREADS } from "@/lib/spreads";

type Stage = "ask" | "identifying" | "confirm" | "reading";
type Pick = { card: string; reversed: boolean; lowConfidence?: boolean };
type Photo = { dataUrl: string; base64: string };

const MAX_EDGE = 1568;

// Shrink the photo in the browser so uploads stay small and fast.
function toPhoto(source: CanvasImageSource, width: number, height: number): Photo {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
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
      resolve(toPhoto(img, img.naturalWidth, img.naturalHeight));
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("ask");
  const [question, setQuestion] = useState("");
  const [spreadId, setSpreadId] = useState(SPREADS[1].id);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [notes, setNotes] = useState("");
  const [reading, setReading] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const mediaStream = useRef<MediaStream | null>(null);

  const spread = SPREADS.find((s) => s.id === spreadId)!;

  const closeCamera = useCallback(() => {
    mediaStream.current?.getTracks().forEach((t) => t.stop());
    mediaStream.current = null;
    setCameraOpen(false);
  }, []);

  useEffect(() => closeCamera, [closeCamera]);

  useEffect(() => {
    if (cameraOpen && video.current && mediaStream.current) {
      video.current.srcObject = mediaStream.current;
    }
  }, [cameraOpen]);

  async function openCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      fileInput.current?.click();
      return;
    }
    try {
      mediaStream.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setCameraOpen(true);
    } catch {
      setError("The camera is blocked or unavailable. Upload a photo instead.");
    }
  }

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    setPhoto(toPhoto(v, v.videoWidth, v.videoHeight));
    closeCamera();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    try {
      setPhoto(await fileToPhoto(file));
    } catch {
      setError("That file could not be opened as a photo. Try a JPEG or PNG.");
    }
  }

  async function identify() {
    if (!photo) return;
    setError("");
    setStage("identifying");
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo.base64, mediaType: "image/jpeg", spreadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const found: Pick[] = data.cards;
      setPicks(spread.positions.map((_, i) => found[i] ?? { card: "", reversed: false }));
      setNotes(found.length === 0 ? "No tarot cards were found in this photo. Choose them by hand or try another photo." : data.notes);
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
    setPhoto(null);
    setPicks([]);
    setNotes("");
    setReading("");
    setError("");
  }

  const updatePick = (i: number, patch: Partial<Pick>) =>
    setPicks((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch, lowConfidence: false } : p)));

  const canRead = question.trim().length > 0 && photo !== null;
  const allChosen = picks.length > 0 && picks.every((p) => p.card);

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
              onChange={(e) => setQuestion(e.target.value)}
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
                    onChange={() => setSpreadId(s.id)}
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
              {photo ? (
                <figure className="photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.dataUrl} alt="your tarot spread" />
                  <button type="button" className="link" onClick={() => setPhoto(null)}>
                    use a different photo
                  </button>
                </figure>
              ) : (
                <div className="photo-actions">
                  <button type="button" className="ghost" onClick={openCamera}>
                    take a photo
                  </button>
                  <button type="button" className="ghost" onClick={() => fileInput.current?.click()}>
                    upload a photo
                  </button>
                </div>
              )}
              <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFile} />
              <p className="quiet hint">shoot from above, in even light, with every card fully in frame.</p>
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
            {photo && (
              <figure className="photo small">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.dataUrl} alt="your tarot spread" />
              </figure>
            )}
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

      {cameraOpen && (
        <div className="camera" role="dialog" aria-modal="true" aria-label="camera">
          <video ref={video} autoPlay playsInline muted />
          <div className="camera-actions">
            <button className="ghost" onClick={closeCamera}>
              cancel
            </button>
            <button className="primary" onClick={capture}>
              take photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
