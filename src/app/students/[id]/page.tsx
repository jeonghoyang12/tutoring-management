"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  studentsApi,
  problemsApi,
  wrongAnswersApi,
  worksheetsApi,
} from "@/lib/api";
import { Student, Problem, WrongAnswer, ReviewProblem } from "@/types";

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = Number(params.id);

  const [student, setStudent] = useState<Student | null>(null);
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [todayReview, setTodayReview] = useState<ReviewProblem[]>([]);
  const [wrongAnswerAttempts, setWrongAnswerAttempts] = useState<
    Record<number, any[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [showMastered, setShowMastered] = useState(false);

  // Add wrong answer form
  const [selectedProblem, setSelectedProblem] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk registration
  const [bulkYear, setBulkYear] = useState(
    new Date().getFullYear().toString().slice(-2)
  );
  const [bulkTextbook, setBulkTextbook] = useState("");
  const [bulkChapter, setBulkChapter] = useState("");
  const [bulkSubchapter, setBulkSubchapter] = useState("");
  const [bulkNumbers, setBulkNumbers] = useState("");
  const [bulkCodes, setBulkCodes] = useState("");
  const [bulkMode, setBulkMode] = useState<"quick" | "codes">("quick");

  // Grading
  const [showGrading, setShowGrading] = useState(false);
  const [gradingMode, setGradingMode] = useState<"checkbox" | "text">("checkbox");
  const [selectedForGrading, setSelectedForGrading] = useState<Set<number>>(
    new Set()
  );
  const [gradingResult, setGradingResult] = useState<
    "correct" | "wrong" | null
  >(null);
  const [textGradingInput, setTextGradingInput] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  // Assignment - adding new problems to today's review
  const [showAddProblems, setShowAddProblems] = useState(false);
  const [additionalProblems, setAdditionalProblems] = useState<Problem[]>([]);
  const [problemSearchQuery, setProblemSearchQuery] = useState("");

  // Ungraded problems management
  const [showUngradedManagement, setShowUngradedManagement] = useState(false);
  const [ungradedProblems, setUngradedProblems] = useState<ReviewProblem[]>([]);
  const [selectedForReschedule, setSelectedForReschedule] = useState<Set<number>>(new Set());
  const [rescheduleDate, setRescheduleDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchData();
  }, [studentId, showMastered]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentData, wrongAnswersData, problemsData, reviewData] =
        await Promise.all([
          studentsApi.getById(studentId),
          wrongAnswersApi.getByStudent(
            studentId,
            showMastered ? undefined : false
          ),
          problemsApi.getAll(),
          wrongAnswersApi.getTodayReview(studentId),
        ]);

      setStudent(studentData);
      setWrongAnswers(wrongAnswersData);
      setProblems(problemsData);
      setTodayReview(reviewData);

      // Fetch attempts for each wrong answer in parallel
      const attemptsMap: Record<number, any[]> = {};
      const attemptsPromises = wrongAnswersData.map(async (wa) => {
        try {
          const attempts = await wrongAnswersApi.getAttempts(wa.id);
          return { id: wa.id, attempts };
        } catch (error) {
          console.error(
            `Failed to fetch attempts for wrong answer ${wa.id}:`,
            error
          );
          return { id: wa.id, attempts: [] };
        }
      });

      const attemptsResults = await Promise.all(attemptsPromises);
      attemptsResults.forEach(({ id, attempts }) => {
        attemptsMap[id] = attempts;
      });
      setWrongAnswerAttempts(attemptsMap);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWrongAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProblem) {
      return;
    }

    try {
      await wrongAnswersApi.create({
        student_id: studentId,
        problem_id: Number(selectedProblem),
      });
      setSelectedProblem("");
      setSearchQuery("");
      fetchData();
    } catch (error: any) {
      console.error("Failed to add wrong answer:", error);
    }
  };

  const handleToggleMastered = async (
    wrongAnswerId: number,
    currentMastered: boolean
  ) => {
    try {
      await wrongAnswersApi.toggleMastered(wrongAnswerId, !currentMastered);
      fetchData();
    } catch (error) {
      console.error("Failed to toggle mastered:", error);
    }
  };

  const handleDelete = async (wrongAnswerId: number) => {
    try {
      await wrongAnswersApi.delete(wrongAnswerId);
      fetchData();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleGenerateReviewWorksheet = async () => {
    if (todayReview.length === 0) {
      return;
    }

    try {
      const problemIds = todayReview.map((review) => review.problem.id);
      const today = new Date().toLocaleDateString("ko-KR");
      const title = `${student?.name} - ${today} 복습 문제지`;

      const result = await worksheetsApi.generate({
        title,
        problem_ids: problemIds,
      });

      // Download the PDF
      const link = document.createElement("a");
      link.href = result.pdf_url;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to generate worksheet:", error);
    }
  };

  const handleBulkRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    let problemCodes: string[] = [];

    if (bulkMode === "quick") {
      // Generate codes from textbook + numbers
      if (!bulkYear || !bulkTextbook || !bulkNumbers) {
        return;
      }

      const numbers = bulkNumbers
        .split(/[,\s\n]+/)
        .map((n) => n.trim())
        .filter((n) => n);

      problemCodes = numbers.map((num) => {
        let code = `${bulkYear}_${bulkTextbook}`;
        if (bulkChapter) code += `_${bulkChapter}`;
        if (bulkSubchapter) code += `_${bulkSubchapter}`;
        code += `_${num}`;
        return code;
      });
    } else {
      // Use directly input codes
      problemCodes = bulkCodes
        .split(/[\n]+/)
        .map((c) => c.trim())
        .filter((c) => c);
    }

    if (problemCodes.length === 0) {
      return;
    }

    try {
      const result = await wrongAnswersApi.bulkCreate(studentId, problemCodes);

      setBulkYear(new Date().getFullYear().toString().slice(-2));
      setBulkTextbook("");
      setBulkChapter("");
      setBulkSubchapter("");
      setBulkNumbers("");
      setBulkCodes("");
      fetchData();
    } catch (error) {
      console.error("Failed to bulk register:", error);
    }
  };

  const toggleGradingSelection = (wrongAnswerId: number) => {
    const newSet = new Set(selectedForGrading);
    if (newSet.has(wrongAnswerId)) {
      newSet.delete(wrongAnswerId);
    } else {
      newSet.add(wrongAnswerId);
    }
    setSelectedForGrading(newSet);
  };

  const handleBulkGrade = async (result: "correct" | "wrong") => {
    if (selectedForGrading.size === 0) return;

    try {
      await wrongAnswersApi.bulkGrade(Array.from(selectedForGrading), result);
      setSelectedForGrading(new Set());
      fetchData();
    } catch (error) {
      console.error("Failed to bulk grade:", error);
    }
  };

  const handleTextGrade = async () => {
    if (!textGradingInput.trim()) {
      return;
    }

    try {
      const result = await wrongAnswersApi.textGrade(studentId, textGradingInput);

      // Clear input
      setTextGradingInput("");
      fetchData();

      // Show success message
      alert(
        `채점 완료!\n정답: ${result.summary.correct}개\n오답: ${result.summary.wrong}개\n보류: ${result.summary.pending}개${
          result.not_found_codes.length > 0
            ? `\n\n찾을 수 없는 코드: ${result.not_found_codes.join(", ")}`
            : ""
        }${
          result.parsed_wrong_codes && result.parsed_wrong_codes.length > 0
            ? `\n\n파싱된 오답: ${result.parsed_wrong_codes.join(", ")}`
            : ""
        }${
          result.parsed_pending_codes && result.parsed_pending_codes.length > 0
            ? `\n파싱된 보류: ${result.parsed_pending_codes.join(", ")}`
            : ""
        }`
      );
    } catch (error) {
      console.error("Failed to text grade:", error);
      alert("채점 중 오류가 발생했습니다.");
    }
  };

  const getProblemById = (problemId: number) => {
    return problems.find((p) => p.id === problemId);
  };

  const toggleRowExpansion = (wrongAnswerId: number) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(wrongAnswerId)) {
      newSet.delete(wrongAnswerId);
    } else {
      newSet.add(wrongAnswerId);
    }
    setExpandedRows(newSet);
  };

  const filteredProblems = problems.filter(
    (p) =>
      p.id.toString().includes(searchQuery) ||
      p.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.topic?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addAdditionalProblem = (problem: Problem) => {
    if (!additionalProblems.find((p) => p.id === problem.id)) {
      setAdditionalProblems([...additionalProblems, problem]);
    }
  };

  const removeAdditionalProblem = (problemId: number) => {
    setAdditionalProblems(additionalProblems.filter((p) => p.id !== problemId));
  };

  const handleGenerateCombinedWorksheet = async () => {
    const reviewProblemIds = todayReview.map((r) => r.problem.id);
    const additionalProblemIds = additionalProblems.map((p) => p.id);
    const allProblemIds = [...reviewProblemIds, ...additionalProblemIds];

    if (allProblemIds.length === 0) {
      return;
    }

    try {
      const today = new Date().toLocaleDateString("ko-KR");
      const title = `${student?.name} - ${today} 과제 (복습 ${reviewProblemIds.length}개 + 신규 ${additionalProblemIds.length}개)`;

      const result = await worksheetsApi.generate({
        title,
        problem_ids: allProblemIds,
      });

      // Download the PDF
      const link = document.createElement("a");
      link.href = result.pdf_url;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to generate worksheet:", error);
    }
  };

  const searchFilteredProblems = problems.filter(
    (p) =>
      p.problem_code
        ?.toLowerCase()
        .includes(problemSearchQuery.toLowerCase()) ||
      p.textbook?.toLowerCase().includes(problemSearchQuery.toLowerCase()) ||
      p.subject?.toLowerCase().includes(problemSearchQuery.toLowerCase()) ||
      p.topic?.toLowerCase().includes(problemSearchQuery.toLowerCase())
  );

  const fetchUngradedProblems = async () => {
    try {
      const data = await wrongAnswersApi.getUngraded(studentId);
      setUngradedProblems(data);
    } catch (error) {
      console.error("Failed to fetch ungraded problems:", error);
    }
  };

  const toggleRescheduleSelection = (wrongAnswerId: number) => {
    const newSet = new Set(selectedForReschedule);
    if (newSet.has(wrongAnswerId)) {
      newSet.delete(wrongAnswerId);
    } else {
      newSet.add(wrongAnswerId);
    }
    setSelectedForReschedule(newSet);
  };

  const handleBulkReschedule = async () => {
    if (selectedForReschedule.size === 0) return;

    try {
      await wrongAnswersApi.bulkReschedule(
        Array.from(selectedForReschedule),
        rescheduleDate
      );
      setSelectedForReschedule(new Set());
      fetchUngradedProblems();
      fetchData();
    } catch (error) {
      console.error("Failed to bulk reschedule:", error);
    }
  };

  const handleShowUngradedManagement = async () => {
    if (!showUngradedManagement) {
      await fetchUngradedProblems();
    }
    setShowUngradedManagement(!showUngradedManagement);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl text-gray-500">학생을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/students")}
            className="text-primary-600 hover:text-primary-800 mb-2"
          >
            ← 학생 목록으로
          </button>
          <h1 className="text-3xl font-bold">{student.name}</h1>
          <p className="text-gray-600">
            학년: {student.grade || "-"} | 등록일:{" "}
            {new Date(student.enrollment_date).toLocaleDateString("ko-KR")}
          </p>
        </div>
      </div>

      {/* Today's Assignment */}
      <div className="card bg-yellow-50 border-yellow-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-yellow-800">
            📅 오늘의 과제 (복습 {todayReview.length}개 + 신규{" "}
            {additionalProblems.length}개)
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddProblems(!showAddProblems)}
              className={`px-4 py-2 rounded ${
                showAddProblems
                  ? "bg-green-600 text-white"
                  : "bg-white text-green-600 border border-green-600"
              }`}
            >
              {showAddProblems ? "닫기" : "➕ 신규 문제 추가"}
            </button>
            {todayReview.length > 0 && (
              <button
                onClick={() => setShowGrading(!showGrading)}
                className={`px-4 py-2 rounded ${
                  showGrading
                    ? "bg-blue-600 text-white"
                    : "bg-white text-blue-600 border border-blue-600"
                }`}
              >
                {showGrading ? "채점 취소" : "📝 채점하기"}
              </button>
            )}
            <button
              onClick={handleGenerateCombinedWorksheet}
              disabled={
                todayReview.length === 0 && additionalProblems.length === 0
              }
              className="btn-primary bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50"
            >
              📄 통합 문제지 생성
            </button>
          </div>
        </div>

        {/* Add Problems Section */}
        {showAddProblems && (
          <div className="mb-4 p-4 bg-white rounded-lg border-2 border-green-300">
            <h3 className="text-md font-semibold mb-3">문제 은행에서 선택</h3>
            <input
              type="text"
              value={problemSearchQuery}
              onChange={(e) => setProblemSearchQuery(e.target.value)}
              placeholder="문제 코드, 교재명으로 검색..."
              className="input-field w-full mb-3"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
              {searchFilteredProblems.slice(0, 20).map((problem) => (
                <div
                  key={problem.id}
                  className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-green-500 cursor-pointer"
                  onClick={() => addAdditionalProblem(problem)}
                >
                  <img
                    src={problem.image_url}
                    alt={`Problem ${problem.id}`}
                    className="w-full h-24 object-contain bg-white rounded mb-2"
                  />
                  <p className="text-xs font-mono font-semibold text-primary-600">
                    {problem.problem_code || `#${problem.id}`}
                  </p>
                  <p className="text-xs text-gray-600">
                    난이도: {problem.difficulty}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grading Section */}
        {showGrading && todayReview.length > 0 && (
          <div className="mb-4 p-4 bg-white rounded-lg border-2 border-blue-300">
            {/* Mode Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setGradingMode("checkbox")}
                className={`px-4 py-2 rounded ${
                  gradingMode === "checkbox"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                ☑️ 체크박스 모드
              </button>
              <button
                onClick={() => setGradingMode("text")}
                className={`px-4 py-2 rounded ${
                  gradingMode === "text"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200"
                }`}
              >
                📝 텍스트 모드
              </button>
            </div>

            {gradingMode === "checkbox" ? (
              <>
                <p className="text-sm font-medium mb-2">
                  선택: {selectedForGrading.size}개 문제
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkGrade("correct")}
                    disabled={selectedForGrading.size === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    ✓ 정답 처리
                  </button>
                  <button
                    onClick={() => handleBulkGrade("wrong")}
                    disabled={selectedForGrading.size === 0}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                  >
                    ✗ 오답 처리
                  </button>
                  <button
                    onClick={() =>
                      setSelectedForGrading(
                        new Set(todayReview.map((r) => r.wrong_answer.id))
                      )
                    }
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    전체 선택
                  </button>
                  <button
                    onClick={() => setSelectedForGrading(new Set())}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    선택 해제
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-700 mb-3">
                  학생이 보낸 메시지를 그대로 붙여넣으세요. 나머지는 자동으로 정답 처리됩니다.
                </p>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 mb-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">예시:</p>
                  <pre className="text-xs text-gray-600">
오답 23빡사 1회 3 5 8 15
보류 23빡사 1회 20 22</pre>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    학생 메시지
                  </label>
                  <textarea
                    value={textGradingInput}
                    onChange={(e) => setTextGradingInput(e.target.value)}
                    className="input-field w-full h-32"
                    placeholder="오답 23빡사 1회 3 5 8 15
보류 23빡사 1회 20 22"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    "오답"으로 시작하는 줄: 오답 처리 / "보류"로 시작하는 줄: 채점 안함 / 나머지: 자동 정답 처리
                  </p>
                </div>
                <button
                  onClick={handleTextGrade}
                  className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                >
                  📝 텍스트 채점 실행
                </button>
              </div>
            )}
          </div>
        )}

        {/* Problems Display */}
        <div className="space-y-4">
          {/* Review Problems */}
          {todayReview.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-700 mb-2">
                🔄 복습 문제 ({todayReview.length}개)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayReview.map(
                  ({ wrong_answer, problem, latest_attempt }) => (
                    <div
                      key={wrong_answer.id}
                      className={`bg-white p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        showGrading && selectedForGrading.has(wrong_answer.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-orange-300"
                      }`}
                      onClick={() =>
                        showGrading && toggleGradingSelection(wrong_answer.id)
                      }
                    >
                      {showGrading && (
                        <div className="mb-2">
                          <input
                            type="checkbox"
                            checked={selectedForGrading.has(wrong_answer.id)}
                            onChange={() =>
                              toggleGradingSelection(wrong_answer.id)
                            }
                            className="w-4 h-4"
                          />
                        </div>
                      )}
                      <img
                        src={problem.image_url}
                        alt={`Problem ${problem.id}`}
                        className="w-full h-32 object-contain bg-gray-100 rounded mb-2"
                      />
                      <p className="text-xs font-mono font-semibold text-primary-600 mb-1">
                        {problem.problem_code || `#${problem.id}`}
                      </p>
                      <p className="text-xs text-gray-600">
                        시도: {wrong_answer.retry_count}회 | 연속 정답:{" "}
                        {wrong_answer.consecutive_correct}회
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Additional Problems */}
          {additionalProblems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-2">
                ✨ 신규 문제 ({additionalProblems.length}개)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {additionalProblems.map((problem) => (
                  <div
                    key={problem.id}
                    className="bg-white p-4 rounded-lg border-2 border-green-300 relative"
                  >
                    <button
                      onClick={() => removeAdditionalProblem(problem.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                    <img
                      src={problem.image_url}
                      alt={`Problem ${problem.id}`}
                      className="w-full h-32 object-contain bg-gray-100 rounded mb-2"
                    />
                    <p className="text-xs font-mono font-semibold text-primary-600 mb-1">
                      {problem.problem_code || `#${problem.id}`}
                    </p>
                    <p className="text-xs text-gray-600">
                      난이도: {problem.difficulty}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todayReview.length === 0 && additionalProblems.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              복습할 문제가 없습니다. "신규 문제 추가" 버튼을 눌러 과제를
              만들어보세요.
            </p>
          )}
        </div>
      </div>

      {/* Ungraded Problems Management */}
      <div className="card bg-purple-50 border-purple-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-purple-800">
            🔄 미처리 문제 관리
          </h2>
          <button
            onClick={handleShowUngradedManagement}
            className={`px-4 py-2 rounded ${
              showUngradedManagement
                ? "bg-purple-600 text-white"
                : "bg-white text-purple-600 border border-purple-600"
            }`}
          >
            {showUngradedManagement ? "닫기" : "미처리 문제 보기"}
          </button>
        </div>

        {showUngradedManagement && (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              채점되지 않은 문제들을 선택하여 특정 날짜로 일괄 재등록할 수 있습니다.
              밀린 과제를 초기화하고 싶을 때 사용하세요.
            </p>

            {ungradedProblems.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                미처리 문제가 없습니다.
              </p>
            ) : (
              <>
                <div className="mb-4 p-4 bg-white rounded-lg border-2 border-purple-300">
                  <p className="text-sm font-medium mb-2">
                    선택: {selectedForReschedule.size}개 문제 | 전체: {ungradedProblems.length}개
                  </p>
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium text-gray-700">
                      재등록 날짜:
                    </label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="input-field"
                    />
                    <button
                      onClick={handleBulkReschedule}
                      disabled={selectedForReschedule.size === 0}
                      className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      선택한 문제 재등록
                    </button>
                    <button
                      onClick={() =>
                        setSelectedForReschedule(
                          new Set(ungradedProblems.map((p) => p.wrong_answer.id))
                        )
                      }
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={() => setSelectedForReschedule(new Set())}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                    >
                      선택 해제
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {ungradedProblems.map(({ wrong_answer, problem, latest_attempt }) => (
                    <div
                      key={wrong_answer.id}
                      className={`bg-white p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedForReschedule.has(wrong_answer.id)
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-300"
                      }`}
                      onClick={() => toggleRescheduleSelection(wrong_answer.id)}
                    >
                      <div className="mb-2">
                        <input
                          type="checkbox"
                          checked={selectedForReschedule.has(wrong_answer.id)}
                          onChange={() => toggleRescheduleSelection(wrong_answer.id)}
                          className="w-4 h-4"
                        />
                      </div>
                      <img
                        src={problem.image_url}
                        alt={`Problem ${problem.id}`}
                        className="w-full h-24 object-contain bg-gray-100 rounded mb-2"
                      />
                      <p className="text-xs font-mono font-semibold text-primary-600 mb-1">
                        {problem.problem_code || `#${problem.id}`}
                      </p>
                      <p className="text-xs text-gray-600">
                        예정일: {new Date(latest_attempt.attempt_date).toISOString().split('T')[0]}
                      </p>
                      <p className="text-xs text-gray-500">
                        시도: {wrong_answer.retry_count}회
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Add Wrong Answer - Bulk Registration */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">오답 일괄 등록</h2>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setBulkMode("quick")}
            className={`px-4 py-2 rounded ${
              bulkMode === "quick" ? "bg-primary-600 text-white" : "bg-gray-200"
            }`}
          >
            📝 빠른 등록
          </button>
          <button
            onClick={() => setBulkMode("codes")}
            className={`px-4 py-2 rounded ${
              bulkMode === "codes" ? "bg-primary-600 text-white" : "bg-gray-200"
            }`}
          >
            📋 코드 입력
          </button>
        </div>

        <form onSubmit={handleBulkRegister} className="space-y-4">
          {bulkMode === "quick" ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    연도 *
                  </label>
                  <input
                    type="text"
                    value={bulkYear}
                    onChange={(e) => setBulkYear(e.target.value)}
                    className="input-field w-full"
                    placeholder="25, 26..."
                    maxLength={2}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    교재명 *
                  </label>
                  <input
                    type="text"
                    value={bulkTextbook}
                    onChange={(e) => setBulkTextbook(e.target.value)}
                    className="input-field w-full"
                    placeholder="펀더멘탈, 수특..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    대단원 (선택)
                  </label>
                  <input
                    type="text"
                    value={bulkChapter}
                    onChange={(e) => setBulkChapter(e.target.value)}
                    className="input-field w-full"
                    placeholder="수1, 수2..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    소단원 (선택)
                  </label>
                  <input
                    type="text"
                    value={bulkSubchapter}
                    onChange={(e) => setBulkSubchapter(e.target.value)}
                    className="input-field w-full"
                    placeholder="1, 2, 3..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문제 번호 * (쉼표, 공백, 엔터로 구분)
                </label>
                <textarea
                  value={bulkNumbers}
                  onChange={(e) => setBulkNumbers(e.target.value)}
                  className="input-field w-full h-24"
                  placeholder="13, 14, 27, 28 또는
13
14
27
28"
                  required
                />
              </div>

              {bulkYear && bulkTextbook && bulkNumbers && (
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    생성될 코드 미리보기:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {bulkNumbers
                      .split(/[,\s\n]+/)
                      .map((n) => n.trim())
                      .filter((n) => n)
                      .slice(0, 5)
                      .map((num, idx) => {
                        let code = `${bulkYear}_${bulkTextbook}`;
                        if (bulkChapter) code += `_${bulkChapter}`;
                        if (bulkSubchapter) code += `_${bulkSubchapter}`;
                        code += `_${num}`;
                        return (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-mono rounded"
                          >
                            {code}
                          </span>
                        );
                      })}
                    {bulkNumbers.split(/[,\s\n]+/).filter((n) => n.trim())
                      .length > 5 && (
                      <span className="text-xs text-gray-500">
                        ... 외{" "}
                        {bulkNumbers.split(/[,\s\n]+/).filter((n) => n.trim())
                          .length - 5}
                        개
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  문제 코드 입력 (한 줄에 하나씩)
                </label>
                <textarea
                  value={bulkCodes}
                  onChange={(e) => setBulkCodes(e.target.value)}
                  className="input-field w-full h-32"
                  placeholder="26_펀더멘탈_수1_2_13
26_펀더멘탈_수1_2_14
26_수특_3_15"
                  required
                />
              </div>

              {bulkCodes && (
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    {bulkCodes.split("\n").filter((c) => c.trim()).length}개
                    문제 등록 예정
                  </p>
                </div>
              )}
            </>
          )}

          <button type="submit" className="btn-primary w-full">
            일괄 등록
          </button>
        </form>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-blue-50">
          <h3 className="text-sm font-medium text-gray-700">전체 오답</h3>
          <p className="text-3xl font-bold text-blue-600">
            {wrongAnswers.length}개
          </p>
        </div>
        <div className="card bg-green-50">
          <h3 className="text-sm font-medium text-gray-700">마스터</h3>
          <p className="text-3xl font-bold text-green-600">
            {wrongAnswers.filter((wa) => wa.mastered).length}개
          </p>
        </div>
        <div className="card bg-yellow-50">
          <h3 className="text-sm font-medium text-gray-700">진행 중</h3>
          <p className="text-3xl font-bold text-yellow-600">
            {wrongAnswers.filter((wa) => !wa.mastered).length}개
          </p>
        </div>
      </div>

      {/* Wrong Answers List */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">오답 목록</h2>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showMastered}
              onChange={(e) => setShowMastered(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">마스터한 문제 표시</span>
          </label>
        </div>

        {wrongAnswers.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            등록된 오답이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    문제
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    난이도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    마지막 시도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    다음 시도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {wrongAnswers.map((wa) => {
                  const problem = getProblemById(wa.problem_id);
                  const attempts = wrongAnswerAttempts[wa.id] || [];
                  const isExpanded = expandedRows.has(wa.id);

                  // Sort attempts by attempt_number
                  const sortedAttempts = [...attempts].sort(
                    (a, b) => a.attempt_number - b.attempt_number
                  );

                  // Find the latest GRADED attempt (result !== null)
                  const gradedAttempts = sortedAttempts.filter(
                    (a) => a.result !== null
                  );
                  const latestGradedAttempt =
                    gradedAttempts.length > 0
                      ? gradedAttempts[gradedAttempts.length - 1]
                      : null;

                  // If no graded attempts, use the first ungraded attempt as "last attempt"
                  const latestAttempt =
                    latestGradedAttempt ||
                    (sortedAttempts.length > 0 ? sortedAttempts[0] : null);

                  // Find the next ungraded attempt (one with result === null, but not the first one if it's ungraded)
                  const nextAttempt = sortedAttempts.find(
                    (a) =>
                      a.result === null &&
                      (latestGradedAttempt
                        ? a.attempt_number > latestGradedAttempt.attempt_number
                        : a.attempt_number > 1)
                  );

                  return (
                    <>
                      <tr
                        key={wa.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleRowExpansion(wa.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <button className="text-gray-400 hover:text-gray-600">
                              {isExpanded ? "▼" : "▶"}
                            </button>
                            {problem && (
                              <img
                                src={problem.image_url}
                                alt={`Problem ${problem.id}`}
                                className="w-16 h-16 object-contain bg-gray-100 rounded"
                              />
                            )}
                            <div>
                              <p className="text-sm font-medium font-mono text-primary-600">
                                {problem?.problem_code || `#${wa.problem_id}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {problem?.difficulty || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {latestAttempt ? (
                            <span
                              className={`${
                                latestAttempt.result === "correct"
                                  ? "text-green-600 font-semibold"
                                  : latestAttempt.result === "wrong"
                                  ? "text-red-600 font-semibold"
                                  : "text-gray-700"
                              }`}
                            >
                              {new Date(
                                latestAttempt.graded_date ||
                                  latestAttempt.attempt_date
                              ).toISOString().split('T')[0]}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {nextAttempt ? (
                            <span className="text-gray-700">
                              {new Date(
                                nextAttempt.attempt_date
                              ).toISOString().split('T')[0]}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full cursor-pointer ${
                              wa.mastered
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleMastered(wa.id, wa.mastered);
                            }}
                          >
                            {wa.mastered ? "✓ 마스터" : "진행 중"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(wa.id);
                            }}
                            className="text-red-600 hover:text-red-800"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${wa.id}-details`}>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-2">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                시도 이력
                              </h4>
                              <div className="flex flex-wrap gap-3">
                                {attempts.map((attempt) => (
                                  <div
                                    key={attempt.id}
                                    className={`px-4 py-2 rounded-lg border-2 ${
                                      attempt.result === "correct"
                                        ? "border-green-500 bg-green-50"
                                        : attempt.result === "wrong"
                                        ? "border-red-500 bg-red-50"
                                        : "border-gray-300 bg-white"
                                    }`}
                                  >
                                    <div className="text-xs font-semibold text-gray-700">
                                      {attempt.attempt_number}회
                                    </div>
                                    <div
                                      className={`text-sm font-medium ${
                                        attempt.result === "correct"
                                          ? "text-green-600"
                                          : attempt.result === "wrong"
                                          ? "text-red-600"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {new Date(
                                        attempt.graded_date ||
                                          attempt.attempt_date
                                      ).toISOString().split('T')[0]}
                                    </div>
                                    {attempt.result && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {attempt.result === "correct"
                                          ? "✓ 정답"
                                          : "✗ 오답"}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
