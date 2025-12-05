// src/pages/CodingPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContest } from '../contexts/ContestContext';
import CodeEditor from '../components/CodeEditor';
import TestcaseResults from '../components/TestcaseResults';
import Timer from '../components/Timer';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from '../hooks/use-toast';
import { Code2, Play, Send, AlertCircle } from 'lucide-react';
import { languageOptions } from '../mock';
import { api } from '../utils/api';
import { Alert, AlertDescription } from '../components/ui/alert';

const BACKEND =
  process.env.REACT_APP_BACKEND_URL ||
  process.env.REACT_APP_API_URL ||
  "http://127.0.0.1:8000";

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
  const [expired, setExpired] = useState(false);

  const problemsRef = useRef(problems);

  // Fetch problems from backend
  useEffect(() => {
    let mounted = true;
    const fetchProblems = async () => {
      setLoadingProblems(true);
      try {
        const url = `${BACKEND}/problems`;
        const res = await fetch(url);

        if (!res.ok) return;

        const data = await res.json();
        const list = data?.problems || data || [];

        if (mounted) {
          setProblems(list);
          problemsRef.current = list;
          if (!selectedProblemId && list.length > 0) {
            setSelectedProblemId(list[0]._id || list[0].id);
          }
        }
      } catch (err) {
        console.error("Error loading problems:", err);
      } finally {
        if (mounted) setLoadingProblems(false);
      }
    };
    fetchProblems();
    return () => { mounted = false; };
  }, [roundId]);

  useEffect(() => {
    if (!roundData || (roundData.status !== "active" && roundData.status !== "completed")) {
      navigate("/dashboard");
    }
  }, [roundData, navigate]);

  useEffect(() => {
    const template = languageOptions.find(l => l.value === language)?.template;
    if (!code || languageOptions.some(l => l.template === code)) {
      setCode(template || '');
    }
  }, [language]);

  useEffect(() => {
    const tick = () => {
      try {
        const end = roundData?.endTime ? new Date(roundData.endTime).getTime() : null;
        if (!end) { setExpired(false); return; }
        setExpired(Date.now() > end);
      } catch (_) { setExpired(false); }
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [roundData?.endTime]);

  const handleRun = async () => {
    setIsRunning(true);
    setRunOutput('Running...');
    try {
      const currentProblem = problems.find(p => (p._id || p.id) === selectedProblemId) || problems[0];
      if (!currentProblem) {
        toast({ title: "Select a problem", variant: "destructive" });
        setIsRunning(false);
        return;
      }
      const payload = {
        userId: user?.id,
        problemId: currentProblem._id || currentProblem.id,
        code,
        language,
        round: roundId,
      };
      const { data } = await api.testCode(payload);
      if (!data?.success) {
        setRunOutput("Execution Failed");
        setTestcaseResults([]);
      } else {
        setTestcaseResults(data.results || []);
        const passed = data.passed || 0;
        const total = data.total || (data.results || []).length;
        setRunOutput(`Passed ${passed}/${total}`);
        toast({ title: "Run completed", description: `Passed ${passed}/${total}` });
      }
    } catch (err) {
      console.error(err);
      setRunOutput("Error: " + err.message);
      setTestcaseResults([]);
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
          <Timer startTime={roundData?.startTime} endTime={roundData?.endTime} status={roundData?.status} />
          <Button onClick={handleSubmit} disabled={isSubmitting || expired} className="bg-green-600 hover:bg-green-700">
            <Send className="h-4 w-4 mr-2" /> {isSubmitting ? "Submitting..." : "Submit"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Exit</Button>
        </div>
      </div>

      {roundData?.status === 'active' && (
        <div className="bg-green-50 border-b border-green-200">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <Alert className="bg-green-50 border-green-200 text-green-800">
              <AlertDescription>Round is active. Work continues and timer is ticking.</AlertDescription>
            </Alert>
          </div>
        </div>
      )}

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT SIDE — Problem List & Description */}
        <div className="w-1/4 border-r bg-white flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-sm text-gray-600 mb-2">Problems</h2>
            <div className="space-y-2">
              {loadingProblems ? (
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
            {currentProblem ? (
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
                <Select value={language} onValueChange={setLanguage} disabled={false}>
                <SelectTrigger className="w-40 bg-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {expired && <Badge variant="destructive" className="animate-pulse"><AlertCircle /> Time Expired</Badge>}
          </div>

          <div className="flex-1">
            <CodeEditor value={code} onChange={setCode} language={language} readOnly={false} />
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

              <Button onClick={handleRun} disabled={isRunning || expired} variant="secondary" className="mt-5">
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
              <TestcaseResults
                results={testcaseResults}
                previewOpen={(currentProblem?.openTestcases || currentProblem?.testcases || []).slice(0, 2)}
                previewHiddenCount={(currentProblem?.hiddenTestcases || []).slice(0, 4).length || 4}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      
    </div>
  );
};

export default CodingPage;
