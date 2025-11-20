'use client';

import { useState, useEffect } from 'react';
import { problemsApi } from '@/lib/api';
import { Problem } from '@/types';

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]); // Store all problems for dropdown
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [difficulty, setDifficulty] = useState(3);
  const [layoutType, setLayoutType] = useState<'NORMAL' | 'HORIZONTAL' | 'VERTICAL'>('NORMAL');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [answer, setAnswer] = useState('');
  const [problemCode, setProblemCode] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString().slice(-2));
  const [textbook, setTextbook] = useState('');
  const [chapter, setChapter] = useState('');
  const [subchapter, setSubchapter] = useState('');
  const [problemNumber, setProblemNumber] = useState('');
  const [filterDifficulties, setFilterDifficulties] = useState<Set<number>>(new Set());
  const [filterLayouts, setFilterLayouts] = useState<Set<string>>(new Set());
  const [filterTextbook, setFilterTextbook] = useState('');
  const [showTextbookDropdown, setShowTextbookDropdown] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [editFormData, setEditFormData] = useState({
    difficulty: 3,
    layout_type: 'NORMAL' as 'NORMAL' | 'HORIZONTAL' | 'VERTICAL',
    subject: '',
    topic: '',
    answer: '',
    problem_code: '',
    textbook: '',
    chapter: '',
    subchapter: '',
    problem_number: undefined as number | undefined
  });

  useEffect(() => {
    fetchProblems();
  }, [filterDifficulties, filterLayouts, filterTextbook]);

  const fetchProblems = async () => {
    try {
      setLoading(true);
      const data = await problemsApi.getAll();
      setAllProblems(data); // Store all problems

      // Apply client-side filtering
      let filtered = data;

      if (filterDifficulties.size > 0) {
        filtered = filtered.filter(p => filterDifficulties.has(p.difficulty));
      }

      if (filterLayouts.size > 0) {
        filtered = filtered.filter(p => filterLayouts.has(p.layout_type));
      }

      if (filterTextbook) {
        filtered = filtered.filter(p =>
          p.textbook?.toLowerCase().includes(filterTextbook.toLowerCase())
        );
      }

      setProblems(filtered);
    } catch (error) {
      console.error('Failed to fetch problems:', error);
      alert('문제 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique textbooks from all problems
  const getAvailableTextbooks = () => {
    const textbooks = new Set<string>();
    allProblems.forEach(p => {
      if (p.textbook) textbooks.add(p.textbook);
    });
    return Array.from(textbooks).sort();
  };

  // Get filtered textbooks based on input
  const getFilteredTextbooks = () => {
    const available = getAvailableTextbooks();
    if (!filterTextbook) return available;
    return available.filter(t =>
      t.toLowerCase().includes(filterTextbook.toLowerCase())
    );
  };

  const toggleDifficultyFilter = (level: number) => {
    const newSet = new Set(filterDifficulties);
    if (newSet.has(level)) {
      newSet.delete(level);
    } else {
      newSet.add(level);
    }
    setFilterDifficulties(newSet);
  };

  const toggleLayoutFilter = (layout: string) => {
    const newSet = new Set(filterLayouts);
    if (newSet.has(layout)) {
      newSet.delete(layout);
    } else {
      newSet.add(layout);
    }
    setFilterLayouts(newSet);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('파일을 선택해주세요.');
      return;
    }

    try {
      setUploading(true);

      // Generate problem code if components provided
      let finalProblemCode = problemCode;
      if (!problemCode && year && textbook && problemNumber) {
        finalProblemCode = `${year}_${textbook}`;
        if (chapter) finalProblemCode += `_${chapter}`;
        if (subchapter) finalProblemCode += `_${subchapter}`;
        finalProblemCode += `_${problemNumber}`;
      }

      await problemsApi.upload(
        selectedFile,
        difficulty,
        layoutType,
        subject || undefined,
        topic || undefined,
        answer || undefined,
        finalProblemCode || undefined,
        textbook || undefined,
        chapter || undefined,
        subchapter || undefined,
        problemNumber ? Number(problemNumber) : undefined
      );
      setSelectedFile(null);
      setLayoutType('NORMAL');
      setSubject('');
      setTopic('');
      setAnswer('');
      setProblemCode('');
      setYear(new Date().getFullYear().toString().slice(-2));
      setTextbook('');
      setChapter('');
      setSubchapter('');
      setProblemNumber('');
      fetchProblems();
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await problemsApi.delete(id);
      fetchProblems();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleLayoutChange = async (id: number, newLayoutType: string) => {
    try {
      await problemsApi.update(id, { layout_type: newLayoutType as any });
      fetchProblems();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleEditClick = (problem: Problem) => {
    setEditingProblem(problem);
    setEditFormData({
      difficulty: problem.difficulty,
      layout_type: problem.layout_type,
      subject: problem.subject || '',
      topic: problem.topic || '',
      answer: problem.answer || '',
      problem_code: problem.problem_code || '',
      textbook: problem.textbook || '',
      chapter: problem.chapter || '',
      subchapter: problem.subchapter || '',
      problem_number: problem.problem_number
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblem) return;

    try {
      await problemsApi.update(editingProblem.id, {
        difficulty: editFormData.difficulty,
        layout_type: editFormData.layout_type,
        subject: editFormData.subject || undefined,
        topic: editFormData.topic || undefined,
        answer: editFormData.answer || undefined,
        problem_code: editFormData.problem_code || undefined,
        textbook: editFormData.textbook || undefined,
        chapter: editFormData.chapter || undefined,
        subchapter: editFormData.subchapter || undefined,
        problem_number: editFormData.problem_number
      });
      setEditingProblem(null);
      fetchProblems();
    } catch (error) {
      console.error('Update failed:', error);
      alert('문제 수정에 실패했습니다.');
    }
  };

  const getLayoutBadgeColor = (layoutType: string) => {
    switch (layoutType) {
      case 'HORIZONTAL':
        return 'bg-blue-100 text-blue-800';
      case 'VERTICAL':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLayoutLabel = (layoutType: string) => {
    switch (layoutType) {
      case 'HORIZONTAL':
        return '가로형';
      case 'VERTICAL':
        return '세로형';
      default:
        return '일반형';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">문제 은행</h1>
      </div>

      {/* Upload Form */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">문제 업로드</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              문제 이미지
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                난이도 (1-5)
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
                className="input-field w-full"
              >
                {[1, 2, 3, 4, 5].map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                레이아웃 타입
              </label>
              <select
                value={layoutType}
                onChange={(e) => setLayoutType(e.target.value as 'NORMAL' | 'HORIZONTAL' | 'VERTICAL')}
                className="input-field w-full"
              >
                <option value="NORMAL">일반형 (1칸)</option>
                <option value="HORIZONTAL">가로형 (2칸 가로)</option>
                <option value="VERTICAL">세로형 (2칸 세로)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                과목 (선택)
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input-field w-full"
                placeholder="예: 수학"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                주제 (선택)
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="input-field w-full"
                placeholder="예: 이차방정식"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                정답 (선택)
              </label>
              <input
                type="text"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className="input-field w-full"
                placeholder="예: ②"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-md font-semibold mb-3">문제 코드 (선택)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  직접 입력
                </label>
                <input
                  type="text"
                  value={problemCode}
                  onChange={(e) => setProblemCode(e.target.value)}
                  className="input-field w-full"
                  placeholder="예: 26_펀더멘탈_수1_2_28"
                />
              </div>

              <div className="md:col-span-2">
                <p className="text-sm text-gray-600 mb-2">또는 자동 생성:</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연도 *
                </label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  className="input-field w-full"
                  placeholder="예: 25, 26"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  교재명 *
                </label>
                <input
                  type="text"
                  value={textbook}
                  onChange={(e) => setTextbook(e.target.value)}
                  className="input-field w-full"
                  placeholder="예: 펀더멘탈, 수특, 수완"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문제 번호 *
                </label>
                <input
                  type="number"
                  value={problemNumber}
                  onChange={(e) => setProblemNumber(e.target.value)}
                  className="input-field w-full"
                  placeholder="예: 28"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  대단원 (선택)
                </label>
                <input
                  type="text"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  className="input-field w-full"
                  placeholder="예: 수1, 수2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  소단원 (선택)
                </label>
                <input
                  type="text"
                  value={subchapter}
                  onChange={(e) => setSubchapter(e.target.value)}
                  className="input-field w-full"
                  placeholder="예: 2, 3"
                />
              </div>

              {year && textbook && problemNumber && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-600">
                    생성될 코드: <span className="font-mono font-bold text-primary-600">
                      {year}_{textbook}
                      {chapter ? `_${chapter}` : ''}
                      {subchapter ? `_${subchapter}` : ''}
                      _{problemNumber}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={uploading || !selectedFile}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? '업로드 중...' : '문제 업로드'}
          </button>
        </form>
      </div>

      {/* Filters */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">필터</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              난이도 (복수 선택)
            </label>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((level) => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterDifficulties.has(level)}
                    onChange={() => toggleDifficultyFilter(level)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm">{level}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              레이아웃 (복수 선택)
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterLayouts.has('NORMAL')}
                  onChange={() => toggleLayoutFilter('NORMAL')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">일반형</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterLayouts.has('HORIZONTAL')}
                  onChange={() => toggleLayoutFilter('HORIZONTAL')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">가로형</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterLayouts.has('VERTICAL')}
                  onChange={() => toggleLayoutFilter('VERTICAL')}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm">세로형</span>
              </label>
            </div>
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              교재명
            </label>
            <input
              type="text"
              value={filterTextbook}
              onChange={(e) => {
                setFilterTextbook(e.target.value);
                setShowTextbookDropdown(true);
              }}
              onFocus={() => setShowTextbookDropdown(true)}
              onBlur={() => setTimeout(() => setShowTextbookDropdown(false), 200)}
              className="input-field w-full"
              placeholder="예: 펀더멘탈, 수특..."
            />
            {showTextbookDropdown && getFilteredTextbooks().length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {getFilteredTextbooks().map((textbook) => (
                  <button
                    key={textbook}
                    type="button"
                    onClick={() => {
                      setFilterTextbook(textbook);
                      setShowTextbookDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                  >
                    {textbook}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Problems Grid */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">문제 목록 ({problems.length}개)</h2>
        {loading ? (
          <p className="text-center text-gray-500 py-8">로딩 중...</p>
        ) : problems.length === 0 ? (
          <p className="text-center text-gray-500 py-8">문제가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {problems.map((problem) => (
              <div
                key={problem.id}
                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={problem.image_url}
                    alt={`Problem ${problem.id}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 text-xs rounded-full ${getLayoutBadgeColor(problem.layout_type)}`}>
                      {getLayoutLabel(problem.layout_type)}
                    </span>
                    <span className="text-sm text-gray-600">난이도: {problem.difficulty}</span>
                  </div>
                  <p className="text-base font-mono font-bold text-primary-600">
                    {problem.problem_code || `#${problem.id}`}
                  </p>
                  {problem.subject && (
                    <p className="text-sm text-gray-600">과목: {problem.subject}</p>
                  )}
                  {problem.topic && (
                    <p className="text-sm text-gray-600">주제: {problem.topic}</p>
                  )}
                  <p className="text-xs text-gray-400 mb-3">
                    크기: {problem.width}x{problem.height} (비율: {problem.aspect_ratio})
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditClick(problem)}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(problem.id)}
                      className="flex-1 btn-danger text-sm"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingProblem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">문제 정보 수정</h2>
                <button
                  onClick={() => setEditingProblem(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="mb-4">
                <img
                  src={editingProblem.image_url}
                  alt={`Problem ${editingProblem.id}`}
                  className="w-full max-h-64 object-contain bg-gray-100 rounded"
                />
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      난이도 (1-5)
                    </label>
                    <select
                      value={editFormData.difficulty}
                      onChange={(e) => setEditFormData({ ...editFormData, difficulty: Number(e.target.value) })}
                      className="input-field w-full"
                    >
                      {[1, 2, 3, 4, 5].map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      레이아웃 타입
                    </label>
                    <select
                      value={editFormData.layout_type}
                      onChange={(e) => setEditFormData({ ...editFormData, layout_type: e.target.value as any })}
                      className="input-field w-full"
                    >
                      <option value="NORMAL">일반형</option>
                      <option value="HORIZONTAL">가로형</option>
                      <option value="VERTICAL">세로형</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      과목
                    </label>
                    <input
                      type="text"
                      value={editFormData.subject}
                      onChange={(e) => setEditFormData({ ...editFormData, subject: e.target.value })}
                      className="input-field w-full"
                      placeholder="예: 수학"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      주제
                    </label>
                    <input
                      type="text"
                      value={editFormData.topic}
                      onChange={(e) => setEditFormData({ ...editFormData, topic: e.target.value })}
                      className="input-field w-full"
                      placeholder="예: 이차방정식"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      정답
                    </label>
                    <input
                      type="text"
                      value={editFormData.answer}
                      onChange={(e) => setEditFormData({ ...editFormData, answer: e.target.value })}
                      className="input-field w-full"
                      placeholder="예: ②"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      교재명
                    </label>
                    <input
                      type="text"
                      value={editFormData.textbook}
                      onChange={(e) => setEditFormData({ ...editFormData, textbook: e.target.value })}
                      className="input-field w-full"
                      placeholder="예: 펀더멘탈, 수특"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      대단원
                    </label>
                    <input
                      type="text"
                      value={editFormData.chapter}
                      onChange={(e) => setEditFormData({ ...editFormData, chapter: e.target.value })}
                      className="input-field w-full"
                      placeholder="예: 수1, 수2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      소단원
                    </label>
                    <input
                      type="text"
                      value={editFormData.subchapter}
                      onChange={(e) => setEditFormData({ ...editFormData, subchapter: e.target.value })}
                      className="input-field w-full"
                      placeholder="예: 2, 3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      문제 번호
                    </label>
                    <input
                      type="number"
                      value={editFormData.problem_number || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, problem_number: e.target.value ? Number(e.target.value) : undefined })}
                      className="input-field w-full"
                      placeholder="예: 28"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      문제 코드
                    </label>
                    <input
                      type="text"
                      value={editFormData.problem_code}
                      onChange={(e) => setEditFormData({ ...editFormData, problem_code: e.target.value })}
                      className="input-field w-full"
                      placeholder="예: 26_펀더멘탈_수1_2_28"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingProblem(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 btn-primary"
                  >
                    저장
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
