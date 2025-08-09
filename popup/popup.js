document.addEventListener("DOMContentLoaded", function () {
  function getCurrentTab(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        callback(tabs[0]);
      }
    });
  }

  function getCurrentTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        callback(tabs[0].id);
      }
    });
  }

  // Fetch modules from local, fallback to sync if local empty
  function fetchModules(callback) {
    chrome.storage.local.get({ modules: [] }, (localData) => {
      if (localData.modules && localData.modules.length > 0) {
        callback(localData.modules);
      } else {
        // fallback to sync
        chrome.storage.sync.get({ modules: [] }, (syncData) => {
          callback(syncData.modules || []);
        });
      }
    });
  }

  function saveModules(modules, callback) {
    chrome.storage.local.set({ modules });
    chrome.storage.sync.set({ modules }, callback);
  }

  function renderModuleList(modules, tabId) {
    const listEl = document.getElementById("module-list");
    listEl.innerHTML = "";

    const filter = document.getElementById("filter-select").value;
    const sort = document.getElementById("sort-select").value;

    let filtered = modules;
    if (filter === "visible") filtered = modules.filter((m) => !m.hidden);
    if (filter === "hidden") filtered = modules.filter((m) => m.hidden);

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
        fetchModules((modules) => {
          const updated = modules.map((m) =>
            m.id === mod.id ? { ...m, hidden: !m.hidden } : m
          );
          saveModules(updated, () => {
            refreshAndRender(tabId);
            chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
          });
        });
      };

      li.appendChild(titleSpan);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  }

  function refreshAndRender(tabId) {
    fetchModules((modules) => {
      renderModuleList(modules, tabId);
    });
  }

  getCurrentTab((tab) => {
    if (tab && tab.url && tab.url.startsWith("https://courseweb.sliit.lk/")) {
      getCurrentTabId((tabId) => {
        refreshAndRender(tabId);

        const filterSelect = document.getElementById("filter-select");
        const sortSelect = document.getElementById("sort-select");
        if (filterSelect) {
          filterSelect.onchange = () => refreshAndRender(tabId);
        }
        if (sortSelect) {
          sortSelect.onchange = () => refreshAndRender(tabId);
        }

        const showAllBtn = document.getElementById("show-all");
        if (showAllBtn) {
          showAllBtn.style.display = "";
          showAllBtn.onclick = function () {
            fetchModules((modules) => {
              const updated = modules.map((m) => ({ ...m, hidden: false }));
              saveModules(updated, () => {
                refreshAndRender(tabId);
                chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
              });
            });
          };
        }
      });
    } else {
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
    }
  });
});
