import { useNavigate } from "react-router-dom";
import "./LoginPage.css";
import EmailIcon from "./assets/email.svg"; 
import PasswordIcon from "./assets/password.svg"; 
import ArrowIcon from "./assets/arrow.svg"; 
import ArrowIconClick from "./assets/arrow_click.svg"; 
import EyeOpen from "./assets/eye_open.svg";
import EyeClosed from "./assets/eye_close.svg";
import { useState } from "react";

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(false);
    const [hidePassword, setHidePassword] = useState(true);

    const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL;

    const checkTeacherConnection = () => {
        console.log('Connecting to:', `${WS_BASE_URL}/check_connection`);  // URL 로깅
        const ws = new WebSocket(`${WS_BASE_URL}/ws/check_connection`);

        ws.onopen = () => {
            console.log('Checking teacher connection status...');
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Connection status:', data);
            
            if (data.teacher_connected) {
                navigate("/student");
            } else {
                navigate("/waiting");
            }
            ws.close();
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            alert('서버 연결에 실패했습니다.');
            ws.close();
        };

        ws.onclose = () => {
            console.log('WebSocket connection closed');
        };
    };

    const handleLogin = () => {
        if (email === "1" && password === "1") {
            sessionStorage.setItem('user', JSON.stringify({
                id: 'admin',
                email: email,
                role: 'teacher'
            }));
            navigate("/prof");
        } else if (email === "111" && password === "111") {
            sessionStorage.setItem('user', JSON.stringify({
                id: '1',
                email: email,
                role: 'student'
            }));
            checkTeacherConnection();
        } else if (email === "222" && password === "222") {
            sessionStorage.setItem('user', JSON.stringify({
                id: '2',
                email: email,
                role: 'student'
            }));
            checkTeacherConnection();
        } else if (email === "333" && password === "333") {
            sessionStorage.setItem('user', JSON.stringify({
                id: '3',
                email: email,
                role: 'student'
            }));
            checkTeacherConnection();
        } else {
            setError(true); 
        }
    };

    const toggleShowPassword = () => setHidePassword(prev => !prev);

    return (
        <div className="login-page-container">
            <div className="login-content">
            <h1 className="title">WELCOME</h1>
            
                <div className = "email-input-wrapper">
                    <img src={EmailIcon} alt="email" className = "email-icon" />
                    <input 
                        className="email-input" 
                        type="email" 
                        placeholder="Email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                                
                <div className="password-input-wrapper">
                    <img src={PasswordIcon} alt="password" className="password-icon" />
                        <input
                            type={hidePassword ? "password" : "text"}
                            placeholder="Password"
                            className="password-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <img
                            src={hidePassword ? EyeClosed : EyeOpen}
                            alt={hidePassword ? "Hide password" : "Show password"}
                            className="password-eye-icon"
                            onClick={toggleShowPassword}
                        />
                </div>

                    <div className="error-message" style={{ visibility: error ? 'visible' : 'hidden', opacity: error ? 1 : 0 }}>
                        이메일 또는 비밀번호가 올바르지 않습니다.
                    </div>

                <button className={"login-button"} onClick = {handleLogin}>
                    <span className="login-text">LOGIN</span>
                    <img src={ArrowIcon} alt="arrow" className="arrow-default" />
                    <img src={ArrowIconClick} alt="arrow" className="arrow-active" />
                </button>
                </div>
    </div>
    )   
};

export default LoginPage;
