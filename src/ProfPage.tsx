import React, { useEffect, useRef, useState } from "react";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import "./ProfPage.css";
import { useNavigate } from "react-router-dom";
import studentImage from "./assets/student.svg";
import FlagImage from "./assets/flag-icon.svg";
import checkIcon from "./assets/approved.svg";
import alertIcon from "./assets/alert_icon.svg";

interface ProfPageProps {
    onExit: () => void;
    connected: boolean;
}

const ProfPage = ({ 
    onExit, 
    connected 
}: ProfPageProps) => {

    const [micOn, setMicOn] = useState(false); // 마이크가 켜져 있는지(true) 꺼져 있는지(false)를 상태로 관리
    const [videoOn, setVideoOn] = useState(false); // 비디오가 켜져 있는지(true) 꺼져 있는지(false)를 상태로 관리
    const [visible, setVisible] = useState(true); 
    const [sent, setSent] = useState(false);
    const [alertStudentName, setAlertStudentName] = useState("Student 3");
    const [studentsStatus, setStudentsStatus] = useState<( "low" | "normal" | "good" )[]>([
        "good",
        "normal",
        "low",
        ]);


    // video 태그를 참조하기 위한 useRef (웹캠 영상 출력)
    const videoRef = useRef<HTMLVideoElement>(null);
    // audio 태그를 참조하기 위한 useRef (오디오 출력)
    const audioRef = useRef<HTMLAudioElement>(null);
    // 실제 마이크(오디오) 트랙을 저장하는 ref
    const audioTrackRef = useRef<MediaStreamTrack | null>(null);
    // 실제 비디오 트랙을 저장하는 ref
    const videoTrackRef = useRef<MediaStreamTrack | null>(null);

    const borderColors: Record<string, string> = {
        low: "#A42E27",
        normal: "#AD8657",
        good: "#588051",
    };
    
    const navigate = useNavigate();

    const handleAlertClick = () => {
        if (sent) return; // 이미 전송된 상태면 무시
        setSent(true); // 전송 상태 true로
        // 5초 후에 경고창 사라지도록 설정
        setTimeout(() => {
            setVisible(false); // 5초 뒤에 visible false
        }, 5000);
    };

      useEffect(() => {
        // videoOn이 true이고 videoRef가 존재하고 stream도 존재하면 srcObject 재연결
        if (videoOn && videoRef.current && videoTrackRef.current) {
          const stream = new MediaStream();
          stream.addTrack(videoTrackRef.current);
          if (audioTrackRef.current) {
            stream.addTrack(audioTrackRef.current); // 오디오도 함께 연결할 수 있음
          }
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => {
            console.error("비디오 재생 실패:", err);
          });
        }
      }, [videoOn]);

      {/* 서버에서 데이터 받아서 학생 상태 변경
      useEffect(() => {
        // 예시: 서버에서 받아온 데이터
        const dataFromServer = ["normal", "low", "good"];
        setStudentsStatus(dataFromServer);
        }, []);*/}

    React.useEffect(() => {
        if (connected) {
            onExit();
            navigate("/student");
        }
    }, [connected, navigate]);

    const handleToggleMic = () => {
    setMicOn((prev) => {
      const newState = !prev;
      if (audioTrackRef.current) {
        audioTrackRef.current.enabled = newState;
      }
      return newState;
     });
    };

    const handleToggleVideo = () => {
    setVideoOn((prev) => {
      const newState = !prev;
      if (videoTrackRef.current) {
        videoTrackRef.current.enabled = newState;
      }
      return newState;
     });
    };

    /*만일 1번 학생이 집중력이 떨어졌다면
    setAlertStudentName("Student 1");*/

    return (
        <div className="prof-root">
            <TopBar connected={connected} />
            <div className="prof-meeting-page">
            <div className="left-panel">
                <div className="students-row">
                    {[0, 1, 2].map((idx) => (
                    <div
                        key={idx}
                        className="student-box"
                        style={{
                        border: `4px solid ${borderColors[studentsStatus[idx]] || "transparent"}`,
                     }}
                    >
                    Student {idx + 1}
                    {/* low일 때만 경고 아이콘 표시 */}
                    {studentsStatus[idx] === "low" && (
                        <img
                        src={alertIcon}
                        alt="주의 필요"
                        className="student-alert-icon"
                        />
                    )}
                    </div>
                    ))}
                </div>

                
                <div className="lecture-screen">
                <audio ref={audioRef} autoPlay />
                {videoOn ? (
                        <video ref={videoRef} autoPlay />
                ) : (
                <div className="video-off-overlay">
                    <div className="video-off-icon">
                        {/* SVG 아이콘 또는 이미지 사용 */}
                        <img src={studentImage} alt="student" />
                    </div>
                <div className="video-off-text">카메라가 꺼져 있습니다</div>
                <button className="video-on-btn" onClick={handleToggleVideo}>카메라 켜기</button>
                </div>
                )}  
                </div> 
            </div>

            <div className="right-panel">
                
                {/* 경고창 리스트 */}
                {visible && (
                <div 
                    className={`alert-box ${sent ? 'green' : 'red'}`}
                    onClick={handleAlertClick}
                > 
                    <div className="alert-header">
                        <div className ="FlagBox">
                        <img 
                            src={sent? checkIcon : FlagImage}    
                            alt={sent? "완료" : "경고"} 
                            className="alert-icon" 
                        />
                            <span className="alert-student">{sent ? "APPROVED" : alertStudentName}</span>
                            {!sent && <button className="close-button" onClick={() => setVisible(false)}>✕</button>}
                        </div>
                     </div>
                <div className="alert-message">
                <div className="alert-title">{sent ? alertStudentName : "집중력 주의 단계"}</div>
                <div className="alert-sub">{sent? "경고 전송이 완료되었습니다." : "클릭하여 경고를 보내세요."}</div>
                </div>
            </div>
            )}
            </div>
            </div>

            <BottomBar
                micOn={micOn}
                videoOn={videoOn}
                onToggleMic={handleToggleMic}
                onToggleVideo={handleToggleVideo}
                onExit={onExit}
            />
        </div>
    );
};

export default ProfPage;
