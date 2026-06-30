import { FormEvent, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Film, Upload, CheckCircle, AlertCircle, ArrowLeft, Trash2, FileText, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as api from "../../lib/api";

interface Lecture {
  id: string;
  title: string;
  subject?: string;
  semester?: string;
  department?: string;
  unit?: string;
  topics?: string;
  keywords?: string;
  summary?: string;
  video_path: string;
  audio_path?: string;
  transcript_path?: string;
  transcript_content?: string;
  status: string;
  created_at: string;
}

export default function AdminUploadLecture() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(""); // kept for UI compatibility
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});

  async function loadLecturesData() {
    try {
      const data = await api.getVideos();
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
        video_path: String(d.video_path ?? ""),
        audio_path: d.audio_path != null ? String(d.audio_path) : undefined,
        transcript_path: d.transcript_path != null ? String(d.transcript_path) : undefined,
        transcript_content: d.transcript_content != null ? String(d.transcript_content) : undefined,
        status: String(d.status ?? ""),
        created_at: String(d.created_at ?? ""),
      }));
      setLectures(mapped);
    } catch (err) {
      console.error("Failed to load lectures", err);
    }
  }

  useEffect(() => {
    loadLecturesData();
  }, []);

  // Poll for lecture processing status updates
  useEffect(() => {
    const hasProcessing = lectures.some((l) => l.status === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      loadLecturesData();
    }, 5000);

    return () => clearInterval(interval);
  }, [lectures]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title || !file) return;
    setLoading(true);
    setResult(null);

    try {
      await api.uploadVideo(title, description, file);
      setResult({ success: true, message: "Lecture uploaded successfully and processing has started." });
      setTitle("");
      setDescription("");
      setFile(null);
      await loadLecturesData();
    } catch (err: unknown) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Video upload failed" });
    } finally {
      setLoading(false);
    }
  }

  async function removeLecture(id: string) {
    if (!confirm("Are you sure you want to delete this lecture?")) return;
    try {
      await api.deleteVideo(id);
      setLectures((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete video lecture");
    }
  }

  function toggleTranscript(id: string) {
    setExpandedTranscripts((prev) => ({ ...prev, [id]: !prev[id] }));
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
        <h2 className="text-2xl font-bold">{t("uploadLectureTitle")}</h2>
        <button
          onClick={loadLecturesData}
          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
          title="Refresh lectures list"
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
            {t("lectureTitle")}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Introduction to Algorithms"
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
            placeholder="Brief description of the lecture"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("lectureFile")}
          </label>
          <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
            <Upload size={24} className="text-gray-400 mb-1" />
            <span className="text-sm text-gray-500">
              {file ? file.name : t("clickSelectFile")}
            </span>
            <span className="text-xs text-gray-400 mt-1">
              {t("anyLectureFile")}
            </span>
            <input
              type="file"
              accept="video/*"
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
          {loading ? t("uploading") : t("uploadLectureBtn")}
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

      {lectures.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">
            {t("uploadedLecturesCount", { count: lectures.length })}
          </h3>
          <div className="space-y-4">
            {lectures.map((lecture) => {
              const isExpanded = !!expandedTranscripts[lecture.id];
              return (
                <div
                  key={lecture.id}
                  className="bg-white rounded-lg border border-gray-200 p-5 flex flex-col gap-4"
                >
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <Film size={20} className="text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 truncate">
                            {lecture.title}
                          </h4>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              lecture.status === "processing"
                                ? "bg-yellow-100 text-yellow-800 animate-pulse"
                                : lecture.status === "failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {t(lecture.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                          <span>{formatDate(lecture.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => removeLecture(lecture.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {lecture.status === "completed" && (
                    <div className="space-y-3">
                      <div className="bg-black rounded-lg overflow-hidden flex justify-center max-w-full">
                        <video
                          src={`/videos/${lecture.id}/download`}
                          controls
                          className="w-full max-h-[360px]"
                        />
                      </div>

                      <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1.5">
                        <div className="grid grid-cols-3 gap-2">
                          {lecture.subject && (
                            <div>
                              <span className="font-semibold text-gray-500">{t("subject")}:</span> {lecture.subject}
                            </div>
                          )}
                          {lecture.semester && (
                            <div>
                              <span className="font-semibold text-gray-500">{t("semester")}:</span> {lecture.semester}
                            </div>
                          )}
                          {lecture.unit && (
                            <div>
                              <span className="font-semibold text-gray-500">{t("unit")}:</span> {lecture.unit}
                            </div>
                          )}
                        </div>
                        {lecture.keywords && (
                          <div>
                            <span className="font-semibold text-gray-500">{t("keywords")}:</span>{" "}
                            <span className="italic text-gray-700">{lecture.keywords}</span>
                          </div>
                        )}
                        {lecture.topics && (
                          <div>
                            <span className="font-semibold text-gray-500">{t("topics")}:</span>{" "}
                            <span className="text-gray-700">{lecture.topics}</span>
                          </div>
                        )}
                        {lecture.summary && (
                          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1">
                            <span className="font-semibold text-gray-700 block mb-0.5">{t("summary")}</span>
                            <p className="text-gray-600 leading-relaxed font-normal">{lecture.summary}</p>
                          </div>
                        )}

                        {lecture.transcript_content && (
                          <div className="border border-gray-200 rounded-lg mt-2 overflow-hidden bg-white">
                            <button
                              type="button"
                              onClick={() => toggleTranscript(lecture.id)}
                              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors font-semibold"
                            >
                              <span className="flex items-center gap-1.5">
                                <FileText size={14} className="text-gray-500" />
                                Transcript
                              </span>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {isExpanded && (
                              <div className="p-3 text-gray-600 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed border-t border-gray-200">
                                {lecture.transcript_content}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {lecture.status === "failed" && (
                    <div className="text-xs text-red-600 italic bg-red-50 p-2 rounded border border-red-100">
                      {lecture.summary}
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
