import React, { useEffect, useRef } from "react";

// 학생 페이지 컴포넌트
const StudentPage = () => {
  // video 태그를 참조하기 위한 useRef (웹캠 영상 출력)
  const videoRef = useRef<HTMLVideoElement>(null);

  // WebSocket 객체를 참조하기 위한 useRef (연결을 전역에서 유지)
  const socketRef = useRef<WebSocket | null>(null);

  // 캔버스는 video로부터 프레임을 캡처하기 위한 도구
  const canvas = document.createElement("canvas");

  useEffect(() => {
    // 1. 웹캠 접근 요청
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      // 2. 스트림을 <video> 태그에 연결해서 화면에 표시
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();  // 영상 재생
      }

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
  }, []);

  // UI 구성: 비디오와 타이틀
  return (
    <div>
      <h2>학생 페이지</h2>
      <video ref={videoRef} autoPlay muted style={{ width: "50%" }} />
    </div>
  );
};

export default StudentPage;