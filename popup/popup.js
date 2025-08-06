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

  function renderModuleList(modules, tabId) {
    const listEl = document.getElementById("module-list");
    listEl.innerHTML = "";

    // Get filter/sort controls
    const filter = document.getElementById("filter-select").value;
    const sort = document.getElementById("sort-select").value;

    // Filter
    let filtered = modules;
    if (filter === "visible") filtered = modules.filter((m) => !m.hidden);
    if (filter === "hidden") filtered = modules.filter((m) => m.hidden);

    // Sort
    if (sort === "az")
      filtered = filtered.slice().sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "za")
      filtered = filtered.slice().sort((a, b) => b.name.localeCompare(a.name));
    // Default: original order

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
        chrome.storage.local.get({ modules: [] }, (data) => {
          const updated = data.modules.map((m) =>
            m.id === mod.id ? { ...m, hidden: !m.hidden } : m
          );
          chrome.storage.local.set({ modules: updated }, () => {
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
    chrome.storage.local.get({ modules: [] }, (data) => {
      renderModuleList(data.modules, tabId);
    });
  }

  getCurrentTab((tab) => {
    if (tab && tab.url && tab.url.startsWith("https://courseweb.sliit.lk/")) {
      getCurrentTabId((tabId) => {
        refreshAndRender(tabId);

        // Set up filter/sort event listeners
        const filterSelect = document.getElementById("filter-select");
        const sortSelect = document.getElementById("sort-select");
        if (filterSelect) {
          filterSelect.onchange = () => refreshAndRender(tabId);
        }
        if (sortSelect) {
          sortSelect.onchange = () => refreshAndRender(tabId);
        }

        // "Show All" button handler
        const showAllBtn = document.getElementById("show-all");
        if (showAllBtn) {
          showAllBtn.style.display = "";
          showAllBtn.onclick = function () {
            chrome.storage.local.get({ modules: [] }, (data) => {
              const updated = data.modules.map((m) => ({
                ...m,
                hidden: false,
              }));
              chrome.storage.local.set({ modules: updated }, () => {
                refreshAndRender(tabId);
                chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
              });
            });
          };
        }
      });
    } else {
      // Not on Courseweb: show friendly message, hide module list & button
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
