import React, { useEffect, useRef, useState } from "react";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import "./StudentPage.css";
import { preconnect } from "react-dom";

// 학생 페이지 컴포넌트
const StudentPage = () => {
  // video 태그를 참조하기 위한 useRef (웹캠 영상 출력)
  const videoRef = useRef<HTMLVideoElement>(null);

  // WebSocket 객체를 참조하기 위한 useRef (연결을 전역에서 유지)
  const socketRef = useRef<WebSocket | null>(null);

  // 캔버스는 video로부터 프레임을 캡처하기 위한 도구
  const canvas = document.createElement("canvas");

  // 실제 마이크(오디오) 트랙을 저장하는 ref
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  // 실제 비디오 트랙을 저장하는 ref
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);

  const [connected, setConnected] = useState(false);

  const [micOn, setMicOn] = useState(false); // 마이크가 켜져 있는지(true) 꺼져 있는지(false)를 상태로 관리

  const [videoOn, setVideoOn] = useState(false); // 비디오가 켜져 있는지(true) 꺼져 있는지(false)를 상태로 관리

  useEffect(() => {

    // 1. 웹캠 접근 요청
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      // 2. 스트림을 <video> 태그에 연결해서 화면에 표시
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();  // 영상 재생
      }
      
      // 오디오 트랙 저장
      const audioTrack = stream.getAudioTracks()[0];
      audioTrackRef.current = audioTrack;
      // 기본값: 마이크 끔
      if (audioTrack) audioTrack.enabled = micOn;

      // 비디오 트랙 저장
      const videoTrack = stream.getVideoTracks()[0];
      videoTrackRef.current = videoTrack;
      // 기본값: videoOn 상태에 맞게
      if (videoTrack) videoTrack.enabled = videoOn;

      // 3. WebSocket 서버와 연결 (FastAPI: /ws/student 엔드포인트)
      socketRef.current = new WebSocket("ws://localhost:8000/ws/student");

      // 4. 매 1초마다 현재 비디오 프레임을 캡처해서 WebSocket으로 전송
      const sendFrame = () => {
        // video 요소 또는 WebSocket이 준비 안 되어 있으면 중단
        if (!videoRef.current || socketRef.current?.readyState !== WebSocket.OPEN) 
            return;

        const ctx = canvas.getContext("2d");
        if (!ctx) 
            return;

        // 캔버스 크기를 비디오와 동일하게 맞춤
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        // 비디오에서 현재 프레임을 캔버스로 그림
        ctx.drawImage(videoRef.current, 0, 0);

        // 캔버스 내용을 JPEG 형식의 Blob으로 변환
        canvas.toBlob((blob) => {
          if (blob && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(blob);  // WebSocket으로 프레임 전송
          }
        }, "image/jpeg");
      };

      // 5. setInterval로 1초마다 sendFrame 함수 호출
      const interval = setInterval(sendFrame, 1000);

      // 6. 컴포넌트 언마운트 시 실행되는 cleanup 함수
      return () => {
        clearInterval(interval);                  // setInterval 제거
        socketRef.current?.close();               // WebSocket 연결 종료
        stream.getTracks().forEach((track) => track.stop()); // 웹캠 종료
      };
    });

    socketRef.current = new WebSocket("ws://localhost:8000/ws/student");
    socketRef.current.onopen = () => setConnected(true);
    socketRef.current.onclose = () => setConnected(false);

  }, []);

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
  };

  // UI 구성: 비디오와 타이틀
  return (
    <div className="student-page">
      <TopBar connected={connected} />
      <div className="video-container">
        <video ref={videoRef} autoPlay muted={!micOn} />
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