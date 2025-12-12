// src/pages/CodingPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContest } from '../contexts/ContestContext';
import CodeEditor from '../components/CodeEditor';
import TestcaseResults from '../components/TestcaseResults';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from '../hooks/use-toast';
import { Code2, Play, Send, AlertCircle, Clock } from 'lucide-react';
import { languageOptions } from '../mock';
import { api } from '../utils/api';

// Use axios API client base URL from src/utils/api.js

const CodingPage = () => {
  const { roundId } = useParams();
  const { user } = useAuth();
  const { getRoundInfo, runCode, submitCode } = useContest();
  const navigate = useNavigate();

  const roundData = getRoundInfo(roundId);

  const [problems, setProblems] = useState(roundData?.problems || []);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [selectedProblemId, setSelectedProblemId] = useState(
    (roundData?.problems?.[0]?._id) || (roundData?.problems?.[0]?.id) || null
  );

  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(languageOptions[0].template);
  const [customInput, setCustomInput] = useState('');
  const [runOutput, setRunOutput] = useState('');
  const [testcaseResults, setTestcaseResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState([]);
  const [previewHiddenCount, setPreviewHiddenCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState('');
  

  const problemsRef = useRef(problems);
  const saveTimerRef = useRef(null);

  // Fetch problems from backend
  useEffect(() => {
    let mounted = true;
    const fetchProblems = async () => {
      setLoadingProblems(true);
      try {
        const { data } = await api.getProblems();
        const list = data?.problems || data || [];
        if (mounted) {
          setProblems(list);
          problemsRef.current = list;
          if (!selectedProblemId && list.length > 0) {
            setSelectedProblemId(list[0]._id || list[0].id);
          }
        }
      } catch (_) {
        // Silently fail to avoid noisy console errors when backend is offline
      } finally {
        if (mounted) setLoadingProblems(false);
      }
    };
    fetchProblems();
    return () => { mounted = false; };
  }, [roundId]);

  

  useEffect(() => {
    const template = languageOptions.find(l => l.value === language)?.template;
    if (!code || languageOptions.some(l => l.template === code)) {
      setCode(template || '');
    }
  }, [language]);

  const storageKey = (pid, lang) => `code:${roundId}:${pid}:${lang}`;

  useEffect(() => {
    if (!selectedProblemId) return;
    const key = storageKey(selectedProblemId, language);
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      setCode(saved);
      setSaveStatus('Saved');
    } else {
      const template = languageOptions.find(l => l.value === language)?.template || '';
      setCode(template);
      setSaveStatus('');
    }
  }, [selectedProblemId]);

  useEffect(() => {
    if (!selectedProblemId) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setSaveStatus('Saving…');
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey(selectedProblemId, language), code || '');
      } catch (_) {}
      setSaveStatus('Saved');
    }, 500);
  }, [code, selectedProblemId, language]);

  const handleResetTemplate = () => {
    const t = languageOptions.find(l => l.value === language)?.template || '';
    try { localStorage.removeItem(storageKey(selectedProblemId, language)); } catch (_) {}
    setCode(t);
    setSaveStatus('');
  };

  

  const handleRun = async () => {
    setIsRunning(true);
    setRunOutput('Running...');
    try {
      // 1) Run with custom input for immediate feedback
      const res = await runCode(code, language, customInput);
      setRunOutput((res && res.success) ? (res.output || "No Output") : (res?.output || "Execution Failed"));

      // 2) Evaluate against up to 6 testcases on the right
      const tcs = Array.isArray(currentProblem?.testcases) ? currentProblem.testcases.slice(0, 6) : [];
      const results = [];
      for (let i = 0; i < tcs.length; i++) {
        const tc = tcs[i];
        const stdin = tc.input || '';
        const expected = (tc.output || '').replace(/\r/g, '').trim();
        const runRes = await runCode(code, language, stdin);
        const actual = ((runRes && runRes.output) || '').replace(/\r/g, '').trim();
        const actualNorm = actual.replace(/\s+/g, ' ').trim();
        const expectedNorm = expected.replace(/\s+/g, ' ').trim();
        const passed = (runRes && runRes.success) && actualNorm === expectedNorm;
        results.push({
          testcase: `Test Case ${i + 1}`,
          input: stdin,
          expectedOutput: expected,
          actualOutput: actual,
          passed,
          hidden: tc.hidden === true,
        });
      }
      setTestcaseResults(results);

    } catch (err) {
      console.error(err);
      setRunOutput("Error: " + err.message);
    }
    setIsRunning(false);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({ title: "Not logged in", variant: "destructive" });
      return;
    }

    const currentProblem = problems.find(
      p => (p._id || p.id) === selectedProblemId
    ) || problems[0];

    if (!currentProblem) {
      toast({ title: "Select a problem", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitCode(
        user.id,
        currentProblem._id || currentProblem.id,
        code,
        language,
        roundId
      );

      if (!result?.success) {
        throw new Error(result?.message || "Submission failed");
      }

      let submissionResults = result?.submission?.results || result?.submission?.testcaseResults;

      if (!submissionResults) {
        try {
          const { data: subs } = await api.getUserSubmissions(user.id);
          const latest = Array.isArray(subs) ? subs[0] : subs;
          submissionResults = latest?.results || latest?.testcaseResults || [];
        } catch (fetchErr) {
          console.error("Failed to load submissions:", fetchErr);
        }
      }

      setTestcaseResults(submissionResults || []);

      const passed = (submissionResults || []).filter(r => r.passed).length;
      toast({
        title: "Submission Completed",
        description: `Passed ${passed}/${(submissionResults || []).length}`
      });

    } catch (err) {
      toast({ title: "Submit error", description: err.message, variant: "destructive" });
    }

    setIsSubmitting(false);
  };

  const currentProblem = (problems && problems.length)
    ? problems.find(p => (p._id || p.id) === selectedProblemId) || problems[0]
    : null;

  useEffect(() => {
    if (!currentProblem) {
      setPreviewOpen([]);
      setPreviewHiddenCount(0);
      setTestcaseResults([]);
      return;
    }
    const tcs = Array.isArray(currentProblem.testcases) ? currentProblem.testcases.slice(0, 6) : [];
    // Treat first 2 as open (visible), rest as hidden by default if not specified
    const open = tcs
      .filter((tc, i) => tc.hidden !== true && i < 2)
      .map(tc => ({ input: tc.input || '', output: tc.output || '' }));
    const hidden = tcs.length - open.length;
    setPreviewOpen(open);
    setPreviewHiddenCount(hidden > 0 ? hidden : 0);
  }, [currentProblem]);

  useEffect(() => {
    // clear results when switching problem id explicitly
    setTestcaseResults([]);
    setRunOutput('');
    setCustomInput('');
  }, [selectedProblemId]);

  const secondsLeft = roundData?.remaining || 0;

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const lockedOrNotStarted = !roundData || roundData.status !== 'active' || roundData.isLocked || secondsLeft <= 0;

  useEffect(() => {
    const roundId = roundData?.id || 'round1';
    if (!roundData) return;
    if (secondsLeft <= 0 && (roundData.status === 'active' || !roundData.isLocked)) {
      (async () => {
        try { await api.timerEnd(roundId); } catch (_) {}
        toast({ title: "Time's up", description: "Round ended. Redirecting..." });
        navigate('/dashboard');
      })();
    }
  }, [secondsLeft, roundData, navigate]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">

      {/* HEADER */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <Code2 className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="font-bold text-lg">{roundData?.name || "Round"}</h1>
            <p className="text-xs text-gray-600">{user?.name || "Guest"}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center px-3 py-1 bg-blue-50 rounded-md border">
            <Clock className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm font-medium text-blue-700">{mm}:{ss}</span>
          </div>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-2" /> {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Exit</Button>
        </div>
      </div>

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT SIDE — Problem List & Description */}
        <div className="w-1/4 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm text-gray-600 mb-2">Problems</h2>
            <div className="space-y-2">
              {lockedOrNotStarted ? (
                <div className="text-sm text-gray-500">Waiting for round to start...</div>
              ) : loadingProblems ? (
                <div className="text-sm text-gray-500">Loading problems…</div>
              ) : problems.map((p, i) => (
                <button key={p._id || p.id || i}
                  onClick={() => setSelectedProblemId(p._id || p.id)}
                  className={`w-full text-left p-2 rounded-lg transition-colors ${
                    (currentProblem && (currentProblem._id || currentProblem.id) === (p._id || p.id))
                    ? "bg-blue-100 border border-blue-300"
                    : "bg-gray-50 hover:bg-gray-100"
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{i + 1}. {p.title}</span>
                    <Badge>{p.difficulty || "easy"}</Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            {lockedOrNotStarted ? (
              <div className="text-sm text-gray-500">Round content is locked until the admin starts the round.</div>
            ) : currentProblem ? (
              <>
                <h3 className="text-lg font-bold mb-2">{currentProblem.title}</h3>
                <Badge className="mb-4">{currentProblem.difficulty || "easy"}</Badge>
                <div className="whitespace-pre-wrap text-sm text-gray-700">
                  {currentProblem.description}
                </div>
              </>
            ) : (
              <div>No problem selected</div>
            )}
          </ScrollArea>
        </div>

        {/* CENTER — Code Editor */}
        <div className="flex-1 flex flex-col bg-gray-900">
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-white">Code Editor</span>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-40 bg-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-300">{saveStatus}</span>
              <Button variant="outline" size="sm" onClick={handleResetTemplate}>Reset to template</Button>
            </div>
          </div>

          <div className="flex-1">
            {lockedOrNotStarted ? (
              <div className="h-full flex items-center justify-center text-gray-300">Round not started</div>
          ) : (
              <CodeEditor key={selectedProblemId || 'editor'} value={code} onChange={setCode} language={language} />
          )}
        </div>

          <div className="bg-gray-800 border-t p-3">
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400">Custom Input</label>
                <Textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  className="bg-gray-700 text-white"
                />
              </div>

              <div className="flex-1">
                <label className="text-xs text-gray-400">Output</label>
                <div className="bg-gray-700 text-white rounded-md p-2 h-20 overflow-auto">
                  {runOutput || "Click Run to see output"}
                </div>
              </div>

              <Button onClick={handleRun} disabled={isRunning || lockedOrNotStarted} variant="secondary" className="mt-5">
                <Play className="h-4 w-4 mr-2" /> {isRunning ? "Running…" : "Run"}
              </Button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — Testcase Results */}
        <div className="w-1/4 border-l bg-white flex flex-col">
          <Tabs defaultValue="testcases" className="flex-1 flex flex-col">
            <TabsList className="border-b">
              <TabsTrigger value="testcases" className="flex-1">Testcase Results</TabsTrigger>
            </TabsList>
            <TabsContent value="testcases" className="flex-1 p-4">
              {lockedOrNotStarted ? (
                <div className="text-sm text-gray-500 text-center py-8">Round not started</div>
              ) : (
                <TestcaseResults key={selectedProblemId || 'tcs'} results={testcaseResults} previewOpen={previewOpen} previewHiddenCount={previewHiddenCount} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      
    </div>
  );
};

export default CodingPage;
