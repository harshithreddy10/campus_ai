import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  UserPlus,
  Users,
  Film,
  BookOpen,
  LogOut,
  BookMarked,
  Settings as SettingsIcon,
  FileText
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";

const teacherNav = [
  { to: "/", tKey: "dashboard", icon: LayoutDashboard },
  { to: "/admin/students/register", tKey: "registerStudent", icon: UserPlus },
  { to: "/admin/students", tKey: "students", icon: Users },
  { to: "/admin/lectures/upload", tKey: "uploadLecture", icon: Film },
  { to: "/admin/notes/upload", tKey: "uploadNotes", icon: BookOpen },
  { to: "/syllabus", tKey: "syllabus", icon: FileText },
  { to: "/settings", tKey: "settings", icon: SettingsIcon },
];

const studentNav = [
  { to: "/", tKey: "dashboard", icon: LayoutDashboard },
  { to: "/student", tKey: "myContent", icon: BookMarked },
  { to: "/syllabus", tKey: "syllabus", icon: FileText },
  { to: "/settings", tKey: "settings", icon: SettingsIcon },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isTeacher, logout } = useAuth();

  if (!user) return <>{children}</>;

  const nav = isTeacher ? teacherNav : studentNav;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <GraduationCap className="text-blue-600" size={28} />
          <h1 className="text-xl font-bold tracking-tight">CampusAI</h1>
          <span className="hidden sm:inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            {user.role === "teacher" ? "Teacher" : "Student"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden sm:inline">
            {user.name || user.username}
          </span>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">{t("logout")}</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-56 bg-white border-r border-gray-200 p-4 hidden md:flex flex-col gap-1">
          {nav.map(({ to, tKey, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === to
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={18} />
              {t(tKey)}
            </Link>
          ))}
        </aside>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
