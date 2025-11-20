export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">문제 은행</h3>
          <p className="text-3xl font-bold text-primary-600">-</p>
          <p className="text-sm text-gray-500 mt-2">전체 문제 수</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">학생</h3>
          <p className="text-3xl font-bold text-primary-600">-</p>
          <p className="text-sm text-gray-500 mt-2">전체 학생 수</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">과제</h3>
          <p className="text-3xl font-bold text-primary-600">-</p>
          <p className="text-sm text-gray-500 mt-2">진행 중인 과제</p>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">문제지</h3>
          <p className="text-3xl font-bold text-primary-600">-</p>
          <p className="text-sm text-gray-500 mt-2">생성된 문제지 수</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-semibold mb-4">빠른 시작</h3>
          <div className="space-y-3">
            <a href="/problems" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-primary-600">문제 업로드</h4>
              <p className="text-sm text-gray-600">새로운 문제 이미지 업로드 및 자동 분류</p>
            </a>
            <a href="/worksheets" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-primary-600">문제지 생성</h4>
              <p className="text-sm text-gray-600">4분할 그리드로 PDF 문제지 만들기</p>
            </a>
            <a href="/students" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <h4 className="font-semibold text-primary-600">학생 등록</h4>
              <p className="text-sm text-gray-600">새로운 학생 추가 및 관리</p>
            </a>
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-semibold mb-4">시스템 정보</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">이미지 자동 분류</span>
              <span className="text-green-600 font-semibold">활성화</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">PDF 생성</span>
              <span className="text-green-600 font-semibold">정상</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">클라우드 스토리지</span>
              <span className="text-green-600 font-semibold">연결됨</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
