import React from "react";
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

    React.useEffect(() => {
        if (connected) {
            onExit();
            navigate("/student");
        }
    }, [connected, navigate]);

    return (
        <div className="waiting-page">
            <TopBar connected={connected} />
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



