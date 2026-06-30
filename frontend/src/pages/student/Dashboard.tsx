import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { BookOpen, Film, FileText, Download, Search, RefreshCw, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import * as api from "../../lib/api";

interface Item {
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
  status?: string;
  uploadedAt?: string;
  kind: "lecture" | "note";
}

export default function StudentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [lectures, setLectures] = useState<Item[]>([]);
  const [notes, setNotes] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "lectures" | "notes">("all");
  const [loading, setLoading] = useState(false);

  // Filters
  const [subjectFilter, setSubjectFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  // All unique subjects and semesters gathered from data to populate filter options
  const [uniqueSubjects, setUniqueSubjects] = useState<string[]>([]);
  const [uniqueSemesters, setUniqueSemesters] = useState<string[]>([]);

  // Search Results from backend
  const [searchResults, setSearchResults] = useState<{
    lectures: Item[];
    notes: Item[];
  } | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const notesData = await api.getMaterials();
      const lecturesData = await api.getVideos();

      const mappedNotes = notesData.map((d: Record<string, unknown>) => ({
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
        status: d.status != null ? String(d.status) : undefined,
        uploadedAt: d.uploadedAt != null ? String(d.uploadedAt) : undefined,
        kind: "note" as const,
      }));

      const mappedLectures = lecturesData
        .filter((d: Record<string, unknown>) => d.status === "completed")
        .map((d: Record<string, unknown>) => ({
          id: String(d.id),
          title: String(d.title ?? ""),
          subject: d.subject != null ? String(d.subject) : undefined,
          semester: d.semester != null ? String(d.semester) : undefined,
          department: d.department != null ? String(d.department) : undefined,
          unit: d.unit != null ? String(d.unit) : undefined,
          topics: d.topics != null ? String(d.topics) : undefined,
          keywords: d.keywords != null ? String(d.keywords) : undefined,
          summary: d.summary != null ? String(d.summary) : undefined,
          file_path: String(d.video_path ?? ""),
          file_type: "MP4",
          created_at: String(d.created_at ?? ""),
          status: String(d.status ?? ""),
          uploadedAt: d.uploadedAt != null ? String(d.uploadedAt) : undefined,
          kind: "lecture" as const,
        }));

      setNotes(mappedNotes);
      setLectures(mappedLectures);

      // Collect subjects and semesters
      const allItems = [...mappedNotes, ...mappedLectures];
      const subjects = Array.from(new Set(allItems.map((i) => i.subject).filter(Boolean))) as string[];
      const semesters = Array.from(new Set(allItems.map((i) => i.semester).filter(Boolean))) as string[];
      setUniqueSubjects(subjects);
      setUniqueSemesters(semesters);
    } catch (err) {
      console.error("Failed to load content", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handle Search Input or Filter Changes
  useEffect(() => {
    if (!search.trim()) {
      setSearchResults(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const category = tab === "notes" ? "materials" : tab === "lectures" ? "videos" : undefined;
        const res = await api.searchAcademic(
          search,
          category
        ) as Record<string, unknown>;
        // Map search results
        const results = (res.results as Record<string, unknown>) || {};
        const rawMaterials = (results.materials as Record<string, unknown>[]) || [];
        const rawVideos = (results.videos as Record<string, unknown>[]) || [];

        const searchLectures = rawVideos
          .filter((d: Record<string, unknown>) => d.status === "completed")
          .map((d: Record<string, unknown>) => ({
            id: String(d.id),
            title: String(d.title ?? ""),
            subject: d.subject != null ? String(d.subject) : undefined,
            semester: d.semester != null ? String(d.semester) : undefined,
            department: d.department != null ? String(d.department) : undefined,
            unit: d.unit != null ? String(d.unit) : undefined,
            topics: d.topics != null ? String(d.topics) : undefined,
            keywords: d.keywords != null ? String(d.keywords) : undefined,
            summary: d.summary != null ? String(d.summary) : undefined,
            file_path: String(d.video_path ?? ""),
            file_type: "MP4",
            created_at: String(d.created_at ?? ""),
            status: String(d.status ?? ""),
            uploadedAt: d.uploadedAt != null ? String(d.uploadedAt) : undefined,
            kind: "lecture" as const,
          }));

        const searchNotes = rawMaterials.map((d: Record<string, unknown>) => ({
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
          status: d.status != null ? String(d.status) : undefined,
          uploadedAt: d.uploadedAt != null ? String(d.uploadedAt) : undefined,
          kind: "note" as const,
        }));

        setSearchResults({
          lectures: searchLectures,
          notes: searchNotes,
        });
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, tab]);

  // Determine current active list
  const activeLectures = searchResults ? searchResults.lectures : lectures;
  const activeNotes = searchResults ? searchResults.notes : notes;

  const allItems = [
    ...activeLectures,
    ...activeNotes,
  ];

  // Apply visual filter logic (Subject and Semester filters)
  const filtered = allItems.filter((item) => {
    // Subject Filter
    if (subjectFilter && item.subject !== subjectFilter) {
      return false;
    }
    // Semester Filter
    if (semesterFilter && item.semester !== semesterFilter) {
      return false;
    }
    // Tab Filter
    if (tab === "lectures") return item.kind === "lecture";
    if (tab === "notes") return item.kind === "note";
    return true;
  }).sort((a, b) => new Date(b.created_at || b.uploadedAt || "").getTime() - new Date(a.created_at || a.uploadedAt || "").getTime());

  function formatDate(iso: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">
            {t("welcome")}, {user?.name || "Student"}
          </h2>
          <p className="text-gray-500 mt-1">
            Browse lectures and study materials uploaded by your instructor.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50"
          title="Refresh Content"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Search and Tab Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <div className="relative flex-1 w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
          {(["all", "lectures", "notes"] as const).map((tCode) => (
            <button
              key={tCode}
              onClick={() => setTab(tCode)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                tab === tCode
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t(tCode)}
            </button>
          ))}
        </div>
      </div>

      {/* Metadata Filters Row */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Subjects</option>
          {uniqueSubjects.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>

        <select
          value={semesterFilter}
          onChange={(e) => setSemesterFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Semesters</option>
          {uniqueSemesters.map((sem) => (
            <option key={sem} value={sem}>
              Semester {sem}
            </option>
          ))}
        </select>
      </div>

      {lectures.length === 0 && notes.length === 0 && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <BookOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {t("noContent")}
          </h3>
          <p className="text-gray-500 text-sm">
            {t("instructorNoUpload")}
          </p>
        </div>
      )}

      {filtered.length === 0 && (lectures.length > 0 || notes.length > 0) && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Search size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">{t("noResults")}</p>
        </div>
      )}

      {loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <span className="text-gray-400 text-sm animate-pulse">Loading academic resources...</span>
        </div>
      )}

      {/* Main content list */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow animate-fade-in"
          >
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  item.kind === "lecture" ? "bg-indigo-100" : "bg-amber-100"
                }`}
              >
                {item.kind === "lecture" ? (
                  <Film size={24} className="text-indigo-600" />
                ) : (
                  <FileText size={24} className="text-amber-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div>
                  <span
                    className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-1.5 ${
                      item.kind === "lecture"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {item.kind === "lecture" ? t("lectures").slice(0, -1) : t("notes").slice(0, -1)}
                  </span>
                  <h3 className="font-semibold text-gray-900 text-base">{item.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                    <span>{item.file_type}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.kind === "lecture" ? (
                  <a
                    href={`/videos/${item.id}/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
                  >
                    <Eye size={16} />
                    {t("watch")}
                  </a>
                ) : (
                  <a
                    href={`/materials/${item.id}/download`}
                    download={item.title}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
                  >
                    <Download size={16} />
                    {t("download")}
                  </a>
                )}
              </div>
            </div>

            {/* AI Academic Metadata Details */}
            <div className="pt-2 border-t border-gray-100 text-xs text-gray-600 space-y-1.5">
              <div className="grid grid-cols-3 gap-2">
                {item.subject && (
                  <div>
                    <span className="font-semibold text-gray-500">{t("subject")}:</span> {item.subject}
                  </div>
                )}
                {item.semester && (
                  <div>
                    <span className="font-semibold text-gray-500">{t("semester")}:</span> {item.semester}
                  </div>
                )}
                {item.unit && (
                  <div>
                    <span className="font-semibold text-gray-500">{t("unit")}:</span> {item.unit}
                  </div>
                )}
              </div>
              {item.keywords && (
                <div>
                  <span className="font-semibold text-gray-500">{t("keywords")}:</span>{" "}
                  <span className="italic text-gray-700">{item.keywords}</span>
                </div>
              )}
              {item.topics && (
                <div>
                  <span className="font-semibold text-gray-500">{t("topics")}:</span>{" "}
                  <span className="text-gray-700">{item.topics}</span>
                </div>
              )}
              {item.summary && (
                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-1">
                  <span className="font-semibold text-gray-750 block mb-0.5">{t("summary")}</span>
                  <p className="text-gray-600 leading-relaxed font-normal">{item.summary}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {(lectures.length > 0 || notes.length > 0) && (
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <Film size={20} className="mx-auto text-indigo-600 mb-1" />
            <p className="text-2xl font-bold text-gray-900">{lectures.length}</p>
            <p className="text-xs text-gray-500">{t("lectures")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <BookOpen size={20} className="mx-auto text-amber-600 mb-1" />
            <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
            <p className="text-xs text-gray-500">{t("notes")}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <Download size={20} className="mx-auto text-emerald-600 mb-1" />
            <p className="text-2xl font-bold text-gray-900">
              {lectures.length + notes.length}
            </p>
            <p className="text-xs text-gray-500">{t("totalItems")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
