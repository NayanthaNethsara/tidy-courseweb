document.addEventListener("DOMContentLoaded", function () {
  // Get the active tab
  function getCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) callback(tabs[0]);
    });
  }

  // Fetch hidden module IDs from local storage
  function fetchHiddenModules(callback) {
    chrome.storage.local.get({ hiddenModules: [] }, (data) => {
      callback(data.hiddenModules || []);
    });
  }

  // Save updated hidden module IDs to storage
  function saveHiddenModules(hiddenIds, callback) {
    chrome.storage.local.set({ hiddenModules: hiddenIds }, callback);
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

    filtered.forEach((mod) => {
      const li = document.createElement("li");

      const titleSpan = document.createElement("span");
      titleSpan.className = "module-title";
      titleSpan.textContent = mod.name;
      if (mod.hidden) titleSpan.classList.add("dim");

      const btn = document.createElement("button");
      btn.className = "tidy-toggle-btn";
      btn.title = mod.hidden ? "Show this module" : "Hide this module";
      btn.textContent = mod.hidden ? "Show" : "Hide";
      btn.classList.add(mod.hidden ? "show-btn" : "hide-btn");

      btn.onclick = function () {
        let updatedHiddenIds;
        if (mod.hidden) {
          updatedHiddenIds = hiddenIds.filter((id) => id !== mod.id);
        } else {
          updatedHiddenIds = [...hiddenIds, mod.id];
        }

        saveHiddenModules(updatedHiddenIds, () => {
          renderModuleList(modules, updatedHiddenIds, tabId);
          // Notify content script to apply changes
          chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
        });
      };

      li.appendChild(titleSpan);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function refreshAndRender(tabId) {
    // Fetch modules from content script
    chrome.tabs.sendMessage(tabId, { type: "GET_MODULES" }, (response) => {
      if (!response || !response.modules) return;

      fetchHiddenModules((hiddenIds) => {
        renderModuleList(response.modules, hiddenIds, tabId);
      });
    });
  }

  // Initialize popup
  getCurrentTab((tab) => {
    if (
      !tab ||
      !tab.url ||
      !tab.url.startsWith("https://courseweb.sliit.lk/")
    ) {
      const contentDiv = document.querySelector(".content");
      if (contentDiv) {
        contentDiv.innerHTML = `
          <div style="text-align:center; color:#AAA; padding:32px 0;">
            <p><b>TidyCourseweb</b> works only on</p>
            <p style="color:#888;">courseweb.sliit.lk</p>
          </div>
        `;
      }
      const showAllBtn = document.getElementById("show-all");
      if (showAllBtn) showAllBtn.style.display = "none";
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const tabId = tabs[0].id;

      refreshAndRender(tabId);

      const filterSelect = document.getElementById("filter-select");
      const sortSelect = document.getElementById("sort-select");
      if (filterSelect) filterSelect.onchange = () => refreshAndRender(tabId);
      if (sortSelect) sortSelect.onchange = () => refreshAndRender(tabId);

      const showAllBtn = document.getElementById("show-all");
      if (showAllBtn) {
        showAllBtn.style.display = "";
        showAllBtn.onclick = function () {
          saveHiddenModules([], () => {
            refreshAndRender(tabId);
            chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
          });
        };
      }
    });
  });
});
