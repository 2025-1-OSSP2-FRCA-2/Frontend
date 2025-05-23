import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import "./StudentPage.css";
import studentImage from "./assets/student.svg";

// 학생 페이지 컴포넌트
const StudentPage = () => {
  // video 태그를 참조하기 위한 useRef (웹캠 영상 출력)
  const videoRef = useRef<HTMLVideoElement>(null);
  // audio 태그를 참조하기 위한 useRef (오디오 출력)
  const audioRef = useRef<HTMLAudioElement>(null);
  // 캔버스는 video로부터 프레임을 캡처하기 위한 도구
  const canvas = document.createElement("canvas");
  // 실제 마이크(오디오) 트랙을 저장하는 ref
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  // 실제 비디오 트랙을 저장하는 ref
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const navigate = useNavigate();

  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(false); // 마이크가 켜져 있는지(true) 꺼져 있는지(false)를 상태로 관리
  const [videoOn, setVideoOn] = useState(false); // 비디오가 켜져 있는지(true) 꺼져 있는지(false)를 상태로 관리
  
  const [studentId] = useState(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'student') {
      // 학생이 아닌 경우 로그인 페이지로 리다이렉트
      navigate('/login');
      return '';
    }
    console.log('학생 ID:', user.id); // 학생 ID 로깅
    return user.id;
  });

  useEffect(() => {
    // studentId가 없으면 (학생이 아닌 경우) 실행하지 않음
    if (!studentId) return;

    let stream: MediaStream | null = null;
    let interval: number | null = null;
    let ws: WebSocket | null = null;

    const setup = async () => {
      try {
        // WebSocket 연결 먼저 시도
        ws = new WebSocket(`ws://localhost:8000/ws/student/${studentId}`);
        
        ws.onopen = () => {
          console.log(`WebSocket 연결됨 (학생 ID: ${studentId})`);
          // WebSocket 연결 성공 후 미디어 스트림 설정
          setupMediaStream();
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          console.log('서버로부터 메시지 수신:', data); // 메시지 로깅
          switch (data.type) {
            case "teacher_connected":
              console.log('선생님 연결됨');
              setConnected(true);
              break;
            case "teacher_disconnected":
              console.log('선생님 연결 해제됨');
              setConnected(false);
              break;
            case "warning":
              alert(data.message);
              break;
          }
        };

        ws.onclose = () => {
          console.log('WebSocket 연결 종료');
          setConnected(false);
        };

      } catch (error) {
        console.error("Error connecting to server:", error);
        alert("서버 연결에 실패했습니다.");
      }
    };

    const setupMediaStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        // 트랙 저장 및 상태 반영
        const audioTrack = stream.getAudioTracks()[0];
        audioTrackRef.current = audioTrack;
        if (audioTrack) audioTrack.enabled = micOn;

        const videoTrack = stream.getVideoTracks()[0];
        videoTrackRef.current = videoTrack;
        if (videoTrack) videoTrack.enabled = videoOn;

        // 프레임 전송 설정
        const sendFrame = () => {
          if (!videoRef.current || ws?.readyState !== WebSocket.OPEN) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          canvas.toBlob((blob) => {
            if (blob && ws?.readyState === WebSocket.OPEN) {
              ws.send(blob);
            }
          }, "image/jpeg");
        };
        // 0.1초마다 프레임 전송
        interval = setInterval(sendFrame, 100);
      } catch (error) {
        console.error("Error accessing webcam/microphone:", error);
        alert("웹캠/마이크 접근에 실패했습니다.");
      }
    };

    setup();

    return () => {
      if (interval) clearInterval(interval);
      if (ws) ws.close();
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [studentId, navigate]); // navigate를 의존성 배열에 추가

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

  // micOn이 true일 때 비디오 연결
  useEffect(() => {
    if (micOn && audioTrackRef.current && audioRef.current) {
      const stream = new MediaStream();
      stream.addTrack(audioTrackRef.current);
      audioRef.current.srcObject = stream;
      audioRef.current.play().catch((err) =>
        console.error("오디오 재생 실패:", err)
      );
    }
  }, [micOn]);

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

  const handleExit = () => {
    // 페이지 이동 또는 상태 변경 등
    navigate("/login");
  };

  // UI 구성: 비디오와 타이틀
  return (
    <div className="student-page">
      <TopBar connected={connected} />
      <div className="video-container">
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
      <BottomBar
        micOn={micOn}
        videoOn={videoOn}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onExit={handleExit}
      />
    </div>
  );
};

export default StudentPage;