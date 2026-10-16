
"use strict";

// ==========================================
// CAMPUSCARE — DASHBOARD & REPORT MANAGER
// ==========================================

const STORAGE_KEY = "campuscare-reports-v1";
const THEME_KEY = "campuscare-theme";

const $ = id => document.getElementById(id);

const reportList = $("report-list");
const problemForm = $("problem-form");
const searchInput = $("search");
const categoryFilter = $("category-filter");
const statusFilter = $("status-filter");
const sortFilter = $("sort-filter");
const formMessage = $("form-message");
const toast = $("toast");
const themeToggle = $("theme-toggle");

const validCategories = [
  "Classroom", "Cleanliness", "Water", "Electricity", "Other"
];
const validPriorities = ["High", "Medium", "Low"];
const priorityOrder = { High: 0, Medium: 1, Low: 2 };

let toastTimer;

// Sample data is used only when this app has never saved reports.
function getStarterReports() {
  const now = Date.now();

  return [
    {
      id: "demo-1",
      title: "Broken fan in classroom",
      category: "Classroom",
      location: "Block A · Room 204",
      description: "The ceiling fan is not working properly.",
      status: "Pending",
      priority: "High",
      createdAt: new Date(now - 1000 * 60 * 30).toISOString()
    },
    {
      id: "demo-2",
      title: "Water cooler needs attention",
      category: "Water",
      location: "Main Building · Ground Floor",
      description: "The water cooler needs maintenance.",
      status: "Pending",
      priority: "Medium",
      createdAt: new Date(now - 1000 * 60 * 60 * 4).toISOString()
    },
    {
      id: "demo-3",
      title: "Library lights repaired",
      category: "Electricity",
      location: "Central Library",
      description: "The lights in the reading area have been repaired.",
      status: "Resolved",
      priority: "Low",
      createdAt: new Date(now - 1000 * 60 * 60 * 24).toISOString()
    }
  ];
}

function loadReports() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === null) return getStarterReports();

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return getStarterReports();

    return parsed
      .filter(report =>
        report &&
        typeof report.id === "string" &&
        typeof report.title === "string" &&
        typeof report.description === "string" &&
        typeof report.location === "string" &&
        validCategories.includes(report.category) &&
        ["Pending", "Resolved"].includes(report.status)
      )
      .map(report => ({
        ...report,
        priority: validPriorities.includes(report.priority)
          ? report.priority
          : "Medium",
        createdAt: typeof report.createdAt === "string"
          ? report.createdAt
          : new Date().toISOString()
      }));
  } catch (error) {
    console.error("Could not load reports:", error);
    return getStarterReports();
  }
}

let reports = loadReports();

function saveReports() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
    return true;
  } catch (error) {
    console.error("Could not save reports:", error);
    showToast("Could not save changes. Check browser storage.");
    return false;
  }
}

// Safely display text supplied by users.
function makeText(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}


function formatDate(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}


// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function updateDashboard() {
  const total = reports.length;
  const pending = reports.filter(r => r.status === "Pending").length;
  const resolved = reports.filter(r => r.status === "Resolved").length;
  const rate = total === 0 ? 0 : Math.round((resolved / total) * 100);

  $("total-count").textContent = total;
  $("pending-count").textContent = pending;
  $("resolved-count").textContent = resolved;

  $("dash-total").textContent = total;
  $("dash-pending").textContent = pending;
  $("dash-resolved").textContent = resolved;
  $("resolution-rate").textContent = `${rate}%`;
  $("resolution-progress").style.width = `${rate}%`;

  const summary = $("category-summary");
  summary.replaceChildren();

  validCategories.forEach(category => {
    const count = reports.filter(r => r.category === category).length;
    const percent = total === 0 ? 0 : Math.round((count / total) * 100);

    const item = document.createElement("div");
    item.className = "category-stat";

    item.append(
      makeText("span", "category-name", category),
      makeText("strong", "", String(count))
    );

    const track = document.createElement("div");
    track.className = "category-track";

    const bar = document.createElement("span");
    bar.style.width = `${percent}%`;
    track.appendChild(bar);
    item.appendChild(track);
    summary.appendChild(item);
  });
}

// ==========================================
// SEARCH, FILTER & SORT
// ==========================================

