document.addEventListener("DOMContentLoaded", function () {
  function getCurrentTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        callback(tabs[0].id);
      }
    });
  }

  function sendToggle(tabId, id, action, callback) {
    chrome.tabs.sendMessage(
      tabId,
      { type: "TOGGLE_MODULE", id, action },
      callback
    );
  }

  // Always read modules from storage to populate the popup
  chrome.storage.sync.get({ modules: [] }, (data) => {
    const modules = data.modules;
    const listEl = document.getElementById("module-list");
    listEl.innerHTML = ""; // Clear previous

    getCurrentTabId((tabId) => {
      modules.forEach((mod) => {
        // Create <li>
        const li = document.createElement("li");

        // Create <span> for module name
        const titleSpan = document.createElement("span");
        titleSpan.className = "module-title";
        titleSpan.textContent = mod.name;
        if (mod.hidden) titleSpan.classList.add("dim");

        // Create Hide/Show button
        const btn = document.createElement("button");
        btn.className = "tidy-toggle-btn";
        btn.title = mod.hidden ? "Show this module" : "Hide this module";
        btn.textContent = mod.hidden ? "Show" : "Hide";
        btn.classList.add(mod.hidden ? "show-btn" : "hide-btn");

        btn.onclick = function () {
          chrome.storage.sync.get({ modules: [] }, (data) => {
            const updated = data.modules.map((m) =>
              m.id === mod.id ? { ...m, hidden: !m.hidden } : m
            );
            chrome.storage.sync.set({ modules: updated }, () => {
              btn.textContent = btn.textContent === "Hide" ? "Show" : "Hide";
              btn.title =
                btn.textContent === "Hide"
                  ? "Hide this module"
                  : "Show this module";
              titleSpan.classList.toggle("dim");
              btn.classList.toggle("hide-btn");
              btn.classList.toggle("show-btn");
              // Notify content script to update the DOM
              chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" });
            });
          });
        };

        li.appendChild(titleSpan);
        li.appendChild(btn);
        listEl.appendChild(li);
      });
    });
  });

  // "Show All" button handler
  const showAllBtn = document.getElementById("show-all");
  if (showAllBtn) {
    showAllBtn.onclick = function () {
      chrome.storage.sync.get({ modules: [] }, (data) => {
        const updated = data.modules.map((m) => ({ ...m, hidden: false }));
        chrome.storage.sync.set({ modules: updated }, () => {
          // Optionally, refresh popup UI or notify content script
          window.location.reload(); // simplest: just reload popup
          getCurrentTabId((tabId) =>
            chrome.tabs.sendMessage(tabId, { type: "SYNC_MODULES" })
          );
        });
      });
    };
  }
});
