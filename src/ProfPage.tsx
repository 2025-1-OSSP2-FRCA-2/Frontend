import React from "react";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import "./ProfPage.css";
import { useNavigate } from "react-router-dom";

interface ProfPageProps {
    onExit: () => void;
    connected: boolean;
}

const ProfPage = ({ 
    onExit, 
    connected 
}: ProfPageProps) => {
    
    const navigate = useNavigate();

    React.useEffect(() => {
        if (connected) {
            onExit();
            navigate("/student");
        }
    }, [connected, navigate]);

    return (
        <div>
            <TopBar connected={connected} />
            <div className="prof-page-content">
                나중에 구현
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

export default ProfPage;



