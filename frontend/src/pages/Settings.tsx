import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings as SettingsIcon, Key, Globe, Activity, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { isTeacher } = useAuth();
  const navigate = useNavigate();

  // Language state
  const [lang, setLang] = useState(i18n.language || "en");
  const [langLoading, setLangLoading] = useState(false);
  const [langMessage, setLangMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Change Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Admin System Settings state
  const [ollamaModel, setOllamaModel] = useState("");
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [whisperModel, setWhisperModel] = useState("tiny");
  const [maxUploadSize, setMaxUploadSize] = useState(100); // in MB
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemMessage, setSystemMessage] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    // Load current language from backend on mount
    async function loadUserLang() {
      try {
        const res = await api.getUserLanguage() as { language?: string };
        if (res.language) {
          setLang(res.language);
          i18n.changeLanguage(res.language);
        }
      } catch (err) {
        console.error("Failed to load user language from backend:", err);
      }
    }

    // Load admin settings on mount if teacher
    async function loadSystemSettings() {
      if (!isTeacher) return;
      try {
        const res = await api.getSettings() as Record<string, unknown>;
        setOllamaModel(String(res.ollama_model ?? ""));
        setOcrEnabled(Boolean(res.ocr_enabled));
        setWhisperModel(String(res.whisper_model ?? "tiny"));
        setMaxUploadSize(Math.round(Number(res.max_upload_size) / (1024 * 1024)));
      } catch (err) {
        console.error("Failed to load system settings from backend:", err);
      }
    }

    loadUserLang();
    loadSystemSettings();
  }, [isTeacher, i18n]);

  async function handleLanguageChange(e: FormEvent) {
    e.preventDefault();
    setLangLoading(true);
    setLangMessage(null);
    try {
      await api.updateUserLanguage(lang);
      i18n.changeLanguage(lang);
      setLangMessage({ success: true, text: "Language preference saved successfully" });
    } catch (err: unknown) {
      setLangMessage({ success: false, text: err instanceof Error ? err.message : "Failed to update language" });
    } finally {
      setLangLoading(false);
    }
  }

  async function handlePasswordChange(e: FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMessage({ success: false, text: "All fields are required" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ success: false, text: "New password must be at least 6 characters" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ success: false, text: "New passwords do not match" });
      return;
    }

    setPasswordLoading(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      setPasswordMessage({ success: true, text: "Password updated successfully" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordMessage({ success: false, text: err instanceof Error ? err.message : "Failed to change password" });
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleSystemSettingsChange(e: FormEvent) {
    e.preventDefault();
    setSystemLoading(true);
    setSystemMessage(null);
    try {
      await api.updateSettings({
        ollama_model: ollamaModel,
        ocr_enabled: ocrEnabled,
        whisper_model: whisperModel,
        max_upload_size: maxUploadSize * 1024 * 1024, // convert MB back to bytes
      });
      setSystemMessage({ success: true, text: "System settings updated successfully" });
    } catch (err: unknown) {
      setSystemMessage({ success: false, text: err instanceof Error ? err.message : "Failed to update system settings" });
    } finally {
      setSystemLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        {t("dashboard")}
      </button>

      <h2 className="text-2xl font-bold flex items-center gap-2">
        <SettingsIcon size={24} className="text-blue-600" />
        {t("settings")}
      </h2>

      {/* Multilingual Support Card */}
      <form onSubmit={handleLanguageChange} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-gray-150 pb-2">
          <Globe size={18} className="text-blue-500" />
          {t("prefLang")}
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Language
          </label>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">{t("english")}</option>
            <option value="hi">{t("hindi")}</option>
            <option value="te">{t("telugu")}</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={langLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {langLoading ? t("uploading") : t("saveSettings")}
        </button>

        {langMessage && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${langMessage.success ? "bg-emerald-50 text-emerald-700 border border-emerald-250" : "bg-red-50 text-red-700 border border-red-250"}`}>
            {langMessage.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {langMessage.text}
          </div>
        )}
      </form>

      {/* Change Password Card */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-gray-150 pb-2">
          <Key size={18} className="text-blue-500" />
          {t("changePassword")}
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("oldPassword")}
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("newPassword")}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("confirmPassword")}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={passwordLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {passwordLoading ? t("uploading") : t("updatePassword")}
        </button>

        {passwordMessage && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${passwordMessage.success ? "bg-emerald-50 text-emerald-700 border border-emerald-250" : "bg-red-50 text-red-700 border border-red-250"}`}>
            {passwordMessage.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {passwordMessage.text}
          </div>
        )}
      </form>

      {/* Admin System Settings Card */}
      {isTeacher && (
        <form onSubmit={handleSystemSettingsChange} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-gray-150 pb-2">
            <Activity size={18} className="text-blue-500" />
            {t("appSettings")}
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("aiModel")}
              </label>
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="e.g. deepseek-r1:1.5b"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("whisperModel")}
              </label>
              <select
                value={whisperModel}
                onChange={(e) => setWhisperModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tiny">Tiny</option>
                <option value="base">Base</option>
                <option value="small">Small</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("uploadSize")} (MB)
              </label>
              <input
                type="number"
                value={maxUploadSize}
                onChange={(e) => setMaxUploadSize(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={ocrEnabled}
                  onChange={(e) => setOcrEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                Enable OCR Fallback (Tesseract)
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={systemLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {systemLoading ? t("uploading") : t("saveSettings")}
          </button>

          {systemMessage && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${systemMessage.success ? "bg-emerald-50 text-emerald-700 border border-emerald-250" : "bg-red-50 text-red-700 border border-red-250"}`}>
              {systemMessage.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {systemMessage.text}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
