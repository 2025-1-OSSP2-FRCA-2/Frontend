import React, { useEffect, useRef, useState } from "react";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import "./ProfPage.css";
import { useNavigate } from "react-router-dom";
import alertIcon from "./assets/alert_icon.svg";
import checkIcon from "./assets/approved.svg";
import FlagImage from "./assets/flag-icon.svg";
import studentImage from "./assets/student.svg";

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

const MAX_STUDENTS = 3;

const borderColors: Record<string, string> = {
    low: "#A42E27",
    normal: "#AD8657",
    good: "#588051",
};

const getStatus = (concentration: number) => {
    if (concentration < 40) return "low";
    if (concentration < 70) return "normal";
    return "good";
};

const ProfPage = () => {
    const navigate = useNavigate();
    const [connected, setConnected] = useState(false);
    const [students, setStudents] = useState<{ [key: string]: StudentData }>({});
    const [alertStates, setAlertStates] = useState<{ [studentId: string]: boolean }>({});
    const [visibleAlertStates, setVisibleAlertStates] = useState<{ [studentId: string]: boolean }>({});
    const [micOn, setMicOn] = useState(false);
    const [videoOn, setVideoOn] = useState(false);
    const profVideoRef = useRef<HTMLVideoElement>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // 웹캠 설정 함수
    const setupWebcam = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true,
                audio: false 
            });
            if (profVideoRef.current) {
                profVideoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
        } catch (error) {
            console.error('웹캠 접근 오류:', error);
        }
    };

    // 웹캠 토글 함수
    const toggleVideo = () => {
        if (videoOn) {
            // 웹캠 끄기
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (profVideoRef.current) {
                profVideoRef.current.srcObject = null;
            }
        } else {
            // 웹캠 켜기
            setupWebcam();
        }
        setVideoOn(prev => !prev);
    };

    useEffect(() => {
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (user.role !== 'teacher') {
            navigate('/login');
            return;
        }

        wsRef.current = new WebSocket('ws://localhost:8000/ws/prof');
        wsRef.current.onopen = () => setConnected(true);
        wsRef.current.onclose = () => setConnected(false);
        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'student_data') {
                setStudents(prev => ({
                    ...prev,
                    [data.student_id]: {
                        student_id: data.student_id,
                        emotion_results: data.emotion_results,
                        concentration: data.concentration
                    }
                }));
                // 집중도 경고 조건 예시 (예: concentration < 40)
                if (data.concentration < 40) {
                    setVisibleAlertStates(prev => ({ ...prev, [data.student_id]: true }));
                }
            }
            // 혹시 서버에서 type: 'warning' 메시지를 보내는 경우
            if (data.type === 'warning' && data.student_id) {
                setVisibleAlertStates(prev => ({ ...prev, [data.student_id]: true }));
            }
        };

        // 컴포넌트 언마운트 시 웹캠 정리
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [navigate]);

    const handleExit = () => {
        sessionStorage.clear();
        navigate('/login');
    };

    // 경고 전송 (기존 WebSocket 재사용)
    const sendWarning = (studentId: string, message: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'warning',
                student_id: studentId,
                message: message
            }));
            setAlertStates(prev => ({ ...prev, [studentId]: true }));
            setVisibleAlertStates(prev => ({ ...prev, [studentId]: true }));
            setTimeout(() => setAlertStates(prev => ({ ...prev, [studentId]: false })), 3000);
        } else {
            alert('서버와의 연결이 끊어졌습니다. 새로고침 해주세요.');
        }
    };

    // 알림 X 버튼 클릭 시 해당 alert-box 숨김
    const handleCloseAlert = (studentId: string) => {
        setVisibleAlertStates(prev => ({ ...prev, [studentId]: false }));
    };

    // 학생 배열(빈 칸 포함, 최대 3명)
    const studentArr = Array.from({ length: MAX_STUDENTS }).map((_, idx) => {
        const student = Object.values(students)[idx];
        return student || null;
    });

    return (
        <div className="prof-root">
            <TopBar connected={connected} />
            <div className="prof-meeting-page">
                <div className="left-panel">
                    {/* 상단 학생 웹캠 */}
                    <div className="students-row">
                        {studentArr.map((student, idx) => {
                            const status = student ? getStatus(student.concentration) : "normal";
                            return (
                                <div
                                    className="student-box"
                                    key={idx}
                                    style={{
                                        border: `3px solid ${borderColors[status]}`,
                                        background: status === "low" ? "#2d2e30" : "#23272f",
                                        width: '260px',
                                        height: '150px',
                                    }}
                                >
                                    {student ? (
                                        <>
                                            <div className="student-label">{`(Student ${idx + 1} 칸)`}</div>
                                            <div style={{marginTop: 8, fontWeight: 600, color: "#fff"}}>
                                                집중도: {student.concentration}
                                            </div>
                                            {status === "low" && (
                                                <img src={alertIcon} alt="주의 필요" className="student-alert-icon" />
                                            )}
                                        </>
                                    ) : (
                                        <div className="student-label">{`(Student ${idx + 1} 칸)`}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {/* 아래 교수 수업화면 */}
                    <div className="lecture-screen" style={{ width: '800px', height: '520px' }}>
                        <video 
                            ref={profVideoRef} 
                            autoPlay 
                            playsInline
                            muted
                            className="prof-video" 
                        />
                        <div className="prof-label">(수업 화면)</div>
                    </div>
                </div>
                {/* 오른쪽 경고/알림 패널 */}
                <div className="right-panel">
                    {studentArr.map((student, idx) =>
                        student && visibleAlertStates[student.student_id] !== false ? (
                            <div className={`alert-box ${alertStates[student.student_id] ? 'green' : 'red'}`} key={student.student_id}>
                                <div className="alert-header">
                                    <div className="FlagBox">
                                        <img
                                            src={alertStates[student.student_id] ? checkIcon : FlagImage}
                                            alt={alertStates[student.student_id] ? "완료" : "경고"}
                                            className="alert-icon"
                                        />
                                        <span className="alert-student">{`Student ${idx + 1}`}</span>
                                        {!alertStates[student.student_id] && (
                                            <button className="close-button" onClick={() => handleCloseAlert(student.student_id)}>✕</button>
                                        )}
                                    </div>
                                </div>
                                <div className="alert-message">
                                    <div className="alert-title">{alertStates[student.student_id] ? "경고 전송 완료" : "집중도 주의 단계"}</div>
                                    <div className="alert-sub">{alertStates[student.student_id] ? "경고가 전송되었습니다." : "클릭하여 경고를 보내세요."}</div>
                                </div>
                                {!alertStates[student.student_id] && (
                                    <button
                                        className="warning-button"
                                        onClick={() => sendWarning(student.student_id, "집중해주세요!")}
                                    >
                                        경고 보내기
                                    </button>
                                )}
                            </div>
                        ) : null
                    )}
                </div>
            </div>
            <BottomBar
                micOn={micOn}
                videoOn={videoOn}
                onToggleMic={() => setMicOn((prev) => !prev)}
                onToggleVideo={toggleVideo}
                onExit={handleExit}
            />
        </div>
    );
};

export default ProfPage;