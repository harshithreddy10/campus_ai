import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, LogIn, AlertCircle, Eye, EyeOff, Shield, User, UserPlus, Key,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

type Mode = "teacher" | "student" | "register";

export default function Login() {
  const { login, registerTeacher } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("teacher");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regKey, setRegKey] = useState("");
  const [regDone, setRegDone] = useState(false);

  function switchMode(m: Mode) {
    setMode(m);
    setUsername("");
    setPassword("");
    setRegName("");
    setRegUsername("");
    setRegPassword("");
    setRegConfirm("");
    setRegKey("");
    setError("");
    setRegDone(false);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError("");
    const result = await login(username, password);
    setLoading(false);
    if (result.success) {
      navigate("/", { replace: true });
    } else {
      setError(result.error || "Login failed");
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!regName || !regUsername || !regPassword || !regConfirm || !regKey) {
      setError("All fields are required");
      return;
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (regPassword !== regConfirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    const result = await registerTeacher(regName, regUsername, regPassword, regKey);
    setLoading(false);
    if (result.success) {
      setRegDone(true);
    } else {
      setError(result.error || "Registration failed");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">CampusAI</h1>
          <p className="text-gray-500 mt-1">Offline-first learning platform</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {([["teacher", Shield, "Teacher"], ["student", User, "Student"], ["register", UserPlus, "Register"]] as const).map(([m, Icon, label]) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {mode === "register" && regDone ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-3">
                  <Shield size={24} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Registered successfully!</h3>
                <p className="text-sm text-gray-500 mt-1">
                  You can now sign in with your credentials.
                </p>
                <button
                  onClick={() => switchMode("teacher")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Go to Sign In
                </button>
              </div>
            ) : mode === "register" ? (
              <form onSubmit={handleRegister} className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Register as Teacher</h2>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="e.g. Dr. Smith"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type={showPw ? "text" : "password"}
                    value={regConfirm}
                    onChange={(e) => setRegConfirm(e.target.value)}
                    placeholder="Repeat the password"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <span className="flex items-center gap-1.5">
                      <Key size={14} />
                      Institution Key
                    </span>
                  </label>
                  <input
                    type="text"
                    value={regKey}
                    onChange={(e) => setRegKey(e.target.value)}
                    placeholder="Ask your institution for this key"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!regName || !regUsername || !regPassword || !regConfirm || !regKey}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Register
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {mode === "teacher" ? "Teacher Sign In" : "Student Sign In"}
                </h2>

                {error && (
                  <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!username || !password || loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="animate-pulse">Signing in...</span>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Sign in
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-gray-400">
                  {mode === "teacher"
                    ? "First time? Use the Register tab to create an account"
                    : "Use the credentials given to you by your teacher"}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
