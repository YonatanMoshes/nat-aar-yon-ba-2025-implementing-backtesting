import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { StandAloneField, SideBySideField } from './FieldItem';
import './Form.css';
import { JS_API_BASE_URL } from '../../utilities/consts';

function SignUpForm() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [location, setLocation] = useState('');
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleInput = (setter) => (e) => {
        setError('');
        setter(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!username || !email || !password || !confirmPassword || !phone || !location) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        // Create the form data
        const userData = {
            username,
            email,
            password,
            phone,
            location
        };

        try {
            // Send data to the WebServer (POST request)
            const response = await fetch(`${JS_API_BASE_URL}/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                setError('Error: ' + errorData.error);
            } else {
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
                    const errorData = await response.json();
                    setError('Error: ' + errorData.error);
                }
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
        overflow: "scroll"
    };

    return (
        <div className="form-container center" style={pageStyle}>
            <Link to="/">
                <i className="bi bi-arrow-left"></i>
            </Link>
            <div className="form">
                <h3>Create an Account</h3>
                <form onSubmit={handleSubmit}>
                    {/* Using the createField function for dynamic field generation */}
                    <StandAloneField label={'Username'} type={'text'} id={'username'} placeholder={'Enter your username'} value={username} onChange={handleInput(setUsername)} />
                    <div className='row'>
                        <SideBySideField label={'Password'} type={'password'} id={'password'} placeholder={'Create a password'} value={password} onChange={handleInput(setPassword)} />
                        <SideBySideField label={'Confirm Password'} type={'password'} id={'confirmPassword'} placeholder={'Confirm your password'} value={confirmPassword} onChange={handleInput(setConfirmPassword)} />
                    </div>
                    <StandAloneField label={'Email Address'} type={'email'} id={'email'} placeholder={'Enter your email'} value={email} onChange={handleInput(setEmail)} />
                    <StandAloneField label={'Phone (no dashes)'} type={'text'} id={'phone'} placeholder={'Enter your phone number'} value={phone} onChange={handleInput(setPhone)} />
                    <StandAloneField label={'Location'} type={'text'} id={'location'} placeholder={'Enter your location'} value={location} onChange={handleInput(setLocation)} />

                    <div className="col-12">
                        <button type="submit" className="btn btn-primary btn-danger">Sign up</button>
                    </div>

                    <div className="col-12">
                        <p className='new-to-nexflit'>Already have an acount? <Link to='/login'>Log In</Link></p>
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

export default SignUpForm;