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
      status: "active",
      isLocked: false,
      startTime: new Date().toISOString(),
      duration: 3600,
      problems: [],
    },
    round2: {
      id: "round2",
      name: "Round 2",
      status: "upcoming",
      isLocked: true,
      startTime: null,
      duration: 5400,
      problems: [],
    },
  });
  const [participants] = useState([]);
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

  // ===============================
  // 🔥 LOAD ROUND INFO + PROBLEMS
  // ===============================
  useEffect(() => {
    async function bootstrap() {
      const rounds = ["round1"]; // only round1 per user request
      const next = {};

      for (const id of rounds) {
        try {
          const { data } = await api.getRoundWindow(id);
          const base = {
            ...(data || {}),
            id,
            name: id === "round1" ? "Round 1" : "Round 2",
          };
          if (!base.status || base.status === "scheduled") {
            base.status = "active";
            base.startTime = new Date().toISOString();
            base.isLocked = false;
            base.duration = base.duration || 3600;
          }
          next[id] = base;
        } catch (_) {
          next[id] = {
            id,
            name: id === "round1" ? "Round 1" : "Round 2",
            status: "active",
            isLocked: false,
            startTime: new Date().toISOString(),
            duration: 3600,
          };
        }
      }

      try {
        const { data } = await api.getProblems();
        const list = data?.problems || data || [];

        next.round1 = { ...(next.round1 || {}), problems: list };
      } catch (err) {
        console.warn("Problem load failed:", err);
      }

      // Ensure round2 exists to avoid UI errors on Dashboard
      if (!next.round2) {
        next.round2 = {
          id: "round2",
          name: "Round 2",
          status: "upcoming",
          isLocked: true,
          startTime: null,
          duration: 5400,
          problems: [],
        };
      }

      setRoundInfo(next);
    }

    bootstrap();
  }, []);

  return (
    <ContestContext.Provider
      value={{
        roundInfo,
        participants,
        submissions,
        getRoundInfo,
        updateRoundStatus,
        startRound,
        lockRound,
        unlockRound,
        runCode,
        submitCode,
      }}
    >
      {children}
    </ContestContext.Provider>
  );
};
