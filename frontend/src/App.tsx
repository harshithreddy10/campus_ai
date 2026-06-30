import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminRegisterStudent from "./pages/admin/RegisterStudent";
import AdminStudentsList from "./pages/admin/StudentsList";
import AdminUploadLecture from "./pages/admin/UploadLecture";
import AdminUploadNotes from "./pages/admin/UploadNotes";
import StudentDashboard from "./pages/student/Dashboard";
import Settings from "./pages/Settings";
import Syllabus from "./pages/Syllabus";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { isTeacher, isStudent } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout>
              <Dashboard />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/admin/students/register"
        element={
          <RequireAuth>
            <Layout>
              {isTeacher ? <AdminRegisterStudent /> : <Navigate to="/" replace />}
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/admin/students"
        element={
          <RequireAuth>
            <Layout>
              {isTeacher ? <AdminStudentsList /> : <Navigate to="/" replace />}
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/admin/lectures/upload"
        element={
          <RequireAuth>
            <Layout>
              {isTeacher ? <AdminUploadLecture /> : <Navigate to="/" replace />}
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/admin/notes/upload"
        element={
          <RequireAuth>
            <Layout>
              {isTeacher ? <AdminUploadNotes /> : <Navigate to="/" replace />}
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/student"
        element={
          <RequireAuth>
            <Layout>
              {isStudent ? <StudentDashboard /> : <Navigate to="/" replace />}
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/syllabus"
        element={
          <RequireAuth>
            <Layout>
              <Syllabus />
            </Layout>
          </RequireAuth>
        }
      />

      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Layout>
              <Settings />
            </Layout>
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
