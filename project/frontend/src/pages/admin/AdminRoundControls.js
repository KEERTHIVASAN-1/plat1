import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useContest } from '../../contexts/ContestContext';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Play, Lock, Unlock, Clock, CheckCircle2 } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { toast } from '../../hooks/use-toast';

const AdminRoundControls = () => {
  const { roundInfo, startRound, lockRound, unlockRound, updateRoundStatus } = useContest();
  const navigate = useNavigate();

  const handleStartRound = (roundId) => {
    startRound(roundId);
    toast({
      title: "Round Started",
      description: `${roundId === 'round1' ? 'Round 1' : 'Round 2'} has been started successfully.`,
    });
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

  const handleCompleteRound = (roundId) => {
    updateRoundStatus(roundId, 'completed');
    toast({
      title: "Round Completed",
      description: `${roundId === 'round1' ? 'Round 1' : 'Round 2'} has been marked as completed.`,
    });
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
            {round.status === 'upcoming' && (
              <Button
                className="w-full"
                onClick={() => handleStartRound(roundId)}
              >
                <Play className="h-4 w-4 mr-2" />
                Start {roundName}
              </Button>
            )}

            {round.status === 'active' && (
              <>
                <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600 mr-2 animate-pulse" />
                  <span className="text-green-700 font-medium">Round is currently active</span>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleCompleteRound(roundId)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>
              </>
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
