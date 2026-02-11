const STORAGE_KEY = "revision-planner-v2";

const form = document.getElementById("subject-form");
const subjectNameInput = document.getElementById("subject-name");
const examDateInput = document.getElementById("exam-date");
const priorityInput = document.getElementById("priority");
const chaptersInput = document.getElementById("chapters");
const formMsg = document.getElementById("form-msg");

const stats = document.getElementById("stats");
const todayDate = document.getElementById("today-date");
const todayList = document.getElementById("today-list");
const todayEmpty = document.getElementById("today-empty");
const futureList = document.getElementById("future-list");
const futureEmpty = document.getElementById("future-empty");
const subjectList = document.getElementById("subject-list");
const resetBtn = document.getElementById("reset-btn");

const state = loadState();

boot();

function boot() {
  todayDate.textContent = formatDate(new Date());

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    createSubject();
  });

  resetBtn.addEventListener("click", () => {
    if (!window.confirm("Supprimer toutes les matières et les tâches ?")) {
      return;
    }

    state.subjects = [];
    state.completed = {};
    persist();
    renderAll();
    notify("Toutes les données ont été supprimées.");
  });

  renderAll();
}

function createSubject() {
  const subjectName = subjectNameInput.value.trim();
  const examDate = examDateInput.value;
  const priority = priorityInput.value;
  const chapters = chaptersInput.value
    .split("\n")
    .map((chapter) => chapter.trim())
    .filter(Boolean)
    .slice(0, 30);

  if (!subjectName || !examDate || chapters.length === 0) {
    notify("Remplis tous les champs.");
    return;
  }

  const exam = parseISODate(examDate);
  const today = startOfDay(new Date());
  if (!exam || exam < today) {
    notify("Choisis une date d'examen à partir d'aujourd'hui.");
    return;
  }

  const subject = {
    id: uid(),
    subjectName,
    examDate,
    priority,
    chapters,
    tasks: generateTasks(subjectName, chapters, examDate, priority)
  };

  state.subjects.unshift(subject);
  persist();
  renderAll();

  notify(`${subject.tasks.length} sessions générées pour ${subjectName}.`);
  form.reset();
}

function generateTasks(subjectName, chapters, examISO, priority) {
  const examDate = parseISODate(examISO);
  const checkpoints = [21, 14, 7, 3, 1];
  const today = startOfDay(new Date());

  return chapters.flatMap((chapter) => {
    const slots = checkpoints
      .map((offset) => ({ offset, date: minusDays(examDate, offset) }))
      .filter((slot) => slot.date >= today);

    if (slots.length === 0) {
      return [
        createTask(subjectName, chapter, today, "Révision express", priority)
      ];
    }

    return slots.map((slot) => createTask(
      subjectName,
      chapter,
      slot.date,
      `J-${slot.offset}`,
      priority
    ));
  });
}

function createTask(subjectName, chapter, date, prefix, priority) {
  return {
    id: uid(),
    subjectName,
    chapter,
    date: toISODate(date),
    title: `${prefix} : ${chapter}`,
    priority
  };
}

function renderAll() {
  renderStats();
  renderToday();
  renderFuture();
  renderSubjects();
}

function renderStats() {
  const tasks = allTasks();
  const completedCount = tasks.filter((task) => state.completed[task.id]).length;
  stats.innerHTML = `
    <article class="stat"><strong>${state.subjects.length}</strong><span>Matières</span></article>
    <article class="stat"><strong>${tasks.length}</strong><span>Sessions</span></article>
    <article class="stat"><strong>${completedCount}</strong><span>Terminées</span></article>
  `;
}

