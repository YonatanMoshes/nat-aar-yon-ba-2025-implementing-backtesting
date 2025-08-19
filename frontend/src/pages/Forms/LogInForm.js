import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Form.css';
import StandAloneField from './FieldItem';
import { JS_API_BASE_URL } from '../../utilities/consts';

function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleInput = (setter) => (e) => {
        setError('');
        setter(e.target.value);
    }

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();


        if (!username || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch(`${JS_API_BASE_URL}/tokens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const data = await response.json();

                localStorage.setItem('authToken', data.tokenId.token);
                localStorage.setItem('userId', data.tokenId.userId);
                localStorage.setItem('username', username);

                navigate("/");
            } else {
                setError('Invalid credentials');
            }
        } catch (err) {
            setError('Error while sending data to server');
            console.error(err);
        }
    };


    const pageStyle = {
        backgroundImage: `url(${process.env.PUBLIC_URL}/images/background.jpg)`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        minHeight: "100vh",
    };

    return (
        <div className='form-container center' style={pageStyle}>
            <Link to="/">
                <i className="bi bi-arrow-left"></i>
            </Link>
            <div className='form'>
                <h3>Login</h3>
                <form className="row g-3" onSubmit={handleSubmit}>
                    <StandAloneField label={'Username'} type={'text'} id={'username'} placeholder={'Enter your username'} value={username} onChange={handleInput(setUsername)} />
                    <StandAloneField label={'Password'} type={'password'} id={'password'} placeholder={'Enter your password'} value={password} onChange={handleInput(setPassword)} />
                    <div className="col-12">
                        <button type="submit" className="btn btn-primary btn-danger">Sign in</button>
                    </div>

                    <div className="col-12">
                        <p className='new-to-nexflit'>New to investly? <Link to='/signup'>Sign Up</Link></p>
                    </div>

                    <div className="col-12 form-footer-links">
                        <Link to="/" className="btn-back">
                            Back to Home
                        </Link>
                    </div>
                </form>
                {error && <div className="alert alert-danger">{error}</div>}
            </div>
        </div>
    );
}

export default LoginForm;
