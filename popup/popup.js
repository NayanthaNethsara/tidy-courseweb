document.addEventListener("DOMContentLoaded", () => {
  // Tab switching functionality
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.getAttribute("data-tab");

      // Remove active class from all tabs and contents
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((content) => content.classList.remove("active"));

      // Add active class to clicked tab and corresponding content
      button.classList.add("active");
      document.getElementById(`${targetTab}-tab`).classList.add("active");
    });
  });

  // Get the active tab
  function getCurrentTab(callback) {
    window.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) callback(tabs[0]);
    });
  }

  // Fetch hidden module IDs from local storage
  function fetchHiddenModules(callback) {
    window.chrome.storage.local.get({ hiddenModules: [] }, (data) => {
      callback(data.hiddenModules || []);
    });
  }

  // Save updated hidden module IDs to storage
  function saveHiddenModules(hiddenIds, callback) {
    window.chrome.storage.local.set({ hiddenModules: hiddenIds }, callback);
  }

  // Render modules list in popup
  function renderModuleList(modules, hiddenIds, tabId) {
    const listEl = document.getElementById("module-list");
    listEl.innerHTML = "";

    const filter = document.getElementById("filter-select").value;
    const sort = document.getElementById("sort-select").value;

    let filtered = modules.map((m) => ({
      ...m,
      hidden: hiddenIds.includes(m.id),
    }));

    if (filter === "visible") filtered = filtered.filter((m) => !m.hidden);
    if (filter === "hidden") filtered = filtered.filter((m) => m.hidden);

    if (sort === "az")
      filtered = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za")
      filtered = filtered.slice().sort((a, b) => b.name.localeCompare(a.name));

    filtered.forEach((mod, index) => {
      const li = document.createElement("li");
      li.style.animationDelay = `${(index + 1) * 0.05}s`;

      const titleSpan = document.createElement("span");
      titleSpan.className = "module-title";
      titleSpan.textContent = mod.name;
      if (mod.hidden) titleSpan.classList.add("dim");

      const btn = document.createElement("button");
      btn.className = "tidy-toggle-btn";
      btn.title = mod.hidden ? "Show this module" : "Hide this module";
      btn.textContent = mod.hidden ? "Show" : "Hide";
      btn.classList.add(mod.hidden ? "show-btn" : "hide-btn");

      btn.onclick = () => {
        let updatedHiddenIds;
        if (mod.hidden) {
          updatedHiddenIds = hiddenIds.filter((id) => id !== mod.id);
        } else {
          updatedHiddenIds = [...hiddenIds, mod.id];
        }

        saveHiddenModules(updatedHiddenIds, () => {
          renderModuleList(modules, updatedHiddenIds, tabId);
          // Notify content script to apply changes
          window.chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
        });
      };

      li.appendChild(titleSpan);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function refreshAndRender(tabId) {
    // Fetch modules from content script
    window.chrome.tabs.sendMessage(
      tabId,
      { type: "GET_MODULES" },
      (response) => {
        if (!response || !response.modules) return;

        fetchHiddenModules((hiddenIds) => {
          renderModuleList(response.modules, hiddenIds, tabId);
        });
      }
    );
  }

  // Initialize popup
  getCurrentTab((tab) => {
    if (
      !tab ||
      !tab.url ||
      !tab.url.startsWith("https://courseweb.sliit.lk/")
    ) {
      const modulesTab = document.getElementById("modules-tab");
      if (modulesTab) {
        modulesTab.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; color: rgba(255, 255, 255, 0.6);">
            <div style="font-size: 48px; margin-bottom: 16px;">🌐</div>
            <h3 style="color: #ffffff; margin-bottom: 8px;">TidyCourseweb</h3>
            <p>Only works on courseweb.sliit.lk</p>
          </div>
        `;
      }
      const showAllBtn = document.getElementById("show-all");
      if (showAllBtn) showAllBtn.style.display = "none";
      return;
    }

    window.chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      refreshAndRender(tabId);

      const filterSelect = document.getElementById("filter-select");
      const sortSelect = document.getElementById("sort-select");
      if (filterSelect) filterSelect.onchange = () => refreshAndRender(tabId);
      if (sortSelect) sortSelect.onchange = () => refreshAndRender(tabId);

      const showAllBtn = document.getElementById("show-all");
      if (showAllBtn) {
        showAllBtn.style.display = "";
        showAllBtn.onclick = () => {
          saveHiddenModules([], () => {
            refreshAndRender(tabId);
            window.chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
          });
        };
      }
    });
  });

  // Dark mode toggle functionality
  const toggle = document.getElementById("darkToggle");

  // Load saved state
  window.chrome.storage.sync.get("darkMode", ({ darkMode }) => {
    toggle.checked = darkMode || false;
  });

  // Listen for toggle changes
  toggle.addEventListener("change", async () => {
    const enabled = toggle.checked;

    // Save state
    window.chrome.storage.sync.set({ darkMode: enabled });

    // Tell content script to apply
    const [tab] = await window.chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      window.chrome.tabs.sendMessage(tab.id, {
        action: enabled ? "enable-dark" : "disable-dark",
      });
    }
  });

  // Initialize settings toggles
  const autoHideToggle = document.getElementById("autoHideToggle");
  const notificationsToggle = document.getElementById("notificationsToggle");

  // Load settings
  window.chrome.storage.sync.get(["autoHide", "notifications"], (result) => {
    if (autoHideToggle) autoHideToggle.checked = result.autoHide || false;
    if (notificationsToggle)
      notificationsToggle.checked = result.notifications || false;
  });

  // Save settings
  if (autoHideToggle) {
    autoHideToggle.addEventListener("change", () => {
      window.chrome.storage.sync.set({ autoHide: autoHideToggle.checked });
    });
  }

  if (notificationsToggle) {
    notificationsToggle.addEventListener("change", () => {
      window.chrome.storage.sync.set({
        notifications: notificationsToggle.checked,
      });
    });
  }
});
