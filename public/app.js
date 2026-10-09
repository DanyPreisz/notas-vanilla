const TOKEN_KEY = "notas-token";
const notesEl = document.querySelector("#notes");
const countEl = document.querySelector("#count");
const form = document.querySelector("#form");
const empty = document.querySelector("#empty");
const titleEl = document.querySelector("#title");
const bodyEl = document.querySelector("#body");
const metaEl = document.querySelector("#meta");
const errorEl = document.querySelector("#error");
const deleteBtn = document.querySelector("#delete");
const searchEl = document.querySelector("#search");

const state = {
  notes: [],
  selectedId: null,
  query: "",
};

function authHeaders() {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (response.status === 401) {
    const token = prompt("Token de acceso");
    if (!token) throw new Error("No autorizado");
    sessionStorage.setItem(TOKEN_KEY, token.trim());
    return api(path, options);
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "No se pudo completar la operación");
  return data;
}

function formatDate(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function visibleNotes() {
  const q = state.query.trim().toLowerCase();
  if (!q) return state.notes;
  return state.notes.filter((note) => `${note.title} ${note.body}`.toLowerCase().includes(q));
}

function renderList() {
  const notes = visibleNotes();
  countEl.textContent = notes.length === 1 ? "1 nota" : `${notes.length} notas`;
  notesEl.innerHTML = "";
  if (!notes.length) {
    const li = document.createElement("li");
    li.textContent = state.notes.length ? "Sin resultados." : "Todavía no hay notas.";
    li.style.color = "#6f675c";
    li.style.padding = "8px";
    notesEl.append(li);
    return;
  }
  for (const note of notes) {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    if (note.id === state.selectedId) button.classList.add("active");
    const title = document.createElement("strong");
    title.textContent = note.title;
    const preview = document.createElement("span");
    preview.textContent = note.body;
    button.append(title, preview);
    button.addEventListener("click", () => openNote(note.id));
    li.append(button);
    notesEl.append(li);
  }
}

function openNote(id) {
  const note = state.notes.find((item) => item.id === id);
  state.selectedId = id;
  form.hidden = false;
  empty.hidden = true;
  deleteBtn.hidden = false;
  errorEl.hidden = true;
  titleEl.value = note ? note.title : "";
  bodyEl.value = note ? note.body : "";
  metaEl.textContent = note
    ? `Creada ${formatDate(note.createdAt)} · editada ${formatDate(note.updatedAt)}`
    : "";
  renderList();
  titleEl.focus();
}

function openNew() {
  state.selectedId = null;
  form.hidden = false;
  empty.hidden = true;
  deleteBtn.hidden = true;
  errorEl.hidden = true;
  form.reset();
  metaEl.textContent = "Nota nueva";
  renderList();
  titleEl.focus();
}

function closeEditor() {
  state.selectedId = null;
  form.hidden = true;
  empty.hidden = false;
  renderList();
}

async function loadNotes() {
  const data = await api("/api/notes");
  state.notes = data.notes || [];
  if (state.selectedId && !state.notes.some((note) => note.id === state.selectedId)) closeEditor();
  renderList();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.hidden = true;
  const payload = { title: titleEl.value, body: bodyEl.value };
  try {
    if (state.selectedId) {
      await api(`/api/notes/${state.selectedId}`, { method: "PUT", body: JSON.stringify(payload) });
    } else {
      const data = await api("/api/notes", { method: "POST", body: JSON.stringify(payload) });
      state.selectedId = data.note.id;
    }
    await loadNotes();
    if (state.selectedId) openNote(state.selectedId);
  } catch (error) {
    errorEl.hidden = false;
    errorEl.textContent = error.message;
  }
});

deleteBtn.addEventListener("click", async () => {
  if (!state.selectedId || !confirm("¿Borrar esta nota?")) return;
  try {
    await api(`/api/notes/${state.selectedId}`, { method: "DELETE" });
    closeEditor();
    await loadNotes();
  } catch (error) {
    errorEl.hidden = false;
    errorEl.textContent = error.message;
  }
});

document.querySelector("#new-note").addEventListener("click", openNew);
document.querySelector("#cancel").addEventListener("click", closeEditor);
searchEl.addEventListener("input", () => {
  state.query = searchEl.value;
  renderList();
});

loadNotes().catch((error) => {
  countEl.textContent = error.message;
});
