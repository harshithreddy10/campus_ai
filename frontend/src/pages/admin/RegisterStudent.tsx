import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserPlus, CheckCircle, AlertCircle, Copy, ArrowLeft, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";

const initial = {
  name: "",
  roll_number: "",
  department: "",
  branch: "",
  academic_year: "",
  dob: "",
  contact: "",
};

export default function AdminRegisterStudent() {
  const { t } = useTranslation();
  const { addStudent, ocrRegisterStudent } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...initial });
  const [loading, setLoading] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    student?: { name: string; username: string; password: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      // Simulate slight delay for UX
      await new Promise((r) => setTimeout(r, 500));
      const student = await addStudent(form);
      setResult({
        success: true,
        student: { name: student.name, username: student.username, password: student.password },
      });
      setForm({ ...initial });
    } catch (err) {
      console.error(err);
      setResult({ success: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleOcrSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ocrFile) return;
    setOcrLoading(true);
    setResult(null);
    try {
      const student = await ocrRegisterStudent(ocrFile);
      setResult({
        success: true,
        student: { name: student.name, username: student.username, password: student.password },
      });
      setOcrFile(null);
    } catch (err) {
      console.error(err);
      setResult({ success: false });
    } finally {
      setOcrLoading(false);
    }
  }

  async function copyCredentials() {
    if (!result?.student) return;
    const text = `Name: ${result.student.name}\nUsername: ${result.student.username}\nPassword: ${result.student.password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const fields = [
    { key: "name", label: t("fullName"), placeholder: "John Doe" },
    { key: "roll_number", label: t("rollNumber"), placeholder: "22CS001" },
    { key: "department", label: t("department"), placeholder: "Computer Science" },
    { key: "branch", label: t("branch"), placeholder: "CSE" },
    { key: "academic_year", label: t("academicYear"), placeholder: "2025-2026" },
    { key: "dob", label: t("dateOfBirth"), type: "date" },
    { key: "contact", label: t("contact"), placeholder: "+91 9876543210" },
  ];

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} />
        {t("dashboard")}
      </button>

      <h2 className="text-2xl font-bold mb-6">{t("registerStudent")}</h2>

      {/* OCR Admission Document Upload */}
      <form
        onSubmit={handleOcrSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-4"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-gray-100 pb-2">
          <Upload size={18} className="text-blue-500" />
          AI Scanned Document Registration (OCR)
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Scanned Document / ID Card (PDF, PNG, JPG)
          </label>
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
            <Upload size={24} className="text-gray-400 mb-1" />
            <span className="text-sm text-gray-500">
              {ocrFile ? ocrFile.name : t("clickSelectFile")}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              Admission letters, Aadhaar cards, or student profiles
            </span>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => setOcrFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={!ocrFile || ocrLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <UserPlus size={18} />
          {ocrLoading ? "Processing Document..." : "Register via OCR Extraction"}
        </button>
      </form>

      {/* Split/Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200"></div>
        </div>
        <span className="relative bg-gray-50 px-4 text-xs text-gray-500 font-semibold uppercase tracking-wider">
          Or Register Manually
        </span>
      </div>

      {/* Manual Entry Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
      >
        <div className="grid sm:grid-cols-2 gap-4">
          {fields.map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <input
                type={type || "text"}
                value={(form as Record<string, string>)[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={!form.name || !form.roll_number || loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <UserPlus size={18} />
          {loading ? t("registering") : t("registerBtn")}
        </button>
      </form>

      {/* Results Alert */}
      {result && (
        <div
          className={`mt-5 p-4 rounded-xl border ${
            result.success
              ? "bg-emerald-50 border-emerald-200"
              : "bg-red-50 border-red-200"
          }`}
        >
          {result.success ? (
            <div>
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-emerald-800">
                    {t("successReg")}
                  </p>
                  <p className="text-sm text-emerald-600 mt-1">
                    {t("shareCreds")}
                  </p>
                </div>
              </div>

              {result.student && (
                <div className="mt-4 bg-white rounded-lg border border-emerald-200 p-4 space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-gray-600">{t("nameLabel")}</span>{" "}
                    {result.student.name}
                  </p>
                  <p>
                    <span className="font-medium text-gray-600">{t("usernameLabel")}</span>{" "}
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-blue-700 font-mono">
                      {result.student.username}
                    </code>
                  </p>
                  <p>
                    <span className="font-medium text-gray-600">{t("passwordLabel")}</span>{" "}
                    <code className="bg-gray-100 px-2 py-0.5 rounded text-blue-700 font-mono">
                      {result.student.password}
                    </code>
                  </p>
                </div>
              )}

              {result.student && (
                <button
                  onClick={copyCredentials}
                  className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  <Copy size={16} />
                  {copied ? t("copied") : t("copyCreds")}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 mt-0.5 shrink-0" />
              <p className="font-medium text-red-800">{t("failedReg")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
