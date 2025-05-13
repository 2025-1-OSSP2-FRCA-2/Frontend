import React from 'react';
import "./TopBar.css";

interface TopBarProps {
    connected: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ connected }) => {
    return (
        <div className="top-bar">
            <span className={`status-dot ${connected ? "online" : "offline"}`}></span>
            <span className="status-text">
                연결 상태 : {connected ? "연결됨" : "연결 끊김"}
            </span>
        </div>
    );
};

export default TopBar;