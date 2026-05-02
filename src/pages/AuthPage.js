import React, { useState, useEffect } from 'react';
import {
  loginUser,
  signupUser,
  saveAuthUser,
  forgotPassword,
  resetPassword,
} from '../services/apiService';

const ADMIN_EMAIL = 'akbarali1512141@gmail.com';

const AuthPage = () => {
  const [mode, setMode] = useState('login'); // login | signup | forgot | reset
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'customer',
    otp: '',
    newPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Page refresh par ya first load par purana kachra saaf karne ke liye
  useEffect(() => {
    sessionStorage.clear();
    localStorage.clear();
  }, []);

  const change = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const goByRole = (role) => {
    // window.location.href use karne se pura page reload hoga aur state reset ho jayegi
    if (role === 'admin') window.location.href = '/admin';
    else if (role === 'driver') window.location.href = '/driver-dashboard';
    else window.location.href = '/';
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      setLoading(true);

      // --- FINAL FIX: Naye login se pehle har qism ki storage clear karein ---
      sessionStorage.clear();
      localStorage.clear(); 

      const email = form.email.trim().toLowerCase();

      if (mode === 'forgot') {
        if (!email) {
          setMessage('Email is required.');
          setLoading(false);
          return;
        }
        await forgotPassword(email);
        setMessage('OTP sent to your email.');
        setMode('reset');
        return;
      }

      if (mode === 'reset') {
        if (!email || !form.otp.trim() || !form.newPassword.trim()) {
          setMessage('Email, OTP and new password are required.');
          setLoading(false);
          return;
        }

        await resetPassword({
          email,
          otp: form.otp.trim(),
          newPassword: form.newPassword,
        });

        setMessage('Password reset successfully. Please login.');
        setMode('login');
        setForm((prev) => ({
          ...prev,
          password: '',
          otp: '',
          newPassword: '',
        }));
        return;
      }

      if (!email || !form.password.trim()) {
        setMessage('Email and password are required.');
        setLoading(false);
        return;
      }

      if (mode === 'signup' && !form.name.trim()) {
        setMessage('Full name is required.');
        setLoading(false);
        return;
      }

      let role = email === ADMIN_EMAIL ? 'admin' : form.role.toLowerCase();

      if (mode === 'signup' && role === 'admin' && email !== ADMIN_EMAIL) {
        role = 'customer';
      }

      const res =
        mode === 'login'
          ? await loginUser({
              email,
              password: form.password,
            })
          : await signupUser({
              name: form.name.trim(),
              phone: form.phone.trim(),
              email,
              password: form.password,
              role,
            });

      if (res.success) {
        if (email === ADMIN_EMAIL) {
          res.user.role = 'admin';
        }

        // Fresh data save karein
        saveAuthUser(res.user);
        
        // Forcefully redirect karein taake state sync na ho
        setTimeout(() => {
          goByRole(res.user.role);
        }, 100);
      }
    } catch (err) {
      setMessage(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6">
        <h1 className="text-3xl font-black text-slate-900 text-center uppercase">
          {mode === 'login'
            ? 'Login'
            : mode === 'signup'
            ? 'Signup'
            : mode === 'forgot'
            ? 'Forgot Password'
            : 'Reset Password'}
        </h1>

        <p className="text-center text-slate-500 mt-2">
          Access your Quick Delivery account
        </p>

        {message && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-bold">
            {message}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4 mt-6">
          {mode === 'signup' && (
            <>
              <input
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-blue-500"
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => change('name', e.target.value)}
              />

              <input
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-blue-500"
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => change('phone', e.target.value)}
              />

              <select
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none bg-white focus:border-blue-500"
                value={form.role}
                onChange={(e) => change('role', e.target.value)}
              >
                <option value="customer">Customer</option>
                <option value="driver">Driver</option>
              </select>
            </>
          )}

          <input
            type="email"
            className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-blue-500"
            placeholder="Email"
            value={form.email}
            onChange={(e) => change('email', e.target.value)}
          />

          {(mode === 'login' || mode === 'signup') && (
            <input
              type="password"
              className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-blue-500"
              placeholder="Password"
              value={form.password}
              onChange={(e) => change('password', e.target.value)}
            />
          )}

          {mode === 'reset' && (
            <>
              <input
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-blue-500"
                placeholder="Enter OTP"
                value={form.otp}
                onChange={(e) => change('otp', e.target.value)}
              />

              <input
                type="password"
                className="w-full p-3 border border-slate-200 rounded-2xl outline-none focus:border-blue-500"
                placeholder="New Password"
                value={form.newPassword}
                onChange={(e) => change('newPassword', e.target.value)}
              />
            </>
          )}

          <button
            disabled={loading}
            className="w-full bg-slate-900 text-white p-3 rounded-2xl font-bold hover:bg-black transition-all disabled:bg-slate-400 shadow-lg"
          >
            {loading
              ? 'Please wait...'
              : mode.toUpperCase()}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={() => {
              setMessage('');
              setMode(mode === 'login' ? 'signup' : 'login');
            }}
            className="text-blue-600 font-bold"
          >
            {mode === 'login' ? 'Create Account' : 'Back to Login'}
          </button>
          
          {mode === 'login' && (
            <button
              onClick={() => {
                setMessage('');
                setMode('forgot');
              }}
              className="text-sm text-slate-500"
            >
              Forgot password?
            </button>
          )}
          
          <a href="/" className="text-sm text-slate-400">Back to Home</a>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;