function getVisibleReports() {
  const query = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const status = statusFilter.value;
  const sort = sortFilter.value;

  const result = reports.filter(report => {
    const text = [
      report.title,
      report.description,
      report.location,
      report.category,
      report.priority,
      report.status
    ].join(" ").toLowerCase();

    return (
      text.includes(query) &&
      (category === "All" || report.category === category) &&
      (status === "All" || report.status === status)
    );
  });

  result.sort((a, b) => {
    if (sort === "oldest") {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }

    if (sort === "priority") {
      const difference =
        priorityOrder[a.priority] - priorityOrder[b.priority];

      if (difference !== 0) return difference;
      return new Date(b.createdAt) - new Date(a.createdAt);
    }

    if (sort === "title") {
      return a.title.localeCompare(b.title);
    }

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return result;
}

// ==========================================
// REPORT CARDS
// ==========================================

function renderReports() {
  const visibleReports = getVisibleReports();

  reportList.replaceChildren();
  $("result-count").textContent =
    `${visibleReports.length} ${
      visibleReports.length === 1 ? "report" : "reports"
    }`;

  if (visibleReports.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    empty.append(
      makeText("span", "", "⌕"),
      makeText("h3", "", "No reports found"),
      makeText("p", "", reports.length
        ? "Try changing your search or filters."
        : "Submit the first report to get started.")
    );

    reportList.appendChild(empty);
    updateDashboard();
    return;
  }

  visibleReports.forEach(report => {
    const card = document.createElement("article");
    card.className = "report-card";

    const top = document.createElement("div");
    top.className = "card-top";

    top.append(
      makeText("span", "category-badge", report.category),
      makeText(
        "span",
        `priority-badge priority-${report.priority.toLowerCase()}`,
        `${report.priority} priority`
      ),
      makeText(
        "span",
        `status-badge status-${report.status.toLowerCase()}`,
        report.status
      )
    );

    const title = makeText("h3", "", report.title);
    const description = makeText("p", "", report.description);
    const location = makeText("div", "card-location", `📍 ${report.location}`);
    const date = makeText(
      "div",
      "card-location",
      `Reported ${formatDate(report.createdAt)}`
    );

    const actions = document.createElement("div");
    actions.className = "card-actions";

    
if (report.status === "Pending") {
  const resolveButton = makeText("button", "small-btn", "✓ Resolve");
  resolveButton.type = "button";
  resolveButton.setAttribute(
    "aria-label",
    `Resolve report: ${report.title}`
  );
  resolveButton.addEventListener("click", () => resolveReport(report.id));
  actions.appendChild(resolveButton);
} else {
  const resolvedLabel = makeText("span", "resolved-label", "✓ Completed");
  actions.appendChild(resolvedLabel);
}


    const deleteButton = makeText("button", "small-btn delete", "Delete");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteReport(report.id));
    actions.appendChild(deleteButton);

    card.append(top, title, description, location, date, actions);
    reportList.appendChild(card);
  });

  updateDashboard();
}

// ==========================================
// SUBMIT A REPORT
// ==========================================

problemForm.addEventListener("submit", event => {
  event.preventDefault();formMessage.textContent = "";
formMessage.className = "form-message";

  const title = $("title").value.trim();
  const category = $("category").value;
  const priority = $("priority").value;
  const location = $("location").value.trim();
  const description = $("description").value.trim();

  if (!title || !location || !description || !category || !priority) {
    formMessage.textContent = "Please complete every required field.";
    formMessage.className = "form-message error";
    return;
  }

  if (
    !validCategories.includes(category) ||
    !validPriorities.includes(priority)
  ) {
    formMessage.textContent = "Please choose valid category and priority values.";
    formMessage.className = "form-message error";
    return;
  }

  const newReport = {
    id: window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    category,
    priority,
    location,
    description,
    status: "Pending",
    createdAt: new Date().toISOString()
  };

  reports.unshift(newReport);

  if (!saveReports()) {
    reports.shift();
    return;
  }

  problemForm.reset();
  $("priority").value = "Medium";

  formMessage.textContent = "Your report has been submitted successfully!";
  formMessage.className = "form-message success";

  // Return filters to show the newly submitted report.
  searchInput.value = "";
  categoryFilter.value = "All";
  statusFilter.value = "All";
  sortFilter.value = "newest";

  renderReports();
  showToast("Report submitted successfully!");

  $("reports").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

// ==========================================
// RESOLVE & DELETE ACTIONS
// ==========================================

function resolveReport(id) {
  const report = reports.find(item => item.id === id);
  if (!report || report.status === "Resolved") return;

  report.status = "Resolved";

  if (!saveReports()) {
    report.status = "Pending";
    return;
  }

  renderReports();
  showToast("Report marked as resolved!");
}

function deleteReport(id) {
  const report = reports.find(item => item.id === id);
  if (!report) return;

  if (!window.confirm(`Delete "${report.title}"? This cannot be undone.`)) {
    return;
  }

  const previousReports = reports;
  reports = reports.filter(item => item.id !== id);

  if (!saveReports()) {
    reports = previousReports;
    return;
  }

  renderReports();
  showToast("Report deleted.");
}

// ==========================================
// DARK MODE
// ==========================================

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "☀" : "☾";
  themeToggle.setAttribute(
    "aria-label",
    isDark ? "Switch to light mode" : "Switch to dark mode"
  );
}

let savedTheme = "light";

try {
  savedTheme = localStorage.getItem(THEME_KEY) || "light";
} catch (error) {
  console.warn("Could not load saved theme.");
}

applyTheme(savedTheme);

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.classList.contains("dark")
    ? "light"
    : "dark";

  applyTheme(nextTheme);

  try {
    localStorage.setItem(THEME_KEY, nextTheme);
  } catch (error) {
    console.warn("Could not save theme preference.");
  }
});

// Re-render when controls change.
searchInput.addEventListener("input", renderReports);
categoryFilter.addEventListener("change", renderReports);
statusFilter.addEventListener("change", renderReports);
sortFilter.addEventListener("change", renderReports);

// ==========================================
// START THE APP
// ==========================================

renderReports();
