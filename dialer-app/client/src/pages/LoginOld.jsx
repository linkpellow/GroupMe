import { useState } from "react";
import PasscodeEntry from "../components/PasscodeEntry";
import "./login.css";

export default function Login({ onSubmit }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPasscodeEntry, setShowPasscodeEntry] = useState(false);
  const [passcodeValidated, setPasscodeValidated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignUp) {
      onSubmit?.({ name, email, password, type: 'signup' });
    } else {
      onSubmit?.({ email, password, type: 'login' });
    }
  };

  const handleSignUpClick = () => {
    setIsSignUp(true);
    setShowPasscodeEntry(true);
  };

  const handleLoginClick = () => {
    setIsSignUp(false);
    setShowPasscodeEntry(false);
    setPasscodeValidated(false);
  };

  const handlePasscodeValid = (passcode) => {
    setPasscodeValidated(true);
    setShowPasscodeEntry(false);
  };

  const handlePasscodeCancel = () => {
    setShowPasscodeEntry(false);
    setIsSignUp(false);
    setPasscodeValidated(false);
  };

  // Show passcode entry if user is trying to sign up
  if (showPasscodeEntry) {
    return (
      <main className="login__outer">
        <PasscodeEntry
          onPasscodeValid={handlePasscodeValid}
          onCancel={handlePasscodeCancel}
        />
      </main>
    );
  }

  return (
    <main className="login__outer">
      <section className="login__card">
        <img
          src="/images/HEADER LOGO.png"
          alt="Crokodial header logo"
          className="login__logo"
          style={{ marginBottom: '0.5rem', width: '120px' }}
        />
        <img
          src="/images/CROKODIAL-TITLE-LOGO.png"
          alt="Crokodial logo"
          className="login__logo"
        />

        <h1 className="login__title">
          {isSignUp ? "Create your account" : "Sign in to your account"}
        </h1>

        {isSignUp && passcodeValidated && (
          <div className="login__passcode-success">
            <p className="login__passcode-message">
              ✅ Invite code validated successfully
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login__form">
          {isSignUp && (
            <label className="login__label">
              Full Name
              <input
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="login__input"
              />
            </label>
          )}

          <label className="login__label">
            Email
            <input
              type="email"
              autoComplete={isSignUp ? "email" : "email"}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login__input"
            />
          </label>

          <label className="login__label">
            Password
            <input
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login__input"
            />
          </label>

          <button type="submit" className="login__btn">
            {isSignUp ? "Create Account" : "Sign in"}
          </button>
        </form>

        <div className="login__toggle">
          <p className="login__toggle-text">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            <button
              type="button"
              onClick={isSignUp ? handleLoginClick : handleSignUpClick}
              className="login__toggle-btn"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </p>
        </div>

        <p className="login__footer">
          © {new Date().getFullYear()} Crokodial. All rights reserved.
        </p>
      </section>
    </main>
  );
} 