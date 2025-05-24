import React, { useEffect, useState, useRef } from "react";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import "./WaitingPage.css";
import { useNavigate } from "react-router-dom";

interface WaitingPageProps {
    onExit: () => void;
    connected: boolean;
}

const WaitingPage = ({ 
    onExit, 
    connected 
}: WaitingPageProps) => {
    const navigate = useNavigate();
    const [isConnected, setIsConnected] = useState(connected);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        // 사용자 정보 가져오기
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (user.role !== 'student') {
            navigate('/login');
            return;
        }

        // WebSocket 연결 설정
        wsRef.current = new WebSocket(`ws://localhost:8000/ws/student/${user.id}`);
        
        wsRef.current.onopen = () => {
            console.log('WebSocket 연결됨 (WaitingPage)');
        };

        wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('서버로부터 메시지 수신:', data);
            
            if (data.type === "teacher_connected") {
                console.log('선생님 연결됨 - 학생 페이지로 이동');
                setIsConnected(true);
                // WebSocket 연결을 StudentPage로 전달
                // navigate("/student", { state: { ws: wsRef.current } });
                
                // ✅ WebSocket 넘기지 말고 studentId만 전달
                navigate("/student", { state: { studentId: user.id } });
            }
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket 에러:', error);
        };

        wsRef.current.onclose = () => {
            console.log('WebSocket 연결 종료');
        };

        // 컴포넌트 언마운트 시 WebSocket 연결 종료 (StudentPage로 전달되지 않은 경우에만)
        return () => {
            if (wsRef.current && !isConnected) {
                wsRef.current.close();
            }
        };
    }, [navigate]); // isConnected 의존성 제거

    useEffect(() => {
        if (isConnected) {
            onExit();
        }
    }, [isConnected, onExit]);

    return (
        <div className="waiting-root">
            <TopBar connected={isConnected} />
            <div className="waiting-page">
                <div className="waiting-center">
                    <div className="waiting-title">
                        현재 <span className="bold">수업 대기 중</span> 입니다.
                    </div>
                    <div className="waiting-dots">
                        <span>●</span>
                        <span>●</span>
                        <span>●</span>
                        <span>●</span>
                        <span>●</span>
                        <span>●</span>
                        <span>●</span>
                    </div>
                    <div className="waiting-desc">잠시만 기다려주세요</div>
                </div>
            </div>
            <BottomBar
                micOn={false}
                videoOn={false}
                onToggleMic={() => {}}
                onToggleVideo={() => {}}
                onExit={onExit}
            />
        </div>
    );
};

export default WaitingPage;