import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContest } from '../../contexts/ContestContext';
import Navbar from '../../components/Navbar';
import CodeEditor from '../../components/CodeEditor';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, Calendar, Code } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

const AdminParticipantDetail = () => {
  const { id } = useParams();
  const { participants, toggleEligibility } = useContest();
  const navigate = useNavigate();

  const participant = participants.find(p => p.id === id);

  if (!participant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Participant not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/admin/participants')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{participant.name}</h1>
              <p className="text-gray-600 text-sm">{participant.email}</p>
            </div>
          </div>
        </div>

        {/* Participant Info */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Round 1 Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Attendance:</span>
                {participant.round1Attendance ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Attended
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <XCircle className="h-3 w-3 mr-1" />
                    Absent
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Testcases Passed:</span>
                <span className="font-bold text-lg">
                  {participant.round1TestcasesPassed}/{participant.round1TotalTestcases}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Timestamp:</span>
                <span className="text-sm">
                  {participant.round1Timestamp ? new Date(participant.round1Timestamp).toLocaleString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Round 2 Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="eligible">Round 2 Eligibility</Label>
                  <p className="text-xs text-gray-500">Toggle to grant/revoke access</p>
                </div>
                <Switch
                  id="eligible"
                  checked={participant.round2Eligible}
                  onCheckedChange={() => toggleEligibility(participant.id)}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Testcases Passed:</span>
                <span className="font-bold text-lg">
                  {participant.round2TestcasesPassed}/{participant.round2TotalTestcases}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Timestamp:</span>
                <span className="text-sm">
                  {participant.round2Timestamp ? new Date(participant.round2Timestamp).toLocaleString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions */}
        <Card>
          <CardHeader>
            <CardTitle>Code Submissions</CardTitle>
            <CardDescription>View all code submissions from this participant</CardDescription>
          </CardHeader>
          <CardContent>
            {participant.submissions && participant.submissions.length > 0 ? (
              <Tabs defaultValue="0" className="w-full">
                <TabsList>
                  {participant.submissions.map((sub, idx) => (
                    <TabsTrigger key={idx} value={String(idx)}>
                      Submission {idx + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {participant.submissions.map((submission, idx) => (
                  <TabsContent key={idx} value={String(idx)} className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Problem ID</p>
                        <p className="font-medium">{submission.problemId}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Language</p>
                        <Badge>{submission.language}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Score</p>
                        <p className="font-medium">
                          {submission.testcasesPassed}/{submission.totalTestcases}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Timestamp</p>
                        <p className="text-sm">{new Date(submission.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between">
                        <span className="text-white text-sm font-medium">
                          <Code className="inline h-4 w-4 mr-2" />
                          Code
                        </span>
                      </div>
                      <CodeEditor
                        value={submission.code}
                        language={submission.language}
                        readOnly={true}
                        height="400px"
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <p className="text-center text-gray-500 py-8">No submissions yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminParticipantDetail;
