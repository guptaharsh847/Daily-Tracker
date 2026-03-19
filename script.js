const API =
  "https://script.google.com/macros/s/AKfycbzafqfzakmV-Mtr8UIMx8XAYUQv0W7cupuwEtYyMZFtF3U-RytFFmlROTSyRj79ffr4_g/exec";

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toast-out 0.5s ease-out forwards";
    toast.addEventListener("animationend", () => {
      toast.remove();
    });
  }, 3000);
}

let tasks = [];
let answers = {};

// Initialize input with yesterday's date for user convenience
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
document.getElementById("date").valueAsDate = yesterday;

// --- Navigation ---
const navDailyBtn = document.getElementById("navDaily");
const navSadhanaBtn = document.getElementById("navSadhana");
const dailyTrackerView = document.getElementById("dailyTrackerView");
const sadhanaTrackerView = document.getElementById("sadhanaTrackerView");
let activeTracker = "daily"; // 'daily' or 'sadhana'

navDailyBtn.addEventListener("click", () => {
  dailyTrackerView.style.display = "block";
  sadhanaTrackerView.style.display = "none";
  navDailyBtn.classList.add("active");
  navSadhanaBtn.classList.remove("active");
  activeTracker = "daily";
});

navSadhanaBtn.addEventListener("click", () => {
  dailyTrackerView.style.display = "none";
  sadhanaTrackerView.style.display = "block";
  navSadhanaBtn.classList.add("active");
  navDailyBtn.classList.remove("active");
  activeTracker = "sadhana";
});

async function load() {
  try {
    const res = await fetch(API);
    tasks = await res.json();

    const div = document.getElementById("tasks");
    let htmlContent = "";

    tasks.forEach((t) => {
      answers[t[0]] = false; // Slider is initially toggled off

      // Using a checkbox formatted as a slider via CSS
      htmlContent += `
        <div class="card">
          <span class="task-name">${t[0]}</span>
          <label class="switch">
            <input type="checkbox" onchange="setVal('${t[0]}', this.checked)">
            <span class="slider"></span>
          </label>
        </div>
      `;
    });

    div.innerHTML = htmlContent;
  } catch (error) {
    document.getElementById("tasks").innerHTML =
      `<div class="loading" style="color: #ef4444;">Error loading tasks. Please try again later.</div>`;
    console.error("Error loading tasks:", error);
  }
}

function setVal(task, val) {
  answers[task] = val;
}