function renderToday() {
  todayList.innerHTML = "";

  const todayISO = toISODate(new Date());
  const tasks = allTasks()
    .filter((task) => task.date === todayISO)
    .sort(sortBySubject);

  if (tasks.length === 0) {
    todayEmpty.style.display = "block";
    return;
  }

  todayEmpty.style.display = "none";

  tasks.forEach((task) => {
    const li = document.createElement("li");
    const checked = Boolean(state.completed[task.id]);
    li.className = `task${checked ? " done" : ""}${task.priority === "haute" ? " high" : ""}`;

    li.innerHTML = `
      <label>
        <input type="checkbox" ${checked ? "checked" : ""}>
        <span>
          <span class="title">${escapeHtml(task.title)}</span>
          <span class="meta">${escapeHtml(task.subjectName)} • ${task.priority}</span>
        </span>
      </label>
    `;

    const checkbox = li.querySelector("input");
    checkbox.addEventListener("change", () => {
      state.completed[task.id] = checkbox.checked;
      persist();
      renderAll();
    });

    todayList.appendChild(li);
  });
}

function renderFuture() {
  futureList.innerHTML = "";

  const now = startOfDay(new Date());
  const limit = plusDays(now, 7);
  const tasks = allTasks().filter((task) => {
    const date = parseISODate(task.date);
    return date > now && date <= limit;
  });

  if (tasks.length === 0) {
    futureEmpty.style.display = "block";
    return;
  }

  futureEmpty.style.display = "none";

  const grouped = groupBy(tasks, (task) => task.date);
  Object.keys(grouped).sort().forEach((isoDate) => {
    const block = document.createElement("article");
    block.className = "future-day";

    const title = document.createElement("h3");
    title.className = "date-title";
    title.textContent = formatDate(isoDate);

    const ul = document.createElement("ul");

    grouped[isoDate].sort(sortBySubject).forEach((task) => {
      const li = document.createElement("li");
      li.textContent = `${task.subjectName} — ${task.chapter}`;
      ul.appendChild(li);
    });

    block.append(title, ul);
    futureList.appendChild(block);
  });
}

function renderSubjects() {
  subjectList.innerHTML = "";

  if (state.subjects.length === 0) {
    subjectList.innerHTML = "<li class='empty'>Aucune matière enregistrée.</li>";
    return;
  }

  state.subjects.forEach((subject) => {
    const li = document.createElement("li");
    li.className = "subject";
    li.innerHTML = `
      <div class="subject-line">
        <strong>${escapeHtml(subject.subjectName)}</strong>
        <button class="delete-subject" type="button" data-subject-id="${subject.id}">Supprimer</button>
      </div>
      <p class="meta">Examen : ${formatDate(subject.examDate)} • ${subject.chapters.length} chapitres • ${subject.priority}</p>
    `;

    li.querySelector("button").addEventListener("click", () => {
      deleteSubject(subject.id);
    });

    subjectList.appendChild(li);
  });
}

function deleteSubject(subjectId) {
  const target = state.subjects.find((subject) => subject.id === subjectId);
  if (!target) return;

  if (!window.confirm(`Supprimer ${target.subjectName} et ses tâches ?`)) {
    return;
  }

  const taskIds = new Set(target.tasks.map((task) => task.id));
  state.subjects = state.subjects.filter((subject) => subject.id !== subjectId);
  Object.keys(state.completed).forEach((taskId) => {
    if (taskIds.has(taskId)) {
      delete state.completed[taskId];
    }
  });

  persist();
  renderAll();
  notify(`${target.subjectName} supprimée.`);
}

function allTasks() {
  return state.subjects.flatMap((subject) => subject.tasks);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { subjects: [], completed: {} };

  try {
    const data = JSON.parse(raw);
    return {
      subjects: Array.isArray(data.subjects) ? data.subjects : [],
      completed: data.completed && typeof data.completed === "object" ? data.completed : {}
    };
  } catch {
    return { subjects: [], completed: {} };
  }
}

function notify(message) {
  formMsg.textContent = message;
}

function sortBySubject(a, b) {
  return a.subjectName.localeCompare(b.subjectName, "fr");
}

function formatDate(value) {
  const date = typeof value === "string" ? parseISODate(value) : value;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(date);
}

function parseISODate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function plusDays(date, days) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function minusDays(date, days) {
  const copy = startOfDay(date);
  copy.setDate(copy.getDate() - days);
  return copy;
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
