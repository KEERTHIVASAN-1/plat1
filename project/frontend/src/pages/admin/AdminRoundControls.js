import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useContest } from '../../contexts/ContestContext';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Clock, CheckCircle2, Power, Play, Lock } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { toast } from '../../hooks/use-toast';
import { Input } from '../../components/ui/input';
import { api } from '../../utils/api';

const AdminRoundControls = () => {
  const { roundInfo, startRound, lockRound, unlockRound, updateRoundStatus } = useContest();
  const navigate = useNavigate();

  const handleToggleRound = async (roundId) => {
    try {
      const round = roundInfo[roundId];
      if (round.status === 'active') {
        await api.endRound(roundId);
        updateRoundStatus(roundId, 'completed');
        toast({ title: "Round Stopped", description: "Timer stopped and round completed." });
      } else {
        await api.startRoundTimer(roundId, undefined);
        startRound(roundId);
        toast({ title: "Round Started", description: "Timer started for participants." });
      }
    } catch (err) {
      toast({ title: "Failed to toggle", description: err.message, variant: "destructive" });
    }
  };

  const handleLockToggle = (roundId) => {};

  const handleCompleteRound = (roundId) => {};

  const handlePause = async (roundId) => {
    try {
      await api.pauseRound(roundId);
      toast({ title: "Round Paused", description: "Timer paused for participants." });
    } catch (err) {
      toast({ title: "Failed to pause", description: err.message, variant: "destructive" });
    }
  };

  const handleResume = async (roundId) => {
    try {
      await api.resumeRound(roundId);
      toast({ title: "Round Resumed", description: "Timer resumed for participants." });
    } catch (err) {
      toast({ title: "Failed to resume", description: err.message, variant: "destructive" });
    }
  };

  const handleRestart = async (roundId, durationSeconds) => {
    try {
      await api.restartRound(roundId, durationSeconds);
      toast({ title: "Round Restarted", description: "Timer restarted for participants." });
    } catch (err) {
      toast({ title: "Failed to restart", description: err.message, variant: "destructive" });
    }
  };

  const RoundCard = ({ roundId, roundName }) => {
    const round = roundInfo[roundId];
    const [startLocal, setStartLocal] = React.useState('');
    const [endLocal, setEndLocal] = React.useState('');
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
            Duration: {round.duration / 60} minutes | Problems: {round.problems.length}
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
            </div>
            <div>
              <p className="text-gray-600">Lock Status:</p>
              <p className="font-medium">
                {round.isLocked ? 'Locked' : 'Unlocked'}
              </p>
            </div>
          </div>

          {/* Manual Start/End Configuration */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`start-${roundId}`}>Start Date/Time</Label>
                <Input id={`start-${roundId}`} type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
              </div>
              <div>
                <Label htmlFor={`end-${roundId}`}>End Date/Time</Label>
                <Input id={`end-${roundId}`} type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const toIso = (val) => (val ? new Date(val).toISOString() : undefined);
                    const payload = { start: toIso(startLocal), end: toIso(endLocal), locked: false };
                    const { data } = await api.configureRoundWindow(roundId, payload);
                    // reflect immediately in local state for admin view
                    const updated = {
                      ...round,
                      startTime: data?.startTime ?? round.startTime,
                      endTime: data?.endTime ?? round.endTime,
                      isLocked: data?.isLocked ?? round.isLocked,
                      status: data?.status ?? round.status,
                    };
                    // update contest context locally
                    // minimal safe update since we don't have a dedicated setter exposed
                    // rely on startRound/updateRoundStatus flows as needed
                    toast({ title: "Timer Window Updated", description: "Start/End set successfully" });
                  } catch (err) {
                    toast({ title: "Failed to save", description: err.message, variant: "destructive" });
                  }
                }}
              >Save Window</Button>
            </div>
          </div>

          {/* Action Button */}
          <div className="space-y-2">
            <Button className="w-full" onClick={() => handleToggleRound(roundId)}>
              <Power className="h-4 w-4 mr-2" />
              Start / Stop Round Timer
            </Button>
            {round.status === 'active' && (
              <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
                <Clock className="h-5 w-5 text-green-600 mr-2 animate-pulse" />
                <span className="text-green-700 font-medium">Round is currently active</span>
              </div>
            )}
            {round.status === 'completed' && (
              <div className="flex items-center justify-center p-3 bg-gray-50 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-gray-700 font-medium">Round completed</span>
              </div>
            )}
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
