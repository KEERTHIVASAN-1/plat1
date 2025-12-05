import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useContest } from '../../contexts/ContestContext';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Users, Code, Settings, FileText } from 'lucide-react';

const AdminDashboard = () => {
  const { participants, roundInfo } = useContest();
  const navigate = useNavigate();

  const stats = {
    totalParticipants: participants.length,
    round1Attended: participants.filter(p => p.round1Attendance).length,
    round2Eligible: participants.filter(p => p.round2Eligible).length,
    round2Attended: participants.filter(p => p.round2Attendance).length,
  };

  const adminCards = [
    {
      title: 'Participants',
      description: 'View and manage all registered participants',
      icon: Users,
      value: stats.totalParticipants,
      action: () => navigate('/admin/participants'),
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      title: 'Problems',
      description: 'Manage contest problems and testcases',
      icon: Code,
      value: `${roundInfo.round1.problems.length + roundInfo.round2.problems.length}`,
      action: () => navigate('/admin/problems'),
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      title: 'Round Controls',
      description: 'Start, stop, and manage contest rounds',
      icon: Settings,
      action: () => navigate('/admin/rounds'),
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl p-8 text-white shadow-lg">
          <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-slate-300">Manage contest, participants, and rounds</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Participants</CardDescription>
              <CardTitle className="text-3xl">{stats.totalParticipants}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Round 1 Attendance</CardDescription>
              <CardTitle className="text-3xl">{stats.round1Attended}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Round 2 Eligible</CardDescription>
              <CardTitle className="text-3xl">{stats.round2Eligible}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Round 2 Attendance</CardDescription>
              <CardTitle className="text-3xl">{stats.round2Attended}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Admin Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          {adminCards.map((card, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={card.action}>
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${card.bg} flex items-center justify-center mb-4`}>
                  <card.icon className={`h-6 w-6 ${card.color}`} />
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {card.value && (
                  <div className="text-2xl font-bold text-gray-900 mb-4">
                    {card.value}
                  </div>
                )}
                <Button className="w-full" variant="outline">
                  Manage
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Round Status */}
        <Card>
          <CardHeader>
            <CardTitle>Round Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Round 1</span>
                  <Badge variant={roundInfo.round1.status === 'active' ? 'default' : 'secondary'}>
                    {roundInfo.round1.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Duration: {roundInfo.round1.duration / 60} minutes
                </div>
                <div className="text-sm text-gray-600">
                  Problems: {roundInfo.round1.problems.length}
                </div>
                <div className="text-sm text-gray-600">
                  Locked: {roundInfo.round1.isLocked ? 'Yes' : 'No'}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Round 2</span>
                  <Badge variant={roundInfo.round2.status === 'active' ? 'default' : 'secondary'}>
                    {roundInfo.round2.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600">
                  Duration: {roundInfo.round2.duration / 60} minutes
                </div>
                <div className="text-sm text-gray-600">
                  Problems: {roundInfo.round2.problems.length}
                </div>
                <div className="text-sm text-gray-600">
                  Locked: {roundInfo.round2.isLocked ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
