'use client';

import { useState, useEffect } from 'react';
import { problemsApi, worksheetsApi } from '@/lib/api';
import { Problem } from '@/types';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, problem, onRemove }: { id: number; problem: Problem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getLayoutLabel = (layoutType: string) => {
    switch (layoutType) {
      case 'HORIZONTAL': return '가로형';
      case 'VERTICAL': return '세로형';
      default: return '일반형';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
    >
      <div {...attributes} {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </div>
      <img src={problem.image_url} alt={`Problem ${problem.id}`} className="w-16 h-16 object-contain bg-gray-100 rounded" />
      <div className="flex-1">
        <p className="font-medium font-mono text-primary-600">{problem.problem_code || `#${problem.id}`}</p>
        <p className="text-sm text-gray-600">
          {getLayoutLabel(problem.layout_type)} | 난이도: {problem.difficulty}
        </p>
      </div>
      <button onClick={onRemove} className="text-red-600 hover:text-red-800">
        제거
      </button>
    </div>
  );
}

export default function WorksheetsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<Problem[]>([]);
  const [title, setTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [filterDifficulties, setFilterDifficulties] = useState<Set<number>>(new Set());
  const [filterLayouts, setFilterLayouts] = useState<Set<string>>(new Set());
  const [filterTextbook, setFilterTextbook] = useState('');
  const [showTextbookDropdown, setShowTextbookDropdown] = useState(false);

  useEffect(() => {
    fetchProblems();
  }, [filterDifficulties, filterLayouts, filterTextbook]);

  const fetchProblems = async () => {
    try {
      const data = await problemsApi.getAll();
      setAllProblems(data);

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

  const addProblem = (problem: Problem) => {
    if (!selectedProblems.find((p) => p.id === problem.id)) {
      setSelectedProblems([...selectedProblems, problem]);
    }
  };

  const removeProblem = (problemId: number) => {
    setSelectedProblems(selectedProblems.filter((p) => p.id !== problemId));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedProblems.findIndex((p) => p.id === active.id);
      const newIndex = selectedProblems.findIndex((p) => p.id === over.id);
      setSelectedProblems(arrayMove(selectedProblems, oldIndex, newIndex));
    }
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      alert('문제지 제목을 입력해주세요.');
      return;
    }

    if (selectedProblems.length === 0) {
      alert('최소 1개 이상의 문제를 선택해주세요.');
      return;
    }

    try {
      setGenerating(true);
      const result = await worksheetsApi.generate({
        title,
        problem_ids: selectedProblems.map((p) => p.id),
      });

      alert('문제지가 생성되었습니다!');

      // Download PDF with user-friendly filename
      const response = await fetch(result.pdf_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.pdf`;  // Use original title as filename
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Reset
      setTitle('');
      setSelectedProblems([]);
    } catch (error) {
      console.error('Generate failed:', error);
      alert('문제지 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  // Calculate grid preview layout - matches backend PDF logic exactly
  const getGridPreview = () => {
    const pages: (Problem | null)[][][] = [];
    let occupied = [[false, false], [false, false]];
    let currentPage: (Problem | null)[][] = [[null, null], [null, null]];

    for (const problem of selectedProblems) {
      const layout = problem.layout_type;

      // Find next available position
      let cellIndex = null;
      for (let i = 0; i < 4; i++) {
        const row = Math.floor(i / 2);
        const col = i % 2;
        if (!occupied[row][col]) {
          cellIndex = i;
          break;
        }
      }

      // If no space available, create new page
      if (cellIndex === null) {
        pages.push(currentPage);
        currentPage = [[null, null], [null, null]];
        occupied = [[false, false], [false, false]];
        cellIndex = 0;
      }

      let row = Math.floor(cellIndex / 2);
      let col = cellIndex % 2;

      // Check if current layout fits at this position
      if (layout === "VERTICAL") {
        // Needs 2 cells vertically (same column, both rows)
        if (row === 1 || occupied[1][col]) {
          // Can't fit vertically, move to next page
          pages.push(currentPage);
          currentPage = [[null, null], [null, null]];
          occupied = [[false, false], [false, false]];
          cellIndex = 0;
          row = 0;
          col = 0;
        }

        // Occupy both cells vertically
        occupied[0][col] = true;
        occupied[1][col] = true;
        currentPage[0][col] = problem;
        currentPage[1][col] = problem;

      } else if (layout === "HORIZONTAL") {
        // Needs 2 cells horizontally (same row, both columns)
        if (col === 1 || occupied[row][1]) {
          // Can't fit horizontally, move to next page or next row
          if (row === 0 && !occupied[1][0]) {
            // Move to row 1
            cellIndex = 2;
            row = 1;
            col = 0;
          } else {
            // Move to next page
            pages.push(currentPage);
            currentPage = [[null, null], [null, null]];
            occupied = [[false, false], [false, false]];
            cellIndex = 0;
            row = 0;
            col = 0;
          }
        }

        // Occupy both cells horizontally
        occupied[row][0] = true;
        occupied[row][1] = true;
        currentPage[row][0] = problem;
        currentPage[row][1] = problem;

      } else {
        // NORMAL - occupy single cell
        occupied[row][col] = true;
        currentPage[row][col] = problem;
      }
    }

    if (selectedProblems.length > 0) {
      pages.push(currentPage);
    }

    return pages.length > 0 ? pages : [[[null, null], [null, null]]];
  };

  const gridPages = getGridPreview();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">문제지 생성</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Problem Bank */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">문제 은행</h2>

          {/* Filters */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                난이도 (복수 선택)
              </label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <label key={level} className="flex items-center gap-1 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={filterDifficulties.has(level)}
                      onChange={() => toggleDifficultyFilter(level)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span>{level}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                레이아웃 (복수 선택)
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filterLayouts.has('NORMAL')}
                    onChange={() => toggleLayoutFilter('NORMAL')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>일반</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filterLayouts.has('HORIZONTAL')}
                    onChange={() => toggleLayoutFilter('HORIZONTAL')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>가로</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={filterLayouts.has('VERTICAL')}
                    onChange={() => toggleLayoutFilter('VERTICAL')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span>세로</span>
                </label>
              </div>
            </div>

            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-2">
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
                className="input-field w-full text-sm"
                placeholder="예: 펀더멘탈, 수특..."
              />
              {showTextbookDropdown && getFilteredTextbooks().length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {getFilteredTextbooks().map((textbook) => (
                    <button
                      key={textbook}
                      type="button"
                      onClick={() => {
                        setFilterTextbook(textbook);
                        setShowTextbookDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-xs"
                    >
                      {textbook}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {problems.map((problem) => (
              <div
                key={problem.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                onClick={() => addProblem(problem)}
              >
                <img
                  src={problem.image_url}
                  alt={`Problem ${problem.id}`}
                  className="w-12 h-12 object-contain bg-white rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium font-mono text-primary-600">{problem.problem_code || `#${problem.id}`}</p>
                  <p className="text-xs text-gray-600">
                    {problem.layout_type} | 난이도: {problem.difficulty}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    addProblem(problem);
                  }}
                  className="text-primary-600 hover:text-primary-800 text-sm"
                >
                  추가
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Problems (Drag & Drop) */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            선택된 문제 ({selectedProblems.length}개)
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              문제지 제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field w-full"
              placeholder="예: 중간고사 대비 문제지"
            />
          </div>

          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={selectedProblems.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 max-h-[400px] overflow-y-auto mb-4">
                {selectedProblems.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    왼쪽에서 문제를 추가해주세요
                  </p>
                ) : (
                  selectedProblems.map((problem) => (
                    <SortableItem
                      key={problem.id}
                      id={problem.id}
                      problem={problem}
                      onRemove={() => removeProblem(problem.id)}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>

          <button
            onClick={handleGenerate}
            disabled={generating || selectedProblems.length === 0}
            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'PDF 생성 중...' : 'PDF 문제지 생성'}
          </button>

          <p className="text-xs text-gray-500 mt-2">
            * 문제를 드래그하여 순서를 변경할 수 있습니다
          </p>
        </div>

        {/* Grid Preview */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            4분할 그리드 미리보기
          </h2>

          <div className="space-y-4 max-h-[800px] overflow-y-auto">
            {gridPages.map((page, pageIndex) => (
              <div key={pageIndex} className="border-2 border-gray-300 rounded-lg p-2">
                <p className="text-xs text-gray-500 mb-2">페이지 {pageIndex + 1}</p>
                <div className="aspect-[1/1.4142] bg-white border border-gray-200 rounded">
                  <div className="grid grid-cols-2 grid-rows-2 h-full gap-1 p-1">
                    {page.map((row, rowIndex) =>
                      row.map((cell, colIndex) => {
                        const cellKey = `${rowIndex}-${colIndex}`;

                        // Check if this cell is part of a spanning layout
                        const isPartOfSpan = cell && (
                          (cell.layout_type === 'VERTICAL' && rowIndex === 1 && page[0][colIndex] === cell) ||
                          (cell.layout_type === 'HORIZONTAL' && colIndex === 1 && page[rowIndex][0] === cell)
                        );

                        if (isPartOfSpan) return null;

                        const cellClass = cell
                          ? cell.layout_type === 'VERTICAL'
                            ? 'row-span-2'
                            : cell.layout_type === 'HORIZONTAL'
                            ? 'col-span-2'
                            : ''
                          : '';

                        return (
                          <div
                            key={cellKey}
                            className={`border border-dashed border-gray-300 rounded flex items-start justify-center p-1 ${cellClass} ${
                              cell ? 'bg-blue-50' : 'bg-gray-50'
                            }`}
                          >
                            {cell ? (
                              <div className="w-full h-full flex flex-col">
                                <img
                                  src={cell.image_url}
                                  alt={`Problem ${cell.id}`}
                                  className="w-full h-auto object-contain"
                                />
                                <p className="text-[8px] text-gray-600 mt-1 text-center font-mono">
                                  {cell.problem_code || `#${cell.id}`}
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 self-center">빈 칸</p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            ))}

            {selectedProblems.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                문제를 선택하면 미리보기가 표시됩니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
