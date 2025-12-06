import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContest } from '../../contexts/ContestContext';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { ArrowLeft, Search, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';

const AdminParticipants = () => {
  const { participants, toggleEligibility } = useContest();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const filteredParticipants = participants
    .filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'score') return b.round1TestcasesPassed - a.round1TestcasesPassed;
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Participants Management</h1>
              <p className="text-gray-600 text-sm">View and manage all registered participants</p>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="name">Sort by Name</option>
                <option value="score">Sort by Score</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Participants Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Participants ({filteredParticipants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Round 1</TableHead>
                    <TableHead className="text-center">R1 Score</TableHead>
                    <TableHead className="text-center">Round 2 Eligible</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.map((participant) => (
                    <TableRow key={participant.id}>
                      <TableCell className="font-medium">{participant.name}</TableCell>
                      <TableCell>{participant.email}</TableCell>
                      <TableCell className="text-center">
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
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">
                          {participant.round1TestcasesPassed}/{participant.round1TotalTestcases}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={participant.round2Eligible}
                          onCheckedChange={() => toggleEligibility(participant.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Input
                            placeholder="Set password"
                            value={participant.password || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              participant.password = v;
                            }}
                          />
                          <Button size="sm" onClick={async () => {
                            const v = participant.password || '';
                            if (!v) return;
                            try { await api.setParticipantPassword(participant.id, v); } catch (_) {}
                          }}>Save</Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/participant/${participant.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Round 2 Selected */}
        <Card>
          <CardHeader>
            <CardTitle>Round 2 Selected ({participants.filter(p => p.round2Eligible).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Round 1 Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participants.filter(p => p.round2Eligible).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.email}</TableCell>
                      <TableCell className="text-center">{p.round1TestcasesPassed}/{p.round1TotalTestcases}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminParticipants;
