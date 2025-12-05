import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useContest } from '../contexts/ContestContext';
import Navbar from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Clock, Code, Trophy, CheckCircle2, XCircle, Lock } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { roundInfo, startRound } = useContest();
  const navigate = useNavigate();

  const handleStartRound = (roundId) => {
    startRound(roundId);
    navigate(`/${roundId}`);
  };

  const handleContinueRound = (roundId) => {
    navigate(`/${roundId}`);
  };

  const getRoundStatus = (round) => {
    if (round.status === 'completed') {
      return { label: 'Completed', variant: 'secondary', icon: CheckCircle2 };
    }
    if (round.status === 'active') {
      return { label: 'Active', variant: 'default', icon: Clock };
    }
    return { label: 'Upcoming', variant: 'outline', icon: Lock };
  };

  const round1Safe = roundInfo?.round1 || { status: 'upcoming', problems: [] };
  const round2Safe = roundInfo?.round2 || { status: 'upcoming', problems: [] };
  const round1Status = getRoundStatus(round1Safe);
  const round2Status = getRoundStatus(round2Safe);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name}!</h1>
          <p className="text-blue-100">Ready to showcase your coding skills?</p>
        </div>

        {/* Contest Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Trophy className="h-6 w-6 text-yellow-600" />
              <CardTitle>Two-Round Coding Contest</CardTitle>
            </div>
            <CardDescription>
              Complete Round 1 to qualify for Round 2. Admin will review and mark eligible participants.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Round 1 */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Round 1</CardTitle>
                    <Badge variant={round1Status.variant}>
                      <round1Status.icon className="h-3 w-3 mr-1" />
                      {round1Status.label}
                    </Badge>
                  </div>
                  <CardDescription>Qualification Round</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Problems:</span>
                      <span className="font-medium">{round1Safe.problems.length} problems</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium">
                        {user?.round1Completed ? 'Completed' : 'Not Started'}
                      </span>
                    </div>
                  </div>

                  {round1Safe.status === 'active' && (
                    <Button 
                      className="w-full" 
                      onClick={() => handleContinueRound('round1')}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      Continue Round 1
                    </Button>
                  )}
                  
                  {round1Safe.status === 'upcoming' && (
                    <Button 
                      className="w-full" 
                      onClick={() => handleStartRound('round1')}
                    >
                      Start Round 1
                    </Button>
                  )}
                  
                  {round1Safe.status === 'completed' && (
                    <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-2" />
                      <span className="text-green-700 font-medium">Round Completed</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Round 2 */}
              <Card className="border-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">Round 2</CardTitle>
                    <Badge variant={round2Status.variant}>
                      <round2Status.icon className="h-3 w-3 mr-1" />
                      {round2Status.label}
                    </Badge>
                  </div>
                  <CardDescription>Final Round</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Problems:</span>
                      <span className="font-medium">{round2Safe.problems.length} problem(s)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Eligibility:</span>
                      <span className="font-medium">
                        {user?.round2Eligible ? (
                          <span className="text-green-600">Eligible</span>
                        ) : (
                          <span className="text-gray-500">Not Eligible</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {user?.round2Eligible && round2Safe.status === 'active' && (
                    <Button 
                      className="w-full" 
                      onClick={() => handleContinueRound('round2')}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      Continue Round 2
                    </Button>
                  )}
                  
                  {!user?.round2Eligible && (
                    <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
                      <Lock className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-600 text-sm">
                        Complete Round 1 and wait for admin approval
                      </span>
                    </div>
                  )}

                  {user?.round2Eligible && round2Safe.status === 'upcoming' && (
                    <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                      <Clock className="h-5 w-5 text-blue-600 mr-2" />
                      <span className="text-blue-700 text-sm font-medium">
                        Waiting for Round 2 to start
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Contest Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>You can run your code with custom inputs before final submission.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Focus on writing clean, correct solutions.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Submit your solution to get testcase results. Some testcases are hidden.</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-600 flex-shrink-0" />
                <span>Admin will manually review Round 1 submissions and mark eligible participants for Round 2.</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
