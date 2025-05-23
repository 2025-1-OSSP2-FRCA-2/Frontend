import React, { useEffect, useState } from "react";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import "./ProfPage.css";
import { useNavigate } from "react-router-dom";

// 학생 데이터 인터페이스 정의
interface StudentData {
    student_id: string;
    emotion_results: {
        boredom: number;
        confusion: number;
        engagement: number;
        frustration: number;
    };
    concentration: number;
}

const ProfPage = () => {
    const navigate = useNavigate(); // 페이지 이동을 위한 훅
    const [connected, setConnected] = useState(false); // WebSocket 연결 상태
    const [students, setStudents] = useState<{ [key: string]: StudentData }>({}); // 학생 데이터 상태

    useEffect(() => {
        // 사용자 정보 확인 및 페이지 접근 제어
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role !== 'teacher') {
            navigate('/login');
            return;
        }

        let ws: WebSocket | null = null; // WebSocket 객체 초기화

        const setup = () => {
            try {
                // WebSocket 연결 설정
                ws = new WebSocket('ws://localhost:8000/ws/prof');
                
                ws.onopen = () => {
                    console.log('교수 WebSocket 연결됨');
                    setConnected(true); // 연결 상태 업데이트
                };

                ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    console.log('서버로부터 메시지 수신:', data);
                    
                    if (data.type === 'student_data') {
                        // 학생 데이터 업데이트
                        setStudents(prev => ({
                            ...prev,
                            [data.student_id]: {
                                student_id: data.student_id,
                                emotion_results: data.emotion_results,
                                concentration: data.concentration
                            }
                        }));
                    }
                };

                ws.onclose = () => {    
                    console.log('WebSocket 연결 종료');
                    setConnected(false); // 연결 상태 업데이트
                };

                ws.onerror = (error) => {
                    console.error('WebSocket 에러:', error);
                };

            } catch (error) {
                console.error('WebSocket 연결 실패:', error);
                alert('서버 연결에 실패했습니다.');
            }
        };

        setup();

        return () => {
            if (ws) {
                ws.close(); // 컴포넌트 언마운트 시 WebSocket 연결 종료
            }
        };
    }, [navigate]);

    // 로그아웃 및 페이지 이동 처리
    const handleExit = () => {
        localStorage.clear();
        navigate('/login');
    };

    // 특정 학생에게 경고 메시지 전송
    const sendWarning = (studentId: string, message: string) => {
        const ws = new WebSocket('ws://localhost:8000/ws/prof');
        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: 'warning',
                student_id: studentId,
                message: message
            }));
            ws.close();
        };
    };

    return (
        <div className="prof-root">
            <TopBar connected={connected} />
            <div className="prof-page">
                <div className="prof-center">
                    <div className="prof-title">
                        교수자 페이지
                    </div>
                    <div className="student-list">
                        {Object.values(students).map((student) => (
                            <div key={student.student_id} className="student-card">
                                <h3>학생 {student.student_id}번</h3>
                                <div className="student-status">
                                    <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></span>
                                    <span>{connected ? '연결됨' : '연결 안됨'}</span>
                                </div>
                                <p>집중도: {student.concentration}</p>
                                <div className="emotion-results">
                                    <p>지루함: {student.emotion_results.boredom}</p>
                                    <p>혼란: {student.emotion_results.confusion}</p>
                                    <p>참여: {student.emotion_results.engagement}</p>
                                    <p>좌절: {student.emotion_results.frustration}</p>
                                </div>
                                <button 
                                    onClick={() => sendWarning(student.student_id, "집중해주세요!")}
                                    className="warning-button"
                                >
                                    경고 보내기
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <BottomBar
                micOn={false}
                videoOn={false}
                onToggleMic={() => {}}
                onToggleVideo={() => {}}
                onExit={handleExit}
            />
        </div>
    );
};

export default ProfPage;