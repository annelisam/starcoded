"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { CARDS, getCard } from "@/lib/cards";
import { SPREADS, getSpread } from "@/lib/spreads";
import { STILL, analyze, brightness, cardRegion, slotRegions, toGray } from "@/lib/detect";
import { Guide, ONE_SLOT, SpreadMap } from "./spread-art";

type Stage = "ask" | "identifying" | "confirm" | "reading";
type Pick = { card: string; reversed: boolean; lowConfidence?: boolean };
type Photo = { dataUrl: string; base64: string };
// "spread": one photo of the whole layout. "cards": one photo per card, in position order.
type Capture = { mode: "spread" | "cards"; photos: Photo[]; thumbs?: string[]; picks?: Pick[] };
// One webcam capture. `pick` arrives once the card has been recognized.
type Shot = { id: number; photo: Photo; thumb: string; status: "pending" | "done" | "error"; pick: Pick | null };
type Flyer = { src: string; from: DOMRect; to: DOMRect; index: number };

const SPREAD_EDGE = 1568;
const CARD_EDGE = 1024;
const HOLD_MS = 900; // how long a card must sit still in the outline before it is captured
const CLEAR_MS = 800; // how long the outline must stay empty before the next card is looked for
const SAMPLE_MS = 120;
const SAMPLE_W = 192;
const MAX_REJECTS = 3;
const DARK = 55; // average brightness below this gets a lighting tip
const TIP_MS = 700; // shortest time a tip stays on screen, so tips do not flicker

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

