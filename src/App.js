import React, { useState, useEffect, useRef, useCallback } from "react";
import { DeepFilterNet3Processor } from "deepfilternet3-noise-filter";

export default function App() {
  const [status, setStatus] = useState("idle");
  const [level, setLevel] = useState(60);
  const [running, setRunning] = useState(false);
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(true);

  const audioRef = useRef(null);
  const ctxRef = useRef(null);
  const procRef = useRef(null);
  const streamRef = useRef(null);
  const nodeRef = useRef(null);

  const cleanup = useCallback(async () => {
    if (nodeRef.current) {
      try {
        nodeRef.current.disconnect();
      } catch (e) {
        console.error("Node disconnect error:", e);
      }
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {
        console.error("Stream stop error:", e);
      }
    }

    if (ctxRef.current && ctxRef.current.state !== "closed") {
      try {
        await ctxRef.current.close();
      } catch (e) {
        console.error("Context close error:", e);
      }
    }

    if (procRef.current) {
      try {
        procRef.current.destroy();
      } catch (e) {
        console.error("Processor destroy error:", e);
      }
    }

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    ctxRef.current = null;
    procRef.current = null;
    streamRef.current = null;
    nodeRef.current = null;

    setRunning(false);
    setStatus("idle");
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const start = useCallback(async () => {
    if (running) return;

    if (ctxRef.current && ctxRef.current.state === "suspended") {
      try {
        setStatus("resuming audio...");
        await ctxRef.current.resume();

        if (audioRef.current) {
          try {
            await audioRef.current.play();
          } catch (playError) {
            console.error("Audio play error:", playError);
            throw new Error("Failed to play audio. User interaction may be required.");
          }
        }

        setRunning(true);
        setStatus("running");
        return;
      } catch (error) {
        console.error("Error resuming audio:", error);
        setStatus(`error: ${error?.message || String(error)}`);
        return;
      }
    }

    try {
      setStatus("requesting microphone...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: { ideal: 48000 }
        }
      });
      
      streamRef.current = stream;

      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      const actualSampleRate = settings.sampleRate || 48000;

      setStatus("initializing audio context...");
      
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ 
        sampleRate: actualSampleRate 
      });
      ctxRef.current = ctx;

      setStatus("loading processor...");
      
      const proc = new DeepFilterNet3Processor({
        sampleRate: ctx.sampleRate,
        noiseReductionLevel: 10,
        assetConfig: {
          cdnUrl: "https://cdn.laptrinhai.id.vn/deepfilternet3"
        }
      });

      await proc.initialize();
      procRef.current = proc;

      setStatus("creating audio pipeline...");
      
      const node = await proc.createAudioWorkletNode(ctx);
      nodeRef.current = node;

      node.port.onmessage = (event) => {
        if (event.data.type === "LOG") {
          console.log("[AudioWorklet]", event.data.message);
        }
      };

      const src = ctx.createMediaStreamSource(stream);
      const dst = ctx.createMediaStreamDestination();

      src.connect(node).connect(dst);

      proc.setSuppressionLevel(level);
      proc.setNoiseSuppressionEnabled(noiseSuppressionEnabled);

      if (audioRef.current) {
        audioRef.current.srcObject = dst.stream;
        audioRef.current.muted = false;
        
        try {
          await audioRef.current.play();
        } catch (playError) {
          console.error("Audio play error:", playError);
          throw new Error("Failed to play audio. User interaction may be required.");
        }
      }

      setRunning(true);
      setStatus("running");
    } catch (error) {
      console.error("Error starting audio:", error);
      setStatus(`error: ${error?.message || String(error)}`);
      await cleanup();
    }
  }, [running, level, noiseSuppressionEnabled, cleanup]);

  const stop = useCallback(async () => {
    if (!running) return;

    try {
      setStatus("suspending audio...");

      if (audioRef.current) {
        audioRef.current.pause();
      }

      if (ctxRef.current && ctxRef.current.state === "running") {
        await ctxRef.current.suspend();
      }

      setRunning(false);
      setStatus("suspended");
    } catch (error) {
      console.error("Error suspending audio:", error);
      setStatus(`error: ${error?.message || String(error)}`);
    }
  }, [running]);

  useEffect(() => {
    if (procRef.current && running) {
      try {
        procRef.current.setSuppressionLevel(level);
      } catch (error) {
        console.error("Error setting suppression level:", error);
      }
    }
  }, [level, running]);

  useEffect(() => {
    if (procRef.current && running) {
      try {
        procRef.current.setNoiseSuppressionEnabled(noiseSuppressionEnabled);
      } catch (error) {
        console.error("Error setting noise suppression:", error);
      }
    }
  }, [noiseSuppressionEnabled, running]);

  return (
    <div style={{ 
      fontFamily: "system-ui, -apple-system, sans-serif", 
      padding: "24px",
      maxWidth: "600px",
      margin: "0 auto"
    }}>
      <h1 style={{ marginBottom: "8px" }}>DeepFilterNet3 Noise Suppression</h1>
      
      <div style={{ 
        padding: "12px", 
        backgroundColor: running ? "#e8f5e9" : "#fff3e0",
        borderRadius: "4px",
        marginBottom: "16px",
        border: `1px solid ${running ? "#4caf50" : "#ff9800"}`
      }}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ 
          display: "flex", 
          alignItems: "center",
          cursor: "pointer",
          fontSize: "16px"
        }}>
          <input
            type="checkbox"
            checked={noiseSuppressionEnabled}
            onChange={(e) => setNoiseSuppressionEnabled(e.target.checked)}
            style={{ 
              marginRight: "8px",
              width: "18px",
              height: "18px",
              cursor: "pointer"
            }}
          />
          Enable Noise Suppression
        </label>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontSize: "16px" }}>
          Suppression Level: {level}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          disabled={!noiseSuppressionEnabled}
          style={{ 
            width: "100%",
            cursor: noiseSuppressionEnabled ? "pointer" : "not-allowed"
          }}
        />
      </div>

      <div style={{ marginBottom: "20px", display: "flex", gap: "8px" }}>
        <button 
          onClick={start} 
          disabled={running}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: running ? "#ccc" : "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: running ? "not-allowed" : "pointer",
            fontWeight: "500"
          }}
        >
          Start
        </button>
        <button 
          onClick={stop} 
          disabled={!running}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: !running ? "#ccc" : "#f44336",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: !running ? "not-allowed" : "pointer",
            fontWeight: "500"
          }}
        >
          Stop
        </button>
      </div>

      <audio 
        ref={audioRef} 
        controls 
        playsInline 
        style={{ 
          display: "block", 
          width: "100%",
          marginTop: "20px"
        }} 
      />
    </div>
  );
}