document.getElementById("submitBtn").addEventListener("click", async () => {
  const date = document.getElementById("date").value;
  const btn = document.getElementById("submitBtn");

  if (!date) {
    showToast("Please select a date first.", "failure");
    return;
  }

  if (activeTracker === "sadhana") {
    const sadhanaForm = document.getElementById("sadhanaForm");
    if (!sadhanaForm.checkValidity()) {
      sadhanaForm.reportValidity();
      return; // Stop execution if validation fails
    }
  }

  btn.disabled = true;
  btn.textContent = "Saving... ⏳";

  let payload;

  if (activeTracker === "daily") {
    payload = {
      type: "daily",
      date: date,
      data: answers,
    };
  } else {
    // activeTracker === 'sadhana'
    const sadhanaForm = document.getElementById("sadhanaForm");
    const formData = new FormData(sadhanaForm);
    const sadhanaData = Object.fromEntries(formData.entries());
    payload = {
      type: "sadhana",
      date: date,
      data: sadhanaData,
    };
  }

  try {
    await fetch(API, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    showToast("Saved Successfully!", "success");
    if (activeTracker === "sadhana") {
      document.getElementById("sadhanaForm").reset();
    }
  } catch (error) {
    showToast("Error saving data.", "failure");
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit ✅";
  }
});

// Helper to format date safely without timezone shifting issues
const formatDateIndian = (dateString) => {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  const dateObj = new Date(year, month - 1, day);
  return dateObj.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Helper to format time to 12-hour AM/PM
const formatTime12Hour = (timeString) => {
  if (!timeString || !timeString.includes(":")) return timeString;

  // Handle full ISO date strings returned by Google Sheets
  if (
    typeof timeString === "string" &&
    timeString.includes("T") &&
    timeString.length > 15
  ) {
    const d = new Date(timeString);
    if (!isNaN(d.getTime())) {
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const seconds = d.getSeconds().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes}:${seconds} ${ampm}`;
    }
  }

  // Fallback to gracefully clean up raw time strings like "15:07:50.000Z"
  let timeVal = timeString.toString();
  const timeParts = timeVal.split(":");
  let hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1].substring(0, 2);
  const secondsStr = timeParts[2]
    ? timeParts[2].split(".")[0].replace("Z", "")
    : null;
  const seconds = secondsStr !== null ? parseInt(secondsStr, 10) : null;

  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // Hour '0' should be '12'

  let formattedTime = `${hours}:${minutes}`;
  if (seconds !== null && !isNaN(seconds)) {
    formattedTime += `:${seconds.toString().padStart(2, "0")}`;
  }
  return `${formattedTime} ${ampm}`;
};

document.getElementById("viewBtn").addEventListener("click", async () => {
  const date = document.getElementById("date").value;
  const btn = document.getElementById("viewBtn");

  if (!date) {
    showToast("Please select a date to view.", "failure");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Loading... ⏳";

  // Factor in the 1-day offset for Sadhana exactly like the share button
  const selectedDate = new Date(date + "T00:00:00");
  if (activeTracker === "sadhana") {
    selectedDate.setDate(selectedDate.getDate() - 1);
  }
  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const day = String(selectedDate.getDate()).padStart(2, "0");
  const dateToSend = `${year}-${month}-${day}`;

  const finalDateToFetch = activeTracker === "sadhana" ? dateToSend : date;

  try {
    const res = await fetch(
      `${API}?action=getData&tracker=${activeTracker}&date=${finalDateToFetch}`,
    );
    const response = await res.json();

    if (response.status === "not_found") {
      showToast("No data found for this date.", "info");
      return;
    }

    if (activeTracker === "daily") {
      response.data.tasks.forEach((t) => {
        answers[t.name] = t.val === "Yes";
      });
      // Re-render tasks to update sliders
      const div = document.getElementById("tasks");
      let htmlContent = "";
      tasks.forEach((t) => {
        const isChecked = answers[t[0]] ? "checked" : "";
        htmlContent += `
          <div class="card">
            <span class="task-name">${t[0]}</span>
            <label class="switch">
              <input type="checkbox" onchange="setVal('${t[0]}', this.checked)" ${isChecked}>
              <span class="slider"></span>
            </label>
          </div>
        `;
      });
      div.innerHTML = htmlContent;
    } else {
      // Fill sadhana form inputs
      const data = response.data;
      const fields = [
        "wakeUp",
        "sleep",
        "rounds",
        "chantTime",
        "studyTime",
        "readingTime",
        "bookName",
        "lectureTime",
        "lectureName",
        "remark",
      ];

      fields.forEach((field) => {
        if (
          document.getElementById(field) &&
          data[field] !== undefined &&
          data[field] !== ""
        ) {
          let val = data[field];
          // Safely handle timestamp values that Sheets might return for times
          if (
            (field === "wakeUp" ||
              field === "sleep" ||
              field === "chantTime") &&
            typeof val === "string" &&
            val.includes("T")
          ) {
            const d = new Date(val);
            val = d.toTimeString().split(" ")[0]; // Convert full ISO string to HH:MM:SS
          }
          document.getElementById(field).value = val;
        }
      });
    }
    showToast("Data loaded successfully!", "success");
  } catch (error) {
    showToast("Error viewing data.", "failure");
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = "View Data 👁️";
  }
});

/* --- TEMPORARILY DISABLED EXCEL DOWNLOAD ---
document.getElementById("downloadBtn").addEventListener("click", async () => {
  const startDate = document.getElementById("startDate").value;
  const endDate = document.getElementById("endDate").value;
  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }

  const btn = document.getElementById("downloadBtn");
  btn.disabled = true;
  btn.textContent = "Generating... ⏳";

  try {
    const res = await fetch(`${API}?action=getAllSadhana`);
    const response = await res.json();

    if (response.status === "success" && response.data) {
      const rows = response.data;
      const headers = rows[0];
      const dataRows = rows.slice(1);

      const start = new Date(startDate + "T00:00:00");
      const end = new Date(endDate + "T00:00:00");

      // Filter records between the two dates
      const filtered = dataRows.filter((row) => {
        if (!row[0]) return false;
        const rowDate = new Date(row[0]);
        return rowDate >= start && rowDate <= end;
      });

      if (filtered.length === 0) {
        alert("No data found for this date range.");
        return;
      }

      // Convert to CSV
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += headers.join(",") + "\n";
      filtered.forEach((row) => {
        const safeRow = row.map(
          (cell) => `"${String(cell).replace(/"/g, '""')}"`,
        );
        csvContent += safeRow.join(",") + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute(
        "download",
        `Sadhana_Report_${startDate}_to_${endDate}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert("Failed to fetch data for download.");
    }
  } catch (err) {
    alert("Error downloading file ❌");
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = "Download Excel/CSV 📥";
  }
});
*/

document.getElementById("shareBtn").addEventListener("click", async () => {
  const date = document.getElementById("date").value;
  const btn = document.getElementById("shareBtn");

  if (!date) {
    showToast("Please select a date to share.", "failure");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Fetching Data... ⏳";

  // Create a date object from the input value to subtract a day.
  const selectedDate = new Date(date + "T00:00:00");
  selectedDate.setDate(selectedDate.getDate() - 1);

  // Format it back to YYYY-MM-DD for the API request.
  const year = selectedDate.getFullYear();
  const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const day = String(selectedDate.getDate()).padStart(2, "0");
  const dateToSend = `${year}-${month}-${day}`;

  const finalDateToFetch = activeTracker === "sadhana" ? dateToSend : date;

  try {
    // Use the activeTracker variable to decide which data to fetch

    const res = await fetch(
      `${API}?action=getData&tracker=${activeTracker}&date=${finalDateToFetch}`,
    );
    const response = await res.json();

    if (response.status === "not_found") {
      showToast("No data found for this date. Please submit first.", "info");
      btn.disabled = false;
      btn.textContent = "Share 💬";
      return;
    }

    // Format the date we are fetching data for, to display in the message.
    const formattedDateForShare = formatDateIndian(finalDateToFetch);

    let text = "Hare Krishna\n\n";
    if (activeTracker === "daily") {
      text += `*Daily Tracker - ${formattedDateForShare}*\n\n`;
      response.data.tasks.forEach((t) => {
        let valStr = t.val === "Yes" ? "Yes" : "No";
        text += `• ${t.name}: ${valStr}\n`;
      });
      text += `\n*Score:* ${response.data.score}`;
    } else {
      // activeTracker === 'sadhana'
      text += `*Sadhana Report - ${formattedDateForShare}*\n\n`;
      const data = response.data;
      // Simple format as requested
      for (const [key, value] of Object.entries(data)) {
        if (key !== "date" && value) {
          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());

          let formattedValue = value;
          if (key === "wakeUp" || key === "sleep" || key === "chantTime") {
            formattedValue = formatTime12Hour(value);
          }

          text += `*${formattedKey}:* ${formattedValue}\n`;
        }
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  } catch (error) {
    showToast("Error fetching data to share.", "failure");
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = "Share 💬";
  }
});

// --- PWA Install Prompt & Service Worker ---
let deferredPrompt;

window.addEventListener("beforeinstallprompt", (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Show the custom install prompt
  const installPrompt = document.getElementById("installPrompt");
  if (installPrompt) {
    installPrompt.style.display = "block";
  }
});

document.getElementById("installBtn")?.addEventListener("click", async () => {
  const installPrompt = document.getElementById("installPrompt");
  if (installPrompt) installPrompt.style.display = "none";

  if (deferredPrompt) {
    // Show the native install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt = null;
  }
});

document.getElementById("cancelInstallBtn")?.addEventListener("click", () => {
  const installPrompt = document.getElementById("installPrompt");
  if (installPrompt) installPrompt.style.display = "none";
});

// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js");
  });
}

// Initialize application
load();