// Cut the outlined card out of the video frame, for the spread map.
function cropCard(v: HTMLVideoElement): string {
  const r = cardRegion(v.videoWidth, v.videoHeight);
  const canvas = document.createElement("canvas");
  canvas.width = 200;
  canvas.height = 340;
  canvas.getContext("2d")!.drawImage(v, r.x, r.y, r.w, r.h, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
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

const cardLabel = (p: Pick | null) => {
  const card = p && getCard(p.card);
  return card ? `${card.name}${p.reversed ? " reversed" : ""}` : "";
};

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
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Camera
  const [camera, setCamera] = useState<"spread" | "cards" | null>(null);
  const [videoRatio, setVideoRatio] = useState(16 / 9);
  const [shots, setShotsState] = useState<Shot[]>([]);
  const [detect, setDetect] = useState<"searching" | "locking" | "done">("searching");
  const [auto, setAuto] = useState(true);
  const [cameraNote, setCameraNote] = useState("");
  const [flash, setFlash] = useState(0);
  const [flyer, setFlyerState] = useState<Flyer | null>(null);
  const [filled, setFilled] = useState<boolean[]>([]);
  const [tip, setTip] = useState("");
  const [torch, setTorch] = useState<"none" | "off" | "on">("none");

  // Phone handoff
  const [qr, setQr] = useState<string | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const flyerEl = useRef<HTMLImageElement>(null);
  const mediaStream = useRef<MediaStream | null>(null);

  // The detection loop and async callbacks read the latest values from here.
  const live = useRef({
    shots: [] as Shot[],
    flyer: null as Flyer | null,
    phase: "searching" as "searching" | "locking" | "cooldown",
    lastGray: null as Uint8ClampedArray | null,
    rejects: 0,
    nextId: 1,
    session: 0,
    total: 0,
    auto: true,
    question: "",
    spreadId: "",
    slots: [] as { x: number; y: number; sideways?: boolean }[],
    torch: "none" as "none" | "off" | "on",
    takeShot: () => {},
  });

  const spread = SPREADS.find((s) => s.id === spreadId)!;
  const total = spread.positions.length;

  const setShots = (next: Shot[]) => {
    live.current.shots = next;
    setShotsState(next);
  };
  const setFlyer = (next: Flyer | null) => {
    live.current.flyer = next;
    setFlyerState(next);
  };

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
    const l = live.current;
    l.session++;
    l.shots = [];
    l.flyer = null;
    l.phase = "searching";
    l.rejects = 0;
    setCamera(null);
    setShotsState([]);
    setFlyerState(null);
    setDetect("searching");
    setCameraNote("");
    setFilled([]);
    setTip("");
    setTorch("none");
  }, []);

  useEffect(() => closeCamera, [closeCamera]);

  useEffect(() => {
    if (camera && video.current && mediaStream.current) {
      video.current.srcObject = mediaStream.current;
    }
  }, [camera]);

  function chooseSpread(id: string) {
    setSpreadId(id);
    setQr(null);
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
      // Phones that expose the camera light get a flash button.
      const track = mediaStream.current.getVideoTracks()[0];
      const caps = (track.getCapabilities?.() ?? {}) as { torch?: boolean };
      setTorch(caps.torch ? "off" : "none");
      setAuto(true);
      setCamera(isDesktop ? "cards" : "spread");
    } catch {
      setError("The camera is blocked or unavailable. Upload a photo instead.");
    }
  }

  async function toggleTorch() {
    const track = mediaStream.current?.getVideoTracks()[0];
    if (!track || torch === "none") return;
    const next = torch === "on" ? "off" : "on";
    try {
      await track.applyConstraints({ advanced: [{ torch: next === "on" } as MediaTrackConstraintSet] });
      setTorch(next);
    } catch {
      setTorch("none");
    }
  }

  // All cards are captured and recognized: leave the camera with the spread filled in.
  function maybeFinish() {
    const l = live.current;
    if (l.shots.length < l.total || l.flyer || l.shots.some((s) => s.status === "pending")) return;
    const found = l.shots.map((s) => s.pick ?? { card: "", reversed: false });
    setCapture({ mode: "cards", photos: l.shots.map((s) => s.photo), thumbs: l.shots.map((s) => s.thumb), picks: found });
    setPicks(found);
    setNotes(l.shots.some((s) => !s.pick) ? "Some cards could not be read. Choose them by hand." : "");
    const ready = l.question.trim().length > 0;
    closeCamera();
    if (ready) setStage("confirm");
  }

  async function recognize(shot: Shot, index: number) {
    const l = live.current;
    const session = l.session;
    let pick: Pick | null = null;
    let seen = true;
    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [shot.photo.base64], offset: index, mediaType: "image/jpeg", spreadId: l.spreadId }),
      });
      const data = await res.json();
      if (res.ok) {
        pick = data.cards?.[0] ?? null;
        seen = pick !== null;
      }
    } catch {
      // Leave the slot unread. It can be fixed on the confirm screen.
    }
    if (l.session !== session || !l.shots.some((s) => s.id === shot.id)) return;

    const isLast = l.shots[l.shots.length - 1].id === shot.id;
    if (!seen && isLast) {
      // Like a rejected check photo: drop it and ask again.
      setShots(l.shots.slice(0, -1));
      l.phase = "cooldown";
      l.rejects++;
      if (l.rejects >= MAX_REJECTS) {
        setAuto(false);
        setCameraNote("automatic capture is off. hold the card in the outline and press capture.");
      } else {
        setCameraNote(`that did not look like a tarot card. hold card ${index + 1} inside the outline again.`);
      }
      setDetect("searching");
      return;
    }
    // Every card in a deck is unique, so a repeat means the same card was captured twice.
    const twin = pick ? l.shots.findIndex((s) => s.id !== shot.id && s.pick?.card === pick!.card) : -1;
    if (twin >= 0 && isLast) {
      setShots(l.shots.slice(0, -1));
      l.phase = "cooldown";
      setCameraNote(`that is the same card as position ${twin + 1}. hold up card ${index + 1}.`);
      setDetect("searching");
      return;
    }
    if (pick) l.rejects = 0;
    setShots(l.shots.map((s) => (s.id === shot.id ? { ...s, status: pick ? "done" : "error", pick } : s)));
    maybeFinish();
  }

  function takeShot() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    if (camera === "spread") {
      const cap: Capture = { mode: "spread", photos: [toPhoto(v, v.videoWidth, v.videoHeight, SPREAD_EDGE)] };
      setCapture(cap);
      closeCamera();
      // With a question already typed, go straight to reading the photo.
      if (live.current.question.trim()) identify(cap);
      return;
    }
    const l = live.current;
    const index = l.shots.length;
    if (index >= l.total) return;
    const shot: Shot = {
      id: l.nextId++,
      photo: toPhoto(v, v.videoWidth, v.videoHeight, CARD_EDGE),
      thumb: cropCard(v),
      status: "pending",
      pick: null,
    };
    const from = document.querySelector(".camera-frame .guide-line")?.getBoundingClientRect();
    const to = document.querySelector(`.camera-side [data-slot="${index}"]`)?.getBoundingClientRect();
    setShots([...l.shots, shot]);
    if (from && to && to.width > 0) setFlyer({ src: shot.thumb, from, to, index });
    l.phase = "cooldown";
    setFlash((n) => n + 1);
    setDetect("done");
    setCameraNote("");
    recognize(shot, index);
  }

  function redoLast() {
    const l = live.current;
    setShots(l.shots.slice(0, -1));
    setFlyer(null);
    l.phase = "searching";
    setDetect("searching");
    setCameraNote("");
  }

  // Keep the values the detection loop reads up to date.
  useEffect(() => {
    const l = live.current;
    l.total = total;
    l.auto = auto;
    l.question = question;
    l.spreadId = spreadId;
    l.slots = spread.slots;
    l.torch = torch;
    l.takeShot = takeShot;
  });

  // Watch the camera. Give live tips, mark which outlines hold a card, and capture without a tap
  // once every outline is filled and the picture is steady.
  useEffect(() => {
    if (!camera) return;
    const l = live.current;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    let lockStart = 0;
    let misses = 0;
    let clearSince = 0;
    let shownTip = "";
    let tipAt = 0;
    let shownFilled = "";

    const showTip = (next: string, now: number) => {
      if (next === shownTip || now - tipAt < TIP_MS) return;
      shownTip = next;
      tipAt = now;
      setTip(next);
    };

    const timer = setInterval(() => {
      const v = video.current;
      if (!v || !v.videoWidth) return;
      const w = SAMPLE_W;
      const h = Math.round((SAMPLE_W * v.videoHeight) / v.videoWidth);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      ctx.drawImage(v, 0, 0, w, h);
      const gray = toGray(ctx.getImageData(0, 0, w, h).data);
      const prev = l.lastGray && l.lastGray.length === gray.length ? l.lastGray : null;
      const now = performance.now();
      l.lastGray = gray;

      const oneCard = camera === "cards";
      // Overlapping outlines (the celtic cross) hide each other's edges, so those spreads get tips only.
      const traceable = oneCard || !l.slots.some((s) => s.sideways);
      const regions = oneCard ? [cardRegion(w, h)] : slotRegions(l.slots, w, h);
      const results = regions.map((r) => analyze(gray, prev, w, h, r));
      const inPlace = results.filter((r) => r.aligned).length;
      const allIn = traceable && inPlace === regions.length;
      const still = Math.max(...results.map((r) => r.motion)) < STILL;
      const dark = brightness(gray) < DARK;

      if (!oneCard && traceable) {
        const key = results.map((r) => (r.aligned ? 1 : 0)).join("");
        if (key !== shownFilled) {
          shownFilled = key;
          setFilled(results.map((r) => r.aligned));
        }
      }

      // One tip at a time, most useful first.
      let next = "";
      if (dark) {
        next =
          l.torch === "off"
            ? "it is dark here. turn on the flash."
            : l.torch === "on"
              ? "still dark. move closer to a light."
              : "it is dark here. move closer to a light.";
      } else if (!traceable) {
        next = still ? "" : "hold steady.";
      } else if (allIn) {
        next = still ? "" : "hold steady.";
      } else if (oneCard) {
        next = results[0].sides >= 1 ? "almost. line the card's edges up with the outline." : "";
      } else if (inPlace > 0) {
        next = `${inPlace} of ${regions.length} cards are in place. move until every card sits in its outline.`;
      }
      showTip(next, now);

      const armed = l.auto && traceable && (!oneCard || l.shots.length < l.total);
      if (!armed) {
        if (l.phase === "locking") {
          l.phase = "searching";
          setDetect("searching");
        }
        return;
      }

      if (l.phase === "cooldown") {
        // Wait for the captured card to leave the outline before looking for the next one.
        // The outline has to stay empty for a moment, so a card that only wobbles is not captured twice.
        if (!allIn) {
          if (!clearSince) clearSince = now;
          if (now - clearSince > CLEAR_MS) {
            l.phase = "searching";
            clearSince = 0;
            setDetect("searching");
          }
        } else {
          clearSince = 0;
        }
        return;
      }

      if (allIn && still && !dark) {
        misses = 0;
        if (l.phase !== "locking") {
          l.phase = "locking";
          lockStart = now;
          setDetect("locking");
        } else if (now - lockStart >= HOLD_MS) {
          l.takeShot();
        }
      } else if (l.phase === "locking" && ++misses > 2) {
        l.phase = "searching";
        setDetect("searching");
      }
    }, SAMPLE_MS);

    return () => clearInterval(timer);
  }, [camera]);

  // Fly the captured card from the camera outline to its place in the spread map.
  useLayoutEffect(() => {
    const el = flyerEl.current;
    if (!el || !flyer) return;
    const { from, to } = flyer;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const anim = el.animate(
      [
        {
          transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`,
        },
        { transform: "none" },
      ],
      { duration: still ? 1 : 650, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
    anim.onfinish = () => {
      live.current.flyer = null;
      setFlyerState(null);
      maybeFinish();
    };
    return () => anim.cancel();
    // maybeFinish only reads refs, so it does not need to be a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyer]);

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

  async function identify(cap: Capture | null = capture) {
    const capture = cap;
    if (!capture) return;
    setError("");
    if (capture.picks) {
      // Webcam cards were already recognized one by one.
      setPicks(capture.picks);
      setStage("confirm");
      return;
    }
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
      const found: (Pick | null)[] = data.cards;
      const seen = found.filter(Boolean).length;
      setPicks(spread.positions.map((_, i) => found[i] ?? { card: "", reversed: false }));
      setNotes(
        seen === 0
          ? "No tarot cards were found. Retake the photo in brighter light, or choose the cards by hand."
          : seen < total
            ? `Only ${seen} of ${total} cards were found. Retake the photo in brighter light with every card in frame, or choose the missing cards by hand.`
            : data.notes,
      );
      setStage("confirm");
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "The photo could not be read. Try again.");
      setStage("ask");
    }
  }

  async function interpret() {
    setError("");
    setReading("");
    setCopied(false);
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

  async function copyReading() {
    const cards = picks.map((p, i) => `${spread.positions[i].name}: ${cardLabel(p)}`).join("\n");
    try {
      await navigator.clipboard.writeText(`${question}\n\n${cards}\n\n${reading}\n\nstarcoded.wtf`);
      setCopied(true);
    } catch {
      setError("The reading could not be copied. Select the text and copy it by hand.");
    }
  }

  function retake() {
    setStage("ask");
    setCapture(null);
    setPicks([]);
    setNotes("");
    openCamera();
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

  const photos =
    capture &&
    (capture.mode === "cards" ? (
      <div className="thumbs">
        {(capture.thumbs ?? capture.photos.map((p) => p.dataUrl)).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt={`card ${i + 1}, ${spread.positions[i]?.name}`} />
        ))}
      </div>
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={capture.photos[0].dataUrl} alt="your tarot spread" />
    ));

  // Webcam session status
  const done = shots.length;
  const finishing = camera === "cards" && done >= total;
  const position = spread.positions[Math.min(done, total - 1)];
  const holding = detect === "locking";
  const baseHint =
    camera !== "cards" ? (
      total === 1 ? "fit your card inside the outline." : "place each card inside its numbered outline."
    ) : (
      <>
        <strong>
          card {done + 1} of {total}: {position.name}.
        </strong>{" "}
        hold it inside the outline, the same way up as it sits on the table.
      </>
    );
  const cameraHint = cameraNote ? (
    cameraNote
  ) : finishing ? (
    <span className="dots">reading your cards</span>
  ) : holding ? (
    <strong>hold still. capturing.</strong>
  ) : camera === "cards" && detect === "done" && done > 0 ? (
    <>
      <strong>got it.</strong> take that card away, then hold up card {done + 1}: {position.name}.
    </>
  ) : tip ? (
    <strong>{tip}</strong>
  ) : (
    baseHint
  );
  const traceable = !spread.slots.some((s) => s.sideways);

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
            className="ask stage"
            onSubmit={(e) => {
              e.preventDefault();
              if (canRead && stage === "ask") identify(capture);
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
                    onChange={() => chooseSpread(s.id)}
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
                        ? "with a webcam, you hold the card up and it is captured when it is steady. with your phone, you photograph it on the table."
                        : "with a webcam, you hold each card up in order and it is captured when it is steady. with your phone, you photograph the whole spread at once."
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
              {stage === "identifying" ? <span className="dots">looking at your cards</span> : "read my cards"}
            </button>
          </form>
        )}

        {stage === "confirm" && (
          <section className="confirm stage">
            <h1 className="display">check the cards before i read them.</h1>
            {notes && <p className="note">{notes}</p>}
            {capture && <figure className="photo small">{photos}</figure>}
            <ol className="picks">
              {spread.positions.map((pos, i) => (
                <li key={pos.name} style={{ "--i": i } as React.CSSProperties}>
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
            {capture && (
              <button className="link below" onClick={retake}>
                {capture.mode === "cards" ? "retake the cards" : "retake the photo"}
              </button>
            )}
          </section>
        )}

        {stage === "reading" && (
          <article className="reading stage">
            <h1 className="display asked">{question}</h1>
            {capture?.thumbs && (
              <div className="reading-map">
                <SpreadMap slots={spread.slots} thumbs={capture.thumbs} reveal />
              </div>
            )}
            <ol className="drawn">
              {picks.map((p, i) => (
                <li key={i} style={{ "--i": i } as React.CSSProperties}>
                  <span className="quiet">{spread.positions[i].name}</span>
                  <span>
                    {getCard(p.card)?.name}
                    {p.reversed && <em> reversed</em>}
                  </span>
                </li>
              ))}
            </ol>
            <div className="prose" aria-live="polite" aria-busy={streaming}>
              {reading ? (
                reading.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
              ) : (
                <p className="quiet dots">reading your cards</p>
              )}
            </div>
            {!streaming && reading && (
              <div className="after">
                <p className="quiet fine">
                  a reading is a mirror for reflection. it does not replace medical, legal, or financial advice.
                </p>
                {error && (
                  <p className="error" role="alert">
                    {error}
                  </p>
                )}
                <div className="after-actions">
                  <button className="ghost" onClick={copyReading}>
                    {copied ? "copied" : "copy this reading"}
                  </button>
                  <button className="primary" onClick={reset}>
                    ask another question
                  </button>
                </div>
              </div>
            )}
          </article>
        )}
      </main>

      {camera && (
        <div className="camera" role="dialog" aria-modal="true" aria-label="camera">
          <div className={camera === "cards" ? "camera-body has-side" : "camera-body"}>
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
                  !finishing && <Guide slots={ONE_SLOT} firstNumber={done + 1} state={detect} />
                ) : (
                  <Guide slots={spread.slots} state={traceable && auto ? detect : undefined} filled={filled} />
                )}
                {flash > 0 && <div key={flash} className="flash" />}
                <div className="camera-tools">
                  {torch !== "none" && (
                    <button type="button" className="tool" aria-pressed={torch === "on"} onClick={toggleTorch}>
                      {torch === "on" ? "flash on" : "flash off"}
                    </button>
                  )}
                  {camera === "spread" && traceable && (
                    <button type="button" className="tool" aria-pressed={auto} onClick={() => setAuto(!auto)}>
                      {auto ? "auto capture on" : "auto capture off"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {camera === "cards" && (
              <aside className="camera-side">
                <SpreadMap
                  slots={spread.slots}
                  thumbs={shots.map((s) => s.thumb)}
                  current={finishing ? undefined : done}
                  hidden={flyer?.index}
                />
                <ol className="camera-list" aria-live="polite">
                  {spread.positions.map((pos, i) => {
                    const shot = shots[i];
                    return (
                      <li key={pos.name} className={i === done ? "is-current" : undefined}>
                        <span className="quiet">
                          {i + 1}. {pos.name}
                        </span>
                        {shot &&
                          (shot.status === "pending" ? (
                            <span className="quiet dots">recognizing</span>
                          ) : shot.status === "done" ? (
                            <span className="found">{cardLabel(shot.pick)}</span>
                          ) : (
                            <span className="quiet">could not read it</span>
                          ))}
                      </li>
                    );
                  })}
                </ol>
                <label className="auto">
                  <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
                  capture automatically
                </label>
              </aside>
            )}
          </div>

          <p className="camera-hint" aria-live="polite">
            {cameraHint}
            {torch === "on" && !holding && (
              <span className="quiet"> if you see glare on the cards, tilt the phone or turn the flash off.</span>
            )}
          </p>
          <div className="camera-actions">
            {camera === "cards" && done > 0 && !finishing ? (
              <button className="ghost" onClick={redoLast}>
                redo card {done}
              </button>
            ) : (
              <button className="ghost" onClick={closeCamera}>
                cancel
              </button>
            )}
            <button className="primary" onClick={takeShot} disabled={finishing}>
              {camera === "cards" ? (finishing ? "all cards captured" : `capture card ${done + 1} now`) : "take photo"}
            </button>
          </div>

          {flyer && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={flyerEl}
              className="flyer"
              src={flyer.src}
              alt=""
              style={{ left: flyer.to.left, top: flyer.to.top, width: flyer.to.width, height: flyer.to.height }}
            />
          )}
        </div>
      )}
    </div>
  );
}
