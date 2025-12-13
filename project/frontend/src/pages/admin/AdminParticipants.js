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
import { Switch } from '../../components/ui/switch';

const AdminParticipants = () => {
  const { participants = [], toggleEligibility, addParticipant } = useContest();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (adding) return;
    setAdding(true);
    try {
      await addParticipant(
        newName.trim(),
        newEmail.trim(),
        newPassword.trim() || undefined
      );
      setNewName('');
      setNewEmail('');
      setNewPassword('');
    } catch (e) {
      console.error('Add participant error:', e);
    } finally {
      setAdding(false);
    }
  };

  const filteredParticipants = participants
    .filter((p) => {
      const name = String(p?.name || '').toLowerCase();
      const email = String(p?.email || '').toLowerCase();
      const q = searchTerm.toLowerCase();
      return name.includes(q) || email.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      }
      if (sortBy === 'score') {
        return (b?.round1TestcasesPassed || 0) - (a?.round1TestcasesPassed || 0);
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Participants Management</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Add Participant</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-3">
            <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Input placeholder="Password (optional)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <Button onClick={handleAdd} disabled={adding}>Add</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border px-3 rounded"
            >
              <option value="name">Sort by Name</option>
              <option value="score">Sort by Score</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Participants ({filteredParticipants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Round 1</TableHead>
                  <TableHead className="text-center">R1 Score</TableHead>
                  <TableHead className="text-center">R1 Completed</TableHead>
                  <TableHead className="text-center">Round 2 Eligible</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParticipants.map((p, idx) => (
                    <TableRow key={p.id || p.email || idx}>

                    <TableCell>{p.name || '-'}</TableCell>
                    <TableCell>{p.email || '-'}</TableCell>
                    <TableCell className="text-center">
                      {p.round1Attendance ? (
                        <Badge className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Attended
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <XCircle className="h-3 w-3 mr-1" /> Absent
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.round1TestcasesPassed || 0}/{p.round1TotalTestcases || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.round1ProblemsCompleted || 0}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={!!p.round2Eligible}
                        onCheckedChange={() => toggleEligibility(p.id)}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/participant/${p.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminParticipants;
