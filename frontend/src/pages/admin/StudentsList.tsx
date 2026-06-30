import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, ArrowLeft, Copy, Check, Trash2, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth, type StudentUser } from "../../context/AuthContext";

export default function AdminStudentsList() {
  const { t } = useTranslation();
  const { students, removeStudent } = useAuth();
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyStudent(s: StudentUser) {
    const text = `Name: ${s.name}\nUsername: ${s.username}\nPassword: ${s.password}\nRoll: ${s.roll_number}`;
    await navigator.clipboard.writeText(text);
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function togglePw(id: string) {
    setShowPw((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} />
        {t("dashboard")}
      </button>

      <h2 className="text-2xl font-bold mb-6">
        {t("registeredStudents")} ({students.length})
      </h2>

      {students.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">{t("noStudents")}</p>
          <button
            onClick={() => navigate("/admin/students/register")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            {t("registerStudent")}
          </button>
        </div>
      )}

      {students.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                  <th className="p-3 font-medium">{t("fullName")}</th>
                  <th className="p-3 font-medium">{t("rollNumber")}</th>
                  <th className="p-3 font-medium">{t("department")}</th>
                  <th className="p-3 font-medium">{t("usernameLabel").slice(0, -1)}</th>
                  <th className="p-3 font-medium">{t("passwordLabel").slice(0, -1)}</th>
                  <th className="p-3 font-medium text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{s.name}</td>
                    <td className="p-3 text-gray-600">{s.roll_number}</td>
                    <td className="p-3 text-gray-600">{s.department}</td>
                    <td className="p-3">
                      <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 font-mono text-xs">
                        {s.username}
                      </code>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 font-mono text-xs">
                          {showPw[s.id] ? s.password : "••••••••"}
                        </code>
                        <button
                          onClick={() => togglePw(s.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {showPw[s.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => copyStudent(s)}
                          className="text-gray-400 hover:text-blue-600"
                          title={t("copyCreds")}
                        >
                          {copiedId === s.id ? (
                            <Check size={16} className="text-emerald-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${s.name}?`)) {
                              removeStudent(s.id).catch((err) => alert(err.message));
                            }
                          }}
                          className="text-gray-400 hover:text-red-600"
                          title="Remove student"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
