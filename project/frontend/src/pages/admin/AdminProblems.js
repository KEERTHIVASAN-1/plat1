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
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const AdminProblems = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ id: '', title: '', difficulty: 'easy', description: '', testcases: [{ input: '', output: '' }] });
  const [editingId, setEditingId] = useState(null);

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

  const refresh = async () => {
    setLoading(true);
    try {
      const { data } = await api.getProblems();
      const list = data?.problems || data || [];
      setProblems(list);
    } catch (err) {
      setProblems([]);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setForm({ id: '', title: '', difficulty: 'easy', description: '', testcases: [{ input: '', output: '' }] });
    setShowAdd(true);
  };

  const openEdit = (p) => {
    setEditingId(p._id || p.id);
    setForm({ id: p._id || p.id, title: p.title || '', difficulty: p.difficulty || 'easy', description: p.description || '', testcases: (p.testcases || []).map(tc => ({ input: tc.input || '', output: tc.output || '' })) });
    setShowEdit(true);
  };

  const updateForm = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const updateTc = (i, k, v) => setForm(prev => ({ ...prev, testcases: prev.testcases.map((tc, idx) => idx === i ? { ...tc, [k]: v } : tc) }));
  const addTc = () => setForm(prev => ({ ...prev, testcases: [...prev.testcases, { input: '', output: '' }] }));
  const removeTc = (i) => setForm(prev => ({ ...prev, testcases: prev.testcases.filter((_, idx) => idx !== i) }));

  const submitAdd = async () => {
    const payload = { id: form.id.trim(), title: form.title.trim(), description: form.description.trim(), difficulty: form.difficulty, testcases: form.testcases.map(tc => ({ input: tc.input, output: tc.output })) };
    if (!payload.id || !payload.title) return;
    try {
      await api.addProblem(payload);
      setShowAdd(false);
      await refresh();
    } catch (err) {}
  };

  const submitEdit = async () => {
    const pid = editingId;
    const payload = { id: form.id.trim(), title: form.title.trim(), description: form.description.trim(), difficulty: form.difficulty, testcases: form.testcases.map(tc => ({ input: tc.input, output: tc.output })) };
    if (!pid) return;
    try {
      await api.updateProblem(pid, payload);
      setShowEdit(false);
      setEditingId(null);
      await refresh();
    } catch (err) {}
  };

  const confirmDelete = async (p) => {
    const pid = p._id || p.id;
    if (!pid) return;
    try {
      await api.deleteProblem(pid);
      await refresh();
    } catch (err) {}
  };

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
                <Button variant="outline" size="sm" onClick={() => openEdit(problem)}>
                  <Edit className="h-4 w-4 mr-1" />Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => confirmDelete(problem)}>
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
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />Add Problem
          </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? <div className="text-sm text-gray-500">Loading problems...</div> : <ProblemTable problems={problems} />}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Problem</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-sm">ID</span>
              <Input value={form.id} onChange={(e) => updateForm('id', e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-sm">Title</span>
              <Input value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-sm">Difficulty</span>
              <Input value={form.difficulty} onChange={(e) => updateForm('difficulty', e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-sm">Description</span>
              <Textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Testcases</span>
                <Button size="sm" onClick={addTc}>Add</Button>
              </div>
              {form.testcases.map((tc, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Textarea placeholder="Input" value={tc.input} onChange={(e) => updateTc(i, 'input', e.target.value)} />
                  <Textarea placeholder="Expected Output" value={tc.output} onChange={(e) => updateTc(i, 'output', e.target.value)} />
                  <div className="col-span-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => removeTc(i)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={submitAdd}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Problem</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-sm">ID</span>
              <Input value={form.id} onChange={(e) => updateForm('id', e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-sm">Title</span>
              <Input value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-sm">Difficulty</span>
              <Input value={form.difficulty} onChange={(e) => updateForm('difficulty', e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-sm">Description</span>
              <Textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Testcases</span>
                <Button size="sm" onClick={addTc}>Add</Button>
              </div>
              {form.testcases.map((tc, i) => (
                <div key={i} className="grid grid-cols-2 gap-2">
                  <Textarea placeholder="Input" value={tc.input} onChange={(e) => updateTc(i, 'input', e.target.value)} />
                  <Textarea placeholder="Expected Output" value={tc.output} onChange={(e) => updateTc(i, 'output', e.target.value)} />
                  <div className="col-span-2 text-right">
                    <Button variant="outline" size="sm" onClick={() => removeTc(i)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button onClick={submitEdit}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default AdminProblems;
