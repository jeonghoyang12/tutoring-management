'use client';

import { useState, useEffect } from 'react';
import { studentsApi } from '@/lib/api';
import { Student } from '@/types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await studentsApi.getAll();
      setStudents(data);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('학생 이름을 입력해주세요.');
      return;
    }

    try {
      await studentsApi.create({
        name,
        grade: grade.trim() || undefined,
      });
      alert('학생이 등록되었습니다.');
      setName('');
      setGrade('');
      fetchStudents();
    } catch (error) {
      console.error('Create failed:', error);
      alert('학생 등록에 실패했습니다.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await studentsApi.delete(id);
      alert('학생이 삭제되었습니다.');
      fetchStudents();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">학생 관리</h1>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">학생 등록</h2>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="학생 이름"
            className="input-field flex-1"
          />
          <input
            type="text"
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder="학년 (예: 중3, 고1)"
            className="input-field w-40"
            maxLength={10}
          />
          <button type="submit" className="btn-primary">
            등록
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">학생 목록 ({students.length}명)</h2>
        {loading ? (
          <p className="text-center text-gray-500 py-8">로딩 중...</p>
        ) : students.length === 0 ? (
          <p className="text-center text-gray-500 py-8">등록된 학생이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">이름</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">학년</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">등록일</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <a
                        href={`/students/${student.id}`}
                        className="text-primary-600 hover:text-primary-800"
                      >
                        {student.name}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.grade || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(student.enrollment_date).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <a
                        href={`/students/${student.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        상세보기
                      </a>
                      <button
                        onClick={() => handleDelete(student.id)}
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
