const BASE = import.meta.env.VITE_API_URL || "";

export interface Student {
  id: string;
  name: string;
  roll_number: string;
  department: string;
  branch: string;
  academic_year: string;
  dob: string;
  contact: string;
  doc_path: string;
}

export interface Note {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileData: string;  // Matches local storage preview if needed, but we stream file path or content from backend
  fileType: string;
  uploadedAt: string;
  subject?: string;
  semester?: string;
  unit?: string;
  topics?: string;
  keywords?: string;
  summary?: string;
}

export interface Lecture {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileData: string;
  fileType: string;
  uploadedAt: string;
  subject?: string;
  semester?: string;
  unit?: string;
  topics?: string;
  keywords?: string;
  summary?: string;
  status?: string;
}

function getHeaders(isJson = true): HeadersInit {
  const token = localStorage.getItem("campusai_token");
  const headers: Record<string, string> = {};
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}

export async function teacherRegister(
  name: string,
  username: string,
  password: string,
  institutionKey: string
): Promise<{ success: boolean; teacher?: { id: string; name: string; username: string } }> {
  const res = await fetch(`${BASE}/auth/teacher/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, username, password, institution_key: institutionKey }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Registration failed");
  }
  return res.json();
}

export async function login(
  username: string,
  password: string
): Promise<{ success: boolean; access_token: string; user?: { username: string; role: string; name: string } }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }
  return res.json();
}

// Student CRUD
export async function registerStudent(
  file: File,
  extra?: {
    name: string;
    roll_number: string;
    department: string;
    branch: string;
    academic_year: string;
    dob?: string;
    contact?: string;
  }
): Promise<{ success: boolean; student: Student; password?: string }> {
  const form = new FormData();
  form.append("file", file);
  if (extra) {
    Object.entries(extra).forEach(([k, v]) => {
      if (v) form.append(k, v);
    });
  }
  const token = localStorage.getItem("campusai_token");
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/students/register`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Student registration failed");
  }
  return res.json();
}

export async function createStudentManual(data: Record<string, unknown>): Promise<Student> {
  const res = await fetch(`${BASE}/students`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Creating student failed");
  }
  return res.json();
}

export async function listStudents(): Promise<{ students: Student[] }> {
  const res = await fetch(`${BASE}/students`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to load students list");
  }
  return res.json();
}

export async function deleteStudent(id: string): Promise<void> {
  const res = await fetch(`${BASE}/students/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to delete student");
  }
}

// Study Materials
export async function uploadMaterial(_title: string, _description: string, file: File): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("file", file);
  // Backend placeholder values or title overrides can be handled
  const token = localStorage.getItem("campusai_token");
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/materials/upload`, {
    method: "POST",
    headers,
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Notes upload failed");
  }
  return res.json();
}

export async function getMaterials(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/materials`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch notes");
  }
  return res.json();
}

export async function deleteMaterial(id: string): Promise<void> {
  const res = await fetch(`${BASE}/materials/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to delete notes");
  }
}

// Video Lectures
export async function uploadVideo(_title: string, _description: string, file: File): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("file", file);
  const token = localStorage.getItem("campusai_token");
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/videos/upload`, {
    method: "POST",
    headers,
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Video upload failed");
  }
  return res.json();
}

export async function getVideos(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/videos`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch videos");
  }
  return res.json();
}

export async function deleteVideo(id: string): Promise<void> {
  const res = await fetch(`${BASE}/videos/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to delete video");
  }
}

// Search
export async function searchAcademic(q: string, category?: string): Promise<Record<string, unknown>> {
  let url = `${BASE}/search?q=${encodeURIComponent(q)}`;
  if (category) {
    url += `&category=${category}`;
  }
  const res = await fetch(url, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Search query failed");
  }
  return res.json();
}

// Settings
export async function getSettings(): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/settings`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch settings");
  }
  return res.json();
}

export async function updateSettings(data: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/settings`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    throw new Error("Failed to update settings");
  }
  return res.json();
}

export async function getUserLanguage(): Promise<{ language: string }> {
  const res = await fetch(`${BASE}/settings/language`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch user language");
  }
  return res.json();
}

export async function updateUserLanguage(language: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/settings/language`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ language }),
  });
  if (!res.ok) {
    throw new Error("Failed to update user language");
  }
  return res.json();
}

export async function changePassword(old_password: string, new_password: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/auth/change-password`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ old_password, new_password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to change password");
  }
  return res.json();
}

// Syllabus
export async function uploadSyllabus(file: File): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append("file", file);
  const token = localStorage.getItem("campusai_token");
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}/syllabus/upload`, {
    method: "POST",
    headers,
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Syllabus upload failed");
  }
  return res.json();
}

export async function getSyllabi(): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${BASE}/syllabus`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    throw new Error("Failed to fetch syllabi");
  }
  return res.json();
}
