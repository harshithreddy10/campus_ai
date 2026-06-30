import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Upload, CheckCircle, AlertCircle, ArrowLeft, Trash2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as api from "../../lib/api";

interface Note {
  id: string;
  title: string;
  subject?: string;
  semester?: string;
  department?: string;
  unit?: string;
  topics?: string;
  keywords?: string;
  summary?: string;
  file_path: string;
  file_type: string;
  created_at: string;
}

export default function AdminUploadNotes() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(""); // kept for compatibility with UI layout
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function loadNotesData() {
    try {
      const data = await api.getMaterials();
      const mapped = data.map((d: Record<string, unknown>) => ({
        id: String(d.id),
        title: String(d.title ?? ""),
        subject: d.subject != null ? String(d.subject) : undefined,
        semester: d.semester != null ? String(d.semester) : undefined,
        department: d.department != null ? String(d.department) : undefined,
        unit: d.unit != null ? String(d.unit) : undefined,
        topics: d.topics != null ? String(d.topics) : undefined,
        keywords: d.keywords != null ? String(d.keywords) : undefined,
        summary: d.summary != null ? String(d.summary) : undefined,
        file_path: String(d.file_path ?? ""),
        file_type: String(d.file_type ?? ""),
        created_at: String(d.created_at ?? ""),
      }));
      setNotes(mapped);
    } catch (err) {
      console.error("Failed to load notes", err);
    }
  }

  useEffect(() => {
    loadNotesData();
  }, []);

  // Poll for notes status if any note is still processing
  useEffect(() => {
    const hasProcessing = notes.some(
      (n) => getStatus(n.summary) === "Processing"
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadNotesData();
    }, 5000);

    return () => clearInterval(interval);
  }, [notes]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title || !file) return;
    setLoading(true);
    setResult(null);

    try {
      // Backend automatically takes title from filename, but we can upload
      await api.uploadMaterial(title, description, file);
      setResult({ success: true, message: t("successUpload") });
      setTitle("");
      setDescription("");
      setFile(null);
      await loadNotesData();
    } catch (err: unknown) {
      setResult({ success: false, message: err instanceof Error ? err.message : t("failedReadFile") });
    } finally {
      setLoading(false);
    }
  }

  async function removeNote(id: string) {
    if (!confirm("Are you sure you want to delete these notes?")) return;
    try {
      await api.deleteMaterial(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete notes");
    }
  }

  function getStatus(summary?: string) {
    if (!summary) return "Completed";
    if (summary.startsWith("Processing AI Analysis...")) return "Processing";
    if (summary.startsWith("Processing failed")) return "Failed";
    return "Completed";
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={16} />
        {t("dashboard")}
      </button>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{t("uploadNotesTitle")}</h2>
        <button
          onClick={loadNotesData}
          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
          title="Refresh Notes list"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("notesTitle")}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 1: Data Structures"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("descriptionOptional")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of these notes"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("notesFile")}
          </label>
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
            <Upload size={24} className="text-gray-400 mb-1" />
            <span className="text-sm text-gray-500">
              {file ? file.name : t("clickSelectFile")}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              {t("anyNotesFile")}
            </span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={!title || !file || loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Upload size={18} />
          {loading ? t("uploading") : t("uploadNotesBtn")}
        </button>

        {result && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              result.success
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {result.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {result.message}
          </div>
        )}
      </form>

      {notes.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">
            {t("uploadedNotesCount", { count: notes.length })}
          </h3>
          <div className="space-y-3">
            {notes.map((note) => {
              const status = getStatus(note.summary);
              return (
                <div
                  key={note.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <BookOpen size={20} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-gray-900 truncate">
                          {note.title}
                        </h4>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            status === "Processing"
                              ? "bg-yellow-100 text-yellow-800 animate-pulse"
                              : status === "Failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {t(status.toLowerCase())}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>{note.file_type}</span>
                        <span>{formatDate(note.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/materials/${note.id}/download`}
                        download={note.title}
                        className="px-3 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                      >
                        {t("download")}
                      </a>
                      <button
                        onClick={() => removeNote(note.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {status === "Completed" && (
                    <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1.5">
                      <div className="grid grid-cols-3 gap-2">
                        {note.subject && (
                          <div>
                            <span className="font-semibold text-gray-500">{t("subject")}:</span> {note.subject}
                          </div>
                        )}
                        {note.semester && (
                          <div>
                            <span className="font-semibold text-gray-500">{t("semester")}:</span> {note.semester}
                          </div>
                        )}
                        {note.unit && (
                          <div>
                            <span className="font-semibold text-gray-500">{t("unit")}:</span> {note.unit}
                          </div>
                        )}
                      </div>
                      {note.keywords && (
                        <div>
                          <span className="font-semibold text-gray-500">{t("keywords")}:</span>{" "}
                          <span className="italic text-gray-700">{note.keywords}</span>
                        </div>
                      )}
                      {note.topics && (
                        <div>
                          <span className="font-semibold text-gray-500">{t("topics")}:</span>{" "}
                          <span className="text-gray-700">{note.topics}</span>
                        </div>
                      )}
                      {note.summary && (
                        <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1">
                          <span className="font-semibold text-gray-700 block mb-0.5">{t("summary")}</span>
                          <p className="text-gray-600 leading-relaxed font-normal">{note.summary}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {status === "Failed" && (
                    <div className="mt-2 text-xs text-red-600 italic bg-red-50 p-2 rounded border border-red-100">
                      {note.summary}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
