'use client';

import { useState, useEffect } from 'react';
import { assignmentsApi, studentsApi } from '@/lib/api';
import { Assignment, Student } from '@/types';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [maxProblems, setMaxProblems] = useState('15');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignmentsData, studentsData] = await Promise.all([
        assignmentsApi.getAll(),
        studentsApi.getAll(),
      ]);
      setAssignments(assignmentsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !scheduledDate) {
      alert('모든 필드를 입력해주세요.');
      return;
    }

    try {
      await assignmentsApi.create({
        student_id: Number(selectedStudent),
        scheduled_date: new Date(scheduledDate).toISOString(),
        max_problems_per_day: Number(maxProblems),
      });
      alert('과제가 생성되었습니다.');
      setSelectedStudent('');
      setScheduledDate('');
      setMaxProblems('15');
      fetchData();
    } catch (error) {
      console.error('Create failed:', error);
      alert('과제 생성에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await assignmentsApi.delete(id);
      alert('과제가 삭제되었습니다.');
      fetchData();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const getStudentName = (studentId: number) => {
    const student = students.find((s) => s.id === studentId);
    return student ? student.name : `학생 ID: ${studentId}`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      COMPLETED: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
    };
    const labels = {
      PENDING: '대기',
      COMPLETED: '완료',
      OVERDUE: '지연',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">과제 관리</h1>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">과제 생성</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="input-field"
          >
            <option value="">학생 선택</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="input-field"
          />

          <input
            type="number"
            value={maxProblems}
            onChange={(e) => setMaxProblems(e.target.value)}
            placeholder="하루 최대 문제 수"
            className="input-field"
            min="1"
          />

          <button type="submit" className="btn-primary">
            과제 생성
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">과제 목록 ({assignments.length}개)</h2>
        {loading ? (
          <p className="text-center text-gray-500 py-8">로딩 중...</p>
        ) : assignments.length === 0 ? (
          <p className="text-center text-gray-500 py-8">생성된 과제가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">학생</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">예정일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">최대 문제 수</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <tr key={assignment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {getStudentName(assignment.student_id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(assignment.scheduled_date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {assignment.max_problems_per_day}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(assignment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
