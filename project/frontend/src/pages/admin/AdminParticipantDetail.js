import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useContest } from '../../contexts/ContestContext';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';

const AdminParticipantDetail = () => {
  const { id } = useParams();
  const { participants = [], toggleEligibility } = useContest();
  const navigate = useNavigate();

  const participant = participants.find((p) => p.id === id);

  if (!participant) {
    return <div className="p-10 text-center">Participant not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Button variant="outline" onClick={() => navigate('/admin/participants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <h1 className="text-2xl font-bold">{participant.name || 'Unnamed Participant'}</h1>
        <p className="text-gray-600">{participant.email || '-'}</p>

        <Card>
          <CardHeader>
            <CardTitle>Round 1</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Attendance</span>
              {participant.round1Attendance ? (
                <Badge className="bg-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Attended
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <XCircle className="h-3 w-3 mr-1" /> Absent
                </Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span>Score</span>
              <strong>
                {participant.round1TestcasesPassed || 0}/{participant.round1TotalTestcases || 0}
              </strong>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Round 2</CardTitle>
          </CardHeader>
          <CardContent className="flex justify-between items-center">
            <div>
              <Label>Eligible</Label>
            </div>
            <Switch
              checked={!!participant.round2Eligible}
              onCheckedChange={() => toggleEligibility(participant.id)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminParticipantDetail;
