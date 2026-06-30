import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import * as api from "../lib/api";

export interface StudentUser {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  branch: string;
  academic_year: string;
  dob: string;
  contact: string;
  username: string;
  password: string;
}

interface User {
  username: string;
  role: "teacher" | "student";
  name?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registerTeacher: (name: string, username: string, password: string, institutionKey: string) => Promise<{ success: boolean; error?: string }>;
  isTeacher: boolean;
  isStudent: boolean;
  students: StudentUser[];
  addStudent: (data: Omit<StudentUser, "id" | "username" | "password">) => Promise<StudentUser>;
  ocrRegisterStudent: (file: File) => Promise<StudentUser>;
  removeStudent: (id: string) => Promise<void>;
}

const USER_KEY = "campusai_user";
const TOKEN_KEY = "campusai_token";

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [students, setStudents] = useState<StudentUser[]>([]);

  const fetchStudents = async () => {
    try {
      const res = await api.listStudents();
      const mapped = (res.students as unknown as Record<string, unknown>[]).map((s) => ({
        id: String(s.id),
        name: String(s.name ?? ""),
        roll_number: String(s.roll_number ?? ""),
        department: String(s.department ?? ""),
        branch: String(s.branch ?? ""),
        academic_year: String(s.academic_year ?? ""),
        dob: String(s.dob ?? ""),
        contact: String(s.contact ?? ""),
        username: String(s.roll_number ?? ""),
        password: String(s.roll_number ?? ""),
      }));
      setStudents(mapped);
    } catch (err) {
      console.error("Failed to load students", err);
    }
  };

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      // Load user language preference from backend dynamically
      api.getUserLanguage()
        .then((res) => {
          if (res.language) {
            i18n.changeLanguage(res.language);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch user language at root:", err);
        });

      if (user.role === "teacher") {
        fetchStudents();
      } else {
        setStudents([]);
      }
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      setStudents([]);
    }
  }, [user, i18n]);

  async function registerTeacher(name: string, username: string, password: string, institutionKey: string) {
    try {
      const res = await api.teacherRegister(name, username, password, institutionKey);
      if (res.success) {
        return { success: true };
      }
      return { success: false, error: "Registration failed" };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Registration failed" };
    }
  }

  async function login(username: string, password: string) {
    try {
      const res = await api.login(username, password);
      if (res.success && res.access_token) {
        localStorage.setItem(TOKEN_KEY, res.access_token);
        const loggedUser: User = {
          username: res.user?.username || username,
          role: res.user?.role === "teacher" ? "teacher" : "student",
          name: res.user?.name || username
        };
        setUser(loggedUser);
        return { success: true };
      }
      return { success: false, error: "Invalid credentials" };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : "Invalid credentials" };
    }
  }

  function logout() {
    setUser(null);
  }

  async function addStudent(data: Omit<StudentUser, "id" | "username" | "password">) {
    const password = data.roll_number;
    const created = await api.createStudentManual({
      ...data,
      password: password,
    });
    const mapped: StudentUser = {
      id: String(created.id),
      name: created.name,
      roll_number: created.roll_number,
      department: created.department || "",
      branch: created.branch || "",
      academic_year: created.academic_year || "",
      dob: created.dob || "",
      contact: created.contact || "",
      username: created.roll_number,
      password: password, // Show password once on manual registration to allow sharing credentials
    };
    setStudents((prev) => [...prev, mapped]);
    return mapped;
  }

  async function ocrRegisterStudent(file: File) {
    const res = await api.registerStudent(file);
    const s = res.student;
    const password = s.roll_number;
    const mapped: StudentUser = {
      id: String(s.id),
      name: s.name,
      roll_number: s.roll_number,
      department: s.department || "",
      branch: s.branch || "",
      academic_year: s.academic_year || "",
      dob: "",
      contact: "",
      username: s.roll_number,
      password: password,
    };
    setStudents((prev) => [...prev, mapped]);
    return mapped;
  }

  async function removeStudent(id: string) {
    try {
      await api.deleteStudent(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
      throw new Error("Failed to delete student");
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        registerTeacher,
        isTeacher: user?.role === "teacher",
        isStudent: user?.role === "student",
        students,
        addStudent,
        ocrRegisterStudent,
        removeStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
