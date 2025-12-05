// src/pages/admin/AdminProblems.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, Plus, Edit, Eye, Trash2 } from 'lucide-react';

const AdminProblems = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.getProblems();
        const list = data?.problems || data || [];
        if (mounted) setProblems(list);
      } catch (err) {
        console.error('Failed to load problems', err);
        if (mounted) setProblems([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const ProblemTable = ({ problems }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Difficulty</TableHead>
            <TableHead className="text-center">Testcases</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {problems.map((problem, idx) => (
            <TableRow key={problem._id || problem.id || idx}>
              <TableCell className="font-mono text-sm">{problem._id || problem.id}</TableCell>
              <TableCell className="font-medium">{problem.title}</TableCell>
              <TableCell>
                <Badge variant={(problem.difficulty || '').toLowerCase() === 'easy' ? 'default' : 'secondary'}>
                  {problem.difficulty || 'easy'}
                </Badge>
              </TableCell>
              <TableCell className="text-center">{(problem.testcases || []).length}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/problems/view/${problem._id || problem.id}`)}>
                  <Eye className="h-4 w-4 mr-1" />View
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/problems/edit/${problem._id || problem.id}`)}>
                  <Edit className="h-4 w-4 mr-1" />Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => console.warn('delete not implemented')}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4 mr-2" />Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Problems Management</h1>
              <p className="text-gray-600 text-sm">Manage contest problems and testcases</p>
            </div>
          </div>
          <Button onClick={() => navigate('/admin/problems/add')}>
            <Plus className="h-4 w-4 mr-2" />Add Problem
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? <div className="text-sm text-gray-500">Loading problems...</div> : <ProblemTable problems={problems} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminProblems;
