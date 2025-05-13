import React from "react";
import "./BottomBar.css"
import videoOffImage from "./assets/video_off.svg"
import videoOnImage from "./assets/video_on.svg"
import micOffImage from "./assets/mic_off.svg"
import micOnImage from "./assets/mic_on.svg"
import exitImage from "./assets/종료 버튼.svg"

interface BottomBarProps {
    micOn: boolean;
    videoOn: boolean;
    onToggleMic: () => void;
    onToggleVideo: () => void;
    onExit: () => void;
}

const BottomBar: React.FC<BottomBarProps> = ({
    micOn,
    videoOn,
    onToggleMic,
    onToggleVideo,
    onExit,
}) => {
    return (
        <div className="bottom-bar">
            <div className="controls">
                <div className="control-mic">
                    <button onClick={onToggleMic} className="icon-btn">
                            {/* 마이크 아이콘 (on/off)*/}
                        <img src={micOn ? micOnImage : micOffImage} alt="mic" />
                    </button>
                    <div className="mic-text">{micOn ? "Mute" : "Unmute"}</div>
                </div>
                    
                <div className="control-video">
                    <button onClick={onToggleVideo} className="icon-btn">
                        {/* 비디오 아이콘 (on/off)*/}
                        <img src={videoOn ? videoOnImage : videoOffImage} alt="video" />
                    </button>
                    <div className="video-text">{videoOn ? "Stop Video" : "Start Video"}</div>
                </div> 
            </div>
            

            <div className="control-exit">        
                <button className="exit-btn" onClick={onExit}>
                    <img src={exitImage} alt="exit" />
                </button>
            </div>
        </div>
    );
};

export default BottomBar;