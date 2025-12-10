// src/contexts/ContestContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../utils/api";

const ContestContext = createContext();
export const useContest = () => useContext(ContestContext);

export const ContestProvider = ({ children }) => {
  const [roundInfo, setRoundInfo] = useState({
    round1: {
      id: "round1",
      name: "Round 1",
      status: "upcoming",
      isLocked: true,
      startTime: null,
      duration: 0,
      elapsed: 0,
      scheduledStart: null,
      remaining: 0,
      problems: [],
    },
    round2: {
      id: "round2",
      name: "Round 2",
      status: "upcoming",
      isLocked: true,
      problems: [],
    },
  });
  const [participants, setParticipants] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const getRoundInfo = (roundId) => roundInfo[roundId];

  const updateRoundStatus = (roundId, status) => {
    setRoundInfo((prev) => ({
      ...prev,
      [roundId]: { ...prev[roundId], status },
    }));
  };

  const startRound = (roundId) => {
    setRoundInfo((prev) => ({
      ...prev,
      [roundId]: {
        ...prev[roundId],
        status: "active",
        startTime: new Date().toISOString(),
        isLocked: false,
      },
    }));
  };

  const lockRound = (roundId) =>
    setRoundInfo((prev) => ({
      ...prev,
      [roundId]: { ...prev[roundId], isLocked: true },
    }));

  const unlockRound = (roundId) =>
    setRoundInfo((prev) => ({
      ...prev,
      [roundId]: { ...prev[roundId], isLocked: false },
    }));

  // ===============================
  // 🔥 RUN CODE FIXED
  // ===============================
  const runCode = async (code, language, customInput) => {
    try {
      const payload = { code, language, customInput };
      const { data } = await api.runCode(payload);

      if (!data?.success) {
        return {
          success: false,
          output: data?.error || "Run failed",
        };
      }

      const run = data.run || {};

      return {
        success: true,
        output: run.stdout || run.output || "",
        executionTime: run.cpu_time || 0,
      };
    } catch (err) {
      console.error("runCode error:", err);
      return {
        success: false,
        output: "Run error: " + (err.message || err),
      };
    }
  };

  // ===============================
  // 🔥 SUBMIT CODE FIXED
  // ===============================
  const submitCode = async (userId, problemId, code, language, roundId) => {
    try {
      const payload = { userId, problemId, code, language, round: roundId };
      const { data } = await api.submitCode(payload);

      if (!data?.success) {
        return {
          success: false,
          message: data?.message || "Submission failed",
        };
      }

      // refresh submissions
      const { data: subs } = await api.getUserSubmissions(userId);
      setSubmissions(subs || []);

      return { success: true, submission: data?.result };
    } catch (err) {
      console.error("submitCode error:", err);
      return {
        success: false,
        message: err.message || "Submission error",
      };
    }
  };

  // Round window polling and admin controls
  const refreshRoundWindow = async (roundId = 'round1') => {
    try {
      const { data } = await api.getRoundWindow(roundId);
      const duration = typeof data?.duration === 'number' ? data.duration : parseInt(data?.duration || 0, 10);
      const elapsed = typeof data?.elapsed === 'number' ? data.elapsed : parseInt(data?.elapsed || 0, 10);
      const startIso = data?.startTime;
      let remaining = 0;
      if (duration) {
        if (data?.status === 'active' && startIso) {
          const sinceStart = Math.floor((Date.now() - Date.parse(startIso)) / 1000);
          remaining = Math.max(0, duration - elapsed - sinceStart);
        } else {
          remaining = Math.max(0, duration - elapsed);
        }
      }
      setRoundInfo((prev) => ({
        ...prev,
        [roundId]: {
          ...(prev[roundId] || {}),
          status: data?.status || prev[roundId]?.status,
          isLocked: data?.isLocked ?? prev[roundId]?.isLocked,
          startTime: data?.startTime ?? prev[roundId]?.startTime,
          duration: duration || prev[roundId]?.duration || 0,
          elapsed: elapsed || prev[roundId]?.elapsed || 0,
          scheduledStart: data?.scheduledStart ?? prev[roundId]?.scheduledStart,
          remaining,
        },
      }));
    } catch (_) {}
  };

  useEffect(() => {
    let alive = true;
    const interval = setInterval(() => {
      if (!alive) return;
      refreshRoundWindow('round1');
    }, 1000);
    refreshRoundWindow('round1');
    return () => { alive = false; clearInterval(interval); };
  }, []);

  const loadParticipants = async () => {
    try {
      const { data } = await api.getParticipants();
      setParticipants(Array.isArray(data) ? data : []);
    } catch (_) {
      setParticipants([]);
    }
  };

  const toggleEligibility = async (participantId) => {
    try {
      const { data } = await api.toggleEligibility(participantId);
      setParticipants((prev) => prev.map((p) => p.id === participantId ? { ...p, round2Eligible: data?.round2Eligible } : p));
    } catch (_) {}
  };

  // ===============================
  // 🔥 LOAD ROUND INFO + PROBLEMS
  // ===============================
  useEffect(() => {
    async function bootstrap() {
      const next = { ...roundInfo };
      try {
        const { data } = await api.getProblems();
        const list = data?.problems || data || [];
        next.round1 = { ...(next.round1 || {}), problems: list };
      } catch (err) {
        console.warn("Problem load failed:", err);
      }
      setRoundInfo(next);
      await loadParticipants();
    }
    bootstrap();
  }, []);

  return (
    <ContestContext.Provider
      value={{
        roundInfo,
        participants,
        submissions,
        toggleEligibility,
        getRoundInfo,
      updateRoundStatus,
      startRound,
      lockRound,
      unlockRound,
      refreshRoundWindow,
      runCode,
      submitCode,
      }}
    >
      {children}
    </ContestContext.Provider>
  );
};
