const API =
  "https://script.google.com/macros/s/AKfycbzafqfzakmV-Mtr8UIMx8XAYUQv0W7cupuwEtYyMZFtF3U-RytFFmlROTSyRj79ffr4_g/exec";

let tasks = [];
let answers = {};

// Initialize input with today's date for user convenience
document.getElementById("date").valueAsDate = new Date();

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
    alert("Please select a date first.");
    return;
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
    alert("Saved Successfully! ✅");
    if (activeTracker === "sadhana") {
      document.getElementById("sadhanaForm").reset();
    }
  } catch (error) {
    alert("Error saving data ❌");
  } finally {
    btn.disabled = false;
    btn.textContent = "Submit ✅";
  }
});

document.getElementById("shareBtn").addEventListener("click", async () => {
  const date = document.getElementById("date").value;
  const btn = document.getElementById("shareBtn");

  if (!date) {
    alert("Please select a date to share.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Fetching Data... ⏳";

  try {
    // Use the activeTracker variable to decide which data to fetch
    const res = await fetch(
      `${API}?action=getData&tracker=${activeTracker}&date=${date}`,
    );
    const response = await res.json();

    if (response.status === "not_found") {
      alert("No data found for this date. Please submit first! ❌");
      btn.disabled = false;
      btn.textContent = "Share on WhatsApp 💬";
      return;
    }

    let text = "";
    if (activeTracker === "daily") {
      text = `📊 *Daily Tracker - ${date}*\n\n`;
      response.data.tasks.forEach((t) => {
        let valStr = t.val === "Yes" ? "Yes ✅" : "No ❌";
        text += `• ${t.name}: ${valStr}\n`;
      });
      text += `\n🔥 *Score:* ${response.data.score}`;
    } else {
      // activeTracker === 'sadhana'
      text = `📊 *Sadhana Report - ${date}*\n\n`;
      const data = response.data;
      // Simple format as requested
      for (const [key, value] of Object.entries(data)) {
        if (key !== "date" && value) {
          const formattedKey = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase());
          text += `*${formattedKey}:* ${value}\n`;
        }
      }
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`);
  } catch (error) {
    alert("Error fetching data to share ❌");
    console.error(error);
  } finally {
    btn.disabled = false;
    btn.textContent = "Share on WhatsApp 💬";
  }
});

// Initialize application
load();
