import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TopBar from "./TopBar";
import BottomBar from "./BottomBar";
import "./StudentPage.css";
import studentImage from "./assets/student.svg";

// LocationState 인터페이스 정의: studentId를 포함
interface LocationState {
    studentId: string;
}

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
  // WebSocket 연결을 저장하는 ref
  const wsRef = useRef<WebSocket | null>(null);
  // WebRTC 시그널링용 WebSocket 연결을 저장하는 ref
  const rtcWsRef = useRef<WebSocket | null>(null);
  // PeerConnection을 저장하는 ref
  const pcRef = useRef<RTCPeerConnection | null>(null);

  // 페이지 이동을 위한 navigate 함수
  const navigate = useNavigate();
  // 현재 위치 정보를 가져오기 위한 location
  const location = useLocation();
  // location의 상태를 LocationState로 캐스팅
  const locationState = location.state as LocationState;

  // 연결 상태를 관리하는 state
  const [connected, setConnected] = useState(false);
  // 마이크 상태를 관리하는 state
  const [micOn, setMicOn] = useState(false);
  // 비디오 상태를 관리하는 state
  const [videoOn, setVideoOn] = useState(false);
  // 학생 ID를 저장하는 state
  const [studentId, setStudentId] = useState<string>('');
  // 집중력 경고 상태를 관리하는 state
  const [isFocusWarningOn, setIsFocusWarningOn] = useState(false);
  // 로컬 스트림을 저장하는 state
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL;
  
  // 사용자 인증 체크를 위한 useEffect
  useEffect(() => {
    if (!locationState?.studentId) {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (!user.id || user.role !== 'student') {
        navigate('/login');
        return;
      }
      setStudentId(user.id);
    } else {
      setStudentId(locationState.studentId);
    }
  }, [navigate, locationState]);

  // WebSocket 및 미디어 스트림 설정을 위한 useEffect
  useEffect(() => {
    if (!studentId) return; // studentId가 없으면 실행하지 않음

    let stream: MediaStream | null = null; // 미디어 스트림을 저장할 변수
    let interval: number | null = null; // 프레임 전송 간격을 저장할 변수

    // WebSocket 및 미디어 스트림 설정 함수
    const setup = async () => {
      try {
        console.log('새로운 WebSocket 연결 생성');
        wsRef.current = new WebSocket(`${WS_BASE_URL}/ws/student/${studentId}`);
        wsRef.current.onopen = () => {
          console.log(`WebSocket 연결됨 (학생 ID: ${studentId})`);
          setConnected(true); // 연결 상태 업데이트
        };

        if (wsRef.current) {
          wsRef.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('서버로부터 메시지 수신:', data);
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
                console.log('경고 메시지 수신');
                setIsFocusWarningOn(true);
                break;
            }
          };

          wsRef.current.onclose = () => {
            console.log('WebSocket 연결 종료');
            setConnected(false);
          };
        }

        await setupMediaStream(); // 미디어 스트림 설정
      } catch (error) {
        console.error("서버 연결 오류:", error);
        alert("서버 연결에 실패했습니다.");
      }
    };

    // 미디어 스트림 설정 함수
    const setupMediaStream = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        
        const audioTrack = stream.getAudioTracks()[0];
        audioTrackRef.current = audioTrack;
        if (audioTrack) audioTrack.enabled = micOn;

        const videoTrack = stream.getVideoTracks()[0];
        videoTrackRef.current = videoTrack;
        if (videoTrack) videoTrack.enabled = videoOn;

        // 비디오 프레임을 주기적으로 전송하는 함수
        const sendFrame = () => {
          if (!videoRef.current || wsRef.current?.readyState !== WebSocket.OPEN) return;
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          canvas.toBlob((blob) => {
            if (blob && wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(blob);
            }
          }, "image/jpeg");
        };
        
        interval = setInterval(sendFrame, 5000); // 5000ms마다 프레임 전송
      } catch (error) {
        console.error("웹캠/마이크 접근 오류:", error);
        alert("웹캠/마이크 접근에 실패했습니다.");
      }
    };

    setup(); // 설정 함수 호출

    // 컴포넌트 언마운트 시 정리 작업
    return () => {
      if (interval) clearInterval(interval);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [studentId]);

  // 비디오 상태 변경 시 미디어 스트림 업데이트
  useEffect(() => {
    if (videoOn && videoRef.current && videoTrackRef.current) {
      const stream = new MediaStream();
      stream.addTrack(videoTrackRef.current);
      if (audioTrackRef.current) {
        stream.addTrack(audioTrackRef.current);
      }
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch((err) => {
        console.error("비디오 재생 실패:", err);
      });
    }
  }, [videoOn]);

  // 마이크 상태 변경 시 오디오 스트림 업데이트
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

  // WebRTC 시그널링용 WebSocket 연결 (마운트 시)
  useEffect(() => {
    if (!studentId) return;
    rtcWsRef.current = new WebSocket(`${WS_BASE_URL}/ws/webrtc/student/${studentId}`);
    rtcWsRef.current.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "answer") {
        console.log('[학생] answer 수신', data);
        await pcRef.current?.setRemoteDescription(data.sdp);
      }
      if (data.type === "candidate") {
        console.log('[학생] candidate 수신', data);
        await pcRef.current?.addIceCandidate(data.candidate);
      }
    };
    return () => {
      rtcWsRef.current?.close();
      pcRef.current?.close();
    };
  }, [studentId]);

  // 마이크 상태 토글 함수
  const handleToggleMic = () => {
    setMicOn((prev) => {
      const newState = !prev;
      if (audioTrackRef.current) {
        audioTrackRef.current.enabled = newState;
      }
      return newState;
    });
  };

  // 캠 토글 함수(WebRTC용)
  const handleToggleVideo = async () => {
    if (!videoOn) {
      // 캠 켜기
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      console.log('[학생] getUserMedia 성공', stream);
      setLocalStream(stream);
      if (videoRef.current) videoRef.current.srcObject = stream;
      // WebRTC PeerConnection 새로 생성
      pcRef.current?.close();
      pcRef.current = new RTCPeerConnection({ 
        iceServers: [
          { 
              urls: ["turn:3.39.230.184:3478"],
              username: 'dohoon',
              credential: '111'
          }
        ] 
      });

      pcRef.current.oniceconnectionstatechange = () => {
        console.log(`[학생] ICE 상태: ${pcRef.current?.iceConnectionState}`);
        console.log(`[학생] ICE gathering 상태: ${pcRef.current?.iceGatheringState}`);
        console.log(`[학생] 시그널링 상태: ${pcRef.current?.signalingState}`);
      };

      pcRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("🎯 candidate 타입:", event.candidate?.type); // 이게 'relay'여야 TURN 사용
        }
      };

      // 트랙 추가
      stream.getTracks().forEach(track => {
        pcRef.current!.addTrack(track, stream);
        console.log('[학생] 트랙 추가:', track);
      });

      // ICE candidate 발생 시 시그널링 서버로 전송
      pcRef.current.onicecandidate = (event) => {
        console.log('[학생] ICE candidate 생성됨:', event.candidate);  // 로그 찍기
        if (event.candidate) {
          console.log('[학생] ICE candidate 전송:', event.candidate);
          rtcWsRef.current?.send(JSON.stringify({
            type: "candidate",
            candidate: event.candidate,
            to: "prof"
          }));
        }
      };

      // offer 생성 및 전송 (트랙 추가 후!)
      console.log('[학생] 트랙 추가 후 offer 생성');
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      console.log('[학생] offer 생성 및 전송', offer);
      rtcWsRef.current?.send(JSON.stringify({
        type: "offer",
        sdp: offer,
        to: "prof"
      }));
    } else {
      // 캠 끄기
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        if (videoRef.current) videoRef.current.srcObject = null;
      }
      pcRef.current?.close();
      pcRef.current = null;
    }
    setVideoOn((prev) => {
            const newState = !prev;
            if (videoTrackRef.current) {
              videoTrackRef.current.enabled = newState;
            }
            return newState;
    });
  };

  // 페이지 종료 시 호출되는 함수
  const handleExit = () => {
    navigate("/login");
  };

  // UI 구성: 비디오와 타이틀
  return (
    <div className="student-page">
      <TopBar connected={connected} />
      {isFocusWarningOn && (
        <div className="focus-warning-box">
          <div className="focus-warning-content">
            <span className="focus-warning-icon">⚠️</span>
            <span className="focus-warning-text">집중력이 매우 낮습니다.</span>
            <button 
              className="focus-warning-dismiss"
              onClick={() => setIsFocusWarningOn(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}
      <div className={`video-container`}>
        <audio ref={audioRef} autoPlay />
        {videoOn ? (
          <video ref={videoRef} autoPlay className={isFocusWarningOn ? 'warning-active' : ''} />        ) : (
          <div className={`video-off-overlay ${isFocusWarningOn ? 'warning-active' : ''}`}>
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
