import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Upload, CheckCircle, AlertCircle, ArrowLeft, Download, RefreshCw, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import * as api from "../lib/api";

interface SyllabusItem {
  id: string;
  subject: string;
  code: string;
  semester?: string;
  department?: string;
  units?: string;
  learning_outcomes?: string;
  reference_books?: string;
  file_path: string;
  created_at: string;
}

export default function Syllabus() {
  const { t } = useTranslation();
  const { isTeacher } = useAuth();
  const navigate = useNavigate();

  const [syllabusList, setSyllabusList] = useState<SyllabusItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function loadSyllabusData() {
    try {
      const data = await api.getSyllabi();
      const mapped = data.map((d: Record<string, unknown>) => ({
        id: String(d.id),
        subject: String(d.subject ?? ""),
        code: String(d.code ?? ""),
        semester: d.semester != null ? String(d.semester) : undefined,
        department: d.department != null ? String(d.department) : undefined,
        units: d.units != null ? String(d.units) : undefined,
        learning_outcomes: d.learning_outcomes != null ? String(d.learning_outcomes) : undefined,
        reference_books: d.reference_books != null ? String(d.reference_books) : undefined,
        file_path: String(d.file_path ?? ""),
        created_at: String(d.created_at ?? ""),
      }));
      setSyllabusList(mapped);
    } catch (err) {
      console.error("Failed to load syllabi", err);
    }
  }

  useEffect(() => {
    loadSyllabusData();
  }, []);

  // Poll syllabus status if any syllabus is still processing
  useEffect(() => {
    const hasProcessing = syllabusList.some(
      (s) => s.units === "Parsing syllabus content and topics..." || s.code.startsWith("PENDING-")
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadSyllabusData();
    }, 5000);

    return () => clearInterval(interval);
  }, [syllabusList]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);

    try {
      await api.uploadSyllabus(file);
      setResult({ success: true, message: "Syllabus uploaded and processing has started." });
      setFile(null);
      await loadSyllabusData();
    } catch (err: unknown) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Failed to upload syllabus" });
    } finally {
      setLoading(false);
    }
  }

  function isProcessing(item: SyllabusItem) {
    return item.units === "Parsing syllabus content and topics..." || item.code.startsWith("PENDING-");
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen size={24} className="text-blue-600" />
          {t("courseSyllabi")}
        </h2>
        <button
          onClick={loadSyllabusData}
          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
          title="Refresh Syllabus list"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Admin Upload Syllabus Box */}
      {isTeacher && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 border-b border-gray-150 pb-2">
            <Upload size={18} className="text-blue-500" />
            {t("syllabusUpload")}
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Syllabus PDF
            </label>
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
              <Upload size={24} className="text-gray-400 mb-1" />
              <span className="text-sm text-gray-500">
                {file ? file.name : t("clickSelectFile")}
              </span>
              <span className="text-xs text-gray-400 mt-1">
                Only PDF syllabus files are supported
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={!file || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Upload size={18} />
            {loading ? t("uploading") : t("syllabusUpload")}
          </button>

          {result && (
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${result.success ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {result.message}
            </div>
          )}
        </form>
      )}

      {/* Syllabus List */}
      <div className="space-y-4">
        {syllabusList.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            No course syllabi uploaded yet.
          </div>
        ) : (
          syllabusList.map((item) => {
            const processing = isProcessing(item);
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{item.subject}</h4>
                        {!processing && (
                          <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono font-bold">
                            {item.code}
                          </code>
                        )}
                        {processing && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full animate-pulse">
                            Processing
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Uploaded {formatDate(item.created_at)}</p>
                    </div>
                  </div>
                  <a
                    href={`/syllabus/${item.id}/download`}
                    download={item.subject + ".pdf"}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors shrink-0"
                  >
                    <Download size={14} />
                    {t("download")}
                  </a>
                </div>

                {!processing && (
                  <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-gray-700">
                      {item.semester && (
                        <div>
                          <span className="font-semibold text-gray-500">{t("semester")}:</span> {item.semester}
                        </div>
                      )}
                      {item.department && (
                        <div>
                          <span className="font-semibold text-gray-500">{t("department")}:</span> {item.department}
                        </div>
                      )}
                    </div>
                    {item.learning_outcomes && (
                      <div>
                        <span className="font-semibold text-gray-500 block mb-0.5">{t("learningOutcomes")}:</span>
                        <p className="bg-gray-50 p-2 rounded text-gray-600 leading-relaxed font-normal">{item.learning_outcomes}</p>
                      </div>
                    )}
                    {item.reference_books && (
                      <div>
                        <span className="font-semibold text-gray-500 block mb-0.5">{t("referenceBooks")}:</span>
                        <p className="bg-gray-50 p-2 rounded text-gray-600 leading-relaxed font-normal whitespace-pre-wrap">{item.reference_books}</p>
                      </div>
                    )}
                    {item.units && (
                      <div>
                        <span className="font-semibold text-gray-500 block mb-0.5">{t("units")}:</span>
                        <p className="bg-gray-50 p-2 rounded text-gray-600 leading-relaxed font-normal whitespace-pre-wrap">{item.units}</p>
                      </div>
                    )}
                  </div>
                )}

                {processing && (
                  <p className="text-xs text-yellow-600 italic bg-yellow-50 p-2 rounded border border-yellow-100">
                    {item.units}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
