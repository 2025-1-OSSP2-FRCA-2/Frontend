// 필요한 React 훅과 컴포넌트, 스타일, 이미지 등을 import
import React, { useEffect, useRef, useState, useLayoutEffect } from "react";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import "./ProfPage.css";
import { useNavigate } from "react-router-dom";
import alertIcon from "./assets/alert_icon.svg";
import checkIcon from "./assets/approved.svg";
import FlagImage from "./assets/flag-icon.svg";

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

// 최대 학생 수 상수 정의
const MAX_STUDENTS = 3;

// 상태에 따른 테두리 색상 정의
const borderColors: Record<string, string> = {
    low: "#A42E27",
    normal: "#AD8657",
    good: "#588051",
};

// 집중도에 따른 상태 반환 함수
const getStatus = (concentration: number) => {
    if (concentration < 40) return "low";
    if (concentration < 70) return "normal";
    return "good";
};

// ProfPage 컴포넌트 정의
const ProfPage = () => {
    const navigate = useNavigate(); // 페이지 이동을 위한 훅
    const [connected, setConnected] = useState(false); // 연결 상태
    const [students, setStudents] = useState<{ [key: string]: StudentData }>({}); // 학생 데이터 상태
    const [alertStates, setAlertStates] = useState<{ [studentId: string]: boolean }>({}); // 경고 상태
    const [visibleAlertStates, setVisibleAlertStates] = useState<{ [studentId: string]: boolean }>({}); // 경고 표시 상태
    const [micOn, setMicOn] = useState(false); // 마이크 상태
    const [videoOn, setVideoOn] = useState(false); // 비디오 상태
    const profVideoRef = useRef<HTMLVideoElement>(null); // 교수 비디오 ref
    const wsRef = useRef<WebSocket | null>(null); // WebSocket ref
    const streamRef = useRef<MediaStream | null>(null); // 미디어 스트림 ref
    const rtcWsRef = useRef<WebSocket | null>(null); // WebRTC WebSocket ref
    const pcMapRef = useRef<{ [id: string]: RTCPeerConnection }>({}); // PeerConnection 맵 ref
    const [studentStreams, setStudentStreams] = useState<{ [id: string]: MediaStream }>({}); // 학생 스트림 상태
    const videoRefs = useRef<{ [id: string]: HTMLVideoElement | null }>({}); // 비디오 요소 ref
    const streamsRef = useRef<{ [id: string]: MediaStream }>({});  // 스트림 참조를 위한 ref 추가

    // 스트림 업데이트를 위한 함수
    const updateStudentStream = (studentId: string, stream: MediaStream) => {
        if (streamsRef.current[studentId] !== stream) {
            streamsRef.current[studentId] = stream;
            setStudentStreams(prev => {
                if (prev[studentId] === stream) return prev;
                return { ...prev, [studentId]: stream };
            });
        }
    };

    // 학생 스트림이 변경될 때마다 비디오 요소에 스트림 설정
    useLayoutEffect(() => {
        Object.entries(streamsRef.current).forEach(([studentId, stream]) => {
            const videoEl = videoRefs.current[studentId];
            if (videoEl && videoEl.srcObject !== stream) {
                videoEl.srcObject = stream;
            }
        });
    }, [studentStreams]);

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

    // 컴포넌트 마운트 시 WebSocket 연결 설정
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

    // WebRTC 연결 설정
    useEffect(() => {
        rtcWsRef.current = new WebSocket('ws://localhost:8000/ws/webrtc/prof');
        rtcWsRef.current.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "offer" && data.from_student_id) {
                const studentId = data.from_student_id;
                
                // 기존 PeerConnection이 있다면 닫기
                if (pcMapRef.current[studentId]) {
                    pcMapRef.current[studentId].close();
                    delete pcMapRef.current[studentId];
                }

                // 새로운 PeerConnection 생성
                const pc = new RTCPeerConnection({ 
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] 
                });
                
                pc.ontrack = (event) => {
                    console.log('[강사] ontrack 호출:', studentId, event.streams[0]);
                    updateStudentStream(studentId, event.streams[0]);
                };

                pc.onicecandidate = (event) => {
                    if (event.candidate && rtcWsRef.current?.readyState === WebSocket.OPEN) {
                        rtcWsRef.current.send(JSON.stringify({
                            type: "candidate",
                            candidate: event.candidate,
                            to_student_id: studentId
                        }));
                    }
                };

                // PeerConnection을 Map에 저장
                pcMapRef.current[studentId] = pc;

                try {
                    await pc.setRemoteDescription(data.sdp);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    
                    if (rtcWsRef.current?.readyState === WebSocket.OPEN) {
                        rtcWsRef.current.send(JSON.stringify({
                            type: "answer",
                            sdp: answer,
                            to_student_id: studentId
                        }));
                    }
                } catch (error) {
                    console.error('Error handling offer:', error);
                    pc.close();
                    delete pcMapRef.current[studentId];
                }
            }
            
            if (data.type === "candidate" && data.from_student_id) {
                const pc = pcMapRef.current[data.from_student_id];
                if (pc && pc.signalingState !== 'closed') {
                    try {
                        await pc.addIceCandidate(data.candidate);
                    } catch (error) {
                        console.error('Error adding ICE candidate:', error);
                    }
                }
            }
        };

        // 컴포넌트 언마운트 시 WebRTC 연결 정리
        return () => {
            rtcWsRef.current?.close();
            Object.values(pcMapRef.current).forEach(pc => pc.close());
            pcMapRef.current = {};  // Map 초기화
        };
    }, []);

    // 비디오 ref 설정을 위한 함수
    const setVideoRef = (studentId: string, el: HTMLVideoElement | null) => {
        if (el) {
            videoRefs.current[studentId] = el;
            const stream = streamsRef.current[studentId];
            if (stream && el.srcObject !== stream) {
                el.srcObject = stream;
            }
        }
    };

    // 로그아웃 및 페이지 이동 함수
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

    // 컴포넌트 언마운트 시 정리
    useEffect(() => {
        return () => {
            Object.values(streamsRef.current).forEach(stream => {
                stream.getTracks().forEach(track => track.stop());
            });
            streamsRef.current = {};
        };
    }, []);

    // 컴포넌트 렌더링
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
                                            <video
                                                key={student.student_id}
                                                ref={el => setVideoRef(student.student_id, el)}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="student-video"
                                            />
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