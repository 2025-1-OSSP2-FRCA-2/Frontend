import { useNavigate } from "react-router-dom";
import "./LoginPage.css";

const LoginPage = () => {
    const navigate = useNavigate();

    const toStudentPage = () => {
        navigate("/student");
    }

    const toWaitingPage = () => {
        navigate("/waiting");
    }

    return (
        <div className="login-page-container">
            <div className="login-content">
                <button onClick={toWaitingPage}>대기 페이지 이동 버튼</button>
                <button onClick={toStudentPage}>학생 페이지 이동 버튼</button>
                <div>여긴 로그인 페이지</div>
            </div>
        </div>
    )   
};

export default LoginPage;