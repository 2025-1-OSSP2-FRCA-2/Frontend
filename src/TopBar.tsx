import React from 'react';
import "./TopBar.css";

interface TopBarProps {
    connected: boolean;
}

const TopBar = ({ connected }: TopBarProps) => {
    // 1. 시간 상태 선언
    const [currentTime, setCurrentTime] = React.useState(new Date());

    // 2. 1분마다 시간 갱신
    React.useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(timer);
    }, []);

    // 3. 시간 포맷팅
    const formattedTime = currentTime.toLocaleString('ko-KR', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    }).replace(/\.(?=\d{2}\.)/g, '-').replace(/\.$/, '');

    // 4. JSX에는 값만 출력
    return (
        <div className="top-bar">
            <span className={`status-dot ${connected ? "online" : "offline"}`}></span>
            <span className={`status-text ${connected ? "online" : "offline"}`}>
                연결 상태 : {connected ? "연결됨" : "연결 끊김"}
            </span>
            <span className="top-bar-time">{formattedTime}</span>
        </div>
    );
};

export default TopBar;