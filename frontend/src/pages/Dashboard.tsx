import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UserPlus,
  Users,
  Film,
  BookOpen,
  Activity,
  BookMarked,
} from "lucide-react";
import { healthCheck } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const teacherCards = [
  {
    title: "Register Student",
    desc: "Register a new student and generate credentials",
    icon: UserPlus,
    to: "/admin/students/register",
    color: "bg-blue-500",
  },
  {
    title: "View Students",
    desc: "Manage registered students and their credentials",
    icon: Users,
    to: "/admin/students",
    color: "bg-emerald-500",
  },
  {
    title: "Upload Lecture",
    desc: "Upload lecture videos and materials",
    icon: Film,
    to: "/admin/lectures/upload",
    color: "bg-indigo-500",
  },
  {
    title: "Upload Notes",
    desc: "Upload lecture notes and study materials",
    icon: BookOpen,
    to: "/admin/notes/upload",
    color: "bg-amber-500",
  },
];

const studentCards = [
  {
    title: "My Content",
    desc: "Browse lectures and notes uploaded for you",
    icon: BookMarked,
    to: "/student",
    color: "bg-blue-500",
  },
];

export default function Dashboard() {
  const { user, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [health, setHealth] = useState<string>("checking...");

  useEffect(() => {
    healthCheck()
      .then((d) => setHealth(d.message))
      .catch(() => setHealth("offline"));
  }, []);

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const cards = isTeacher ? teacherCards : studentCards;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">
            Welcome, {isTeacher ? user.name || "Teacher" : user.name || "Student"}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {isTeacher
              ? "Manage students, lectures, and study materials."
              : "Access your learning materials."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-gray-400" />
          <span className="text-sm text-gray-500">
            Server:{" "}
            <span className="font-medium text-gray-700">{health}</span>
          </span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map(({ title, desc, icon: Icon, to, color }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow text-left w-full"
          >
            <div
              className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-3`}
            >
              <Icon size={20} className="text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
