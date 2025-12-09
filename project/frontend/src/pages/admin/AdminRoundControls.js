import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useContest } from '../../contexts/ContestContext';
import { api } from '../../utils/api';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Play, Pause, RotateCcw, Lock, Unlock, Clock, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { toast } from '../../hooks/use-toast';

const AdminRoundControls = () => {
  const { roundInfo, lockRound, unlockRound, refreshRoundWindow } = useContest();
  const [durationMin, setDurationMin] = React.useState(60);
  const [scheduledStart, setScheduledStart] = React.useState('');
  const [opBusy, setOpBusy] = React.useState(false);
  const navigate = useNavigate();

  const handleStartRound = async (roundId) => {
    if (opBusy) return; setOpBusy(true);
    try {
      await api.timerStart(roundId);
      await refreshRoundWindow(roundId);
      toast({ title: "Round Started", description: `${roundId === 'round1' ? 'Round 1' : 'Round 2'} started.` });
    } catch (e) {
      toast({ title: "Start failed", description: e?.message || 'Error', variant: "destructive" });
    } finally { setOpBusy(false); }
  };

  const handleLockToggle = (roundId) => {
    const round = roundInfo[roundId];
    if (round.isLocked) {
      unlockRound(roundId);
      toast({
        title: "Round Unlocked",
        description: `${roundId === 'round1' ? 'Round 1' : 'Round 2'} is now accessible.`,
      });
    } else {
      lockRound(roundId);
      toast({
        title: "Round Locked",
        description: `${roundId === 'round1' ? 'Round 1' : 'Round 2'} has been locked.`,
      });
    }
  };

  const handlePauseRound = async (roundId) => {
    if (opBusy) return; setOpBusy(true);
    try {
      await api.timerPause(roundId);
      await refreshRoundWindow(roundId);
      toast({ title: "Round Paused" });
    } catch (e) {
      toast({ title: "Pause failed", description: e?.message || 'Error', variant: "destructive" });
    } finally { setOpBusy(false); }
  };

  const handleRestartRound = async (roundId) => {
    if (opBusy) return; setOpBusy(true);
    try {
      await api.timerRestart(roundId);
      await refreshRoundWindow(roundId);
      toast({ title: "Round Restarted" });
    } catch (e) {
      toast({ title: "Restart failed", description: e?.message || 'Error', variant: "destructive" });
    } finally { setOpBusy(false); }
  };

  const applySchedule = async (roundId) => {
    if (opBusy) return; setOpBusy(true);
    try {
      const duration = Math.max(0, parseInt(durationMin || 0, 10)) * 60;
      const scheduledISO = scheduledStart || undefined;
      await api.timerConfigure(roundId, duration, scheduledISO);
      await refreshRoundWindow(roundId);
      toast({ title: "Configuration saved" });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message || 'Error', variant: "destructive" });
    } finally { setOpBusy(false); }
  };

  const RoundCard = ({ roundId, roundName }) => {
    const round = roundInfo[roundId];
    const getStatusColor = () => {
      if (round.status === 'active') return 'bg-green-600';
      if (round.status === 'completed') return 'bg-gray-600';
      return 'bg-yellow-600';
    };

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{roundName}</CardTitle>
            <Badge className={getStatusColor()}>
              {round.status}
            </Badge>
          </div>
          <CardDescription>
            Duration: {(round.duration || 0) / 60} minutes | Problems: {round.problems.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Start Time:</p>
              <p className="font-medium">
                {round.startTime ? new Date(round.startTime).toLocaleString() : 'Not started'}
              </p>
              <p className="text-xs text-gray-500">Scheduled: {round.scheduledStart ? new Date(round.scheduledStart).toLocaleString() : 'None'}</p>
            </div>
            <div>
              <p className="text-gray-600">Lock Status:</p>
              <p className="font-medium">
                {round.isLocked ? 'Locked' : 'Unlocked'}
              </p>
            </div>
          </div>

          {/* Lock Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor={`lock-${roundId}`} className="text-base">Lock Round</Label>
              <p className="text-xs text-gray-500">Prevent participants from accessing this round</p>
            </div>
            <Switch
              id={`lock-${roundId}`}
              checked={round.isLocked}
              onCheckedChange={() => handleLockToggle(roundId)}
            />
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => handleStartRound(roundId)} disabled={opBusy}>
                <Play className="h-4 w-4 mr-2" />Start
              </Button>
              <Button variant="outline" onClick={() => handlePauseRound(roundId)} disabled={opBusy}>
                <Pause className="h-4 w-4 mr-2" />Pause
              </Button>
              <Button variant="secondary" onClick={() => handleRestartRound(roundId)} disabled={opBusy}>
                <RotateCcw className="h-4 w-4 mr-2" />Restart
              </Button>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <Label className="text-sm">Duration (minutes)</Label>
              <Input type="number" min="0" value={durationMin} onChange={(e) => setDurationMin(e.target.value)} />
              <Label className="text-sm">Scheduled Start (local date-time)</Label>
              <Input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} />
              <div className="text-right">
                <Button onClick={() => applySchedule(roundId)} disabled={opBusy}>Save Configuration</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Round Controls</h1>
            <p className="text-gray-600 text-sm">Start, lock, and manage contest rounds</p>
          </div>
        </div>

        {/* Round Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <RoundCard roundId="round1" roundName="Round 1" />
          <RoundCard roundId="round2" roundName="Round 2" />
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Control Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <Play className="h-4 w-4 mr-2 mt-0.5 text-blue-600 flex-shrink-0" />
                <span>Click "Start Round" to activate the round and start the timer.</span>
              </li>
              <li className="flex items-start">
                <Lock className="h-4 w-4 mr-2 mt-0.5 text-orange-600 flex-shrink-0" />
                <span>Use the lock toggle to prevent participants from accessing the round.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Mark a round as completed when the time limit expires or when you want to end it manually.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminRoundControls;
