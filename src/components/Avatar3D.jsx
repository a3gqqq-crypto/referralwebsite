import { useEffect, useRef, useState } from "react";

import { fullBodyOptions } from "../data/avatarParts";

import "../styles/avatar3d.css";

let webglOk = null;

// Checked once: can this device draw 3D?
function canDraw3d() {
  if (webglOk !== null) return webglOk;
  try {
    const canvas = document.createElement("canvas");
    webglOk = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    webglOk = false;
  }
  return webglOk;
}

// Spinnable 3D version of a full-body avatar. `options` are the stored avatar
// choices (as in profiles.body_avatar). The 3D code downloads on first use;
// `fallback` (a 2D picture) shows while loading and on devices without 3D.
function Avatar3D({
  options,
  talking = false,
  framing = "full",
  lite = false,
  interactive = true,
  fallback = null,
  className = "",
}) {
  const boxRef = useRef(null);
  const viewerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(() => !canDraw3d());
  const key = JSON.stringify(options || {});

  useEffect(() => {
    if (failed) return;
    let cancelled = false;

    import("../lib/avatar3d.js")
      .then(({ createViewer }) => {
        if (cancelled || !boxRef.current) return;
        viewerRef.current = createViewer(boxRef.current, {
          lite,
          interactive,
          onLost: () => setFailed(true),
        });
        setReady(true);
      })
      .catch((error) => {
        console.error(error);
        setFailed(true);
      });

    return () => {
      cancelled = true;
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
    // The viewer is created once; later prop changes go through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed]);

  useEffect(() => {
    if (!ready) return;
    viewerRef.current?.update(fullBodyOptions(JSON.parse(key)).options);
  }, [ready, key]);

  useEffect(() => {
    viewerRef.current?.setTalking(talking);
  }, [ready, talking]);

  useEffect(() => {
    viewerRef.current?.setFraming(framing);
  }, [ready, framing]);

  if (failed) {
    return fallback ? (
      <img className={`avatar-3d-fallback ${className}`} src={fallback} alt="" draggable="false" />
    ) : null;
  }

  return (
    <div ref={boxRef} className={`avatar-3d ${ready ? "is-ready" : ""} ${className}`}>
      {!ready && fallback && <img className="avatar-3d-placeholder" src={fallback} alt="" draggable="false" />}
    </div>
  );
}

export default Avatar3D;
