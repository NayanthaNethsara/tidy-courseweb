document.addEventListener("DOMContentLoaded", function () {
  function getCurrentTabId(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs.length > 0) {
        callback(tabs[0].id);
      }
    });
  }

  function requestModules(callback) {
    getCurrentTabId((tabId) => {
      chrome.tabs.sendMessage(tabId, { type: "GET_MODULES" }, (response) => {
        if (response && response.modules) callback(response.modules, tabId);
        else callback([], tabId);
      });
    });
  }

  function sendToggle(tabId, id, action, callback) {
    chrome.tabs.sendMessage(
      tabId,
      { type: "TOGGLE_MODULE", id, action },
      callback
    );
  }

  requestModules((modules, tabId) => {
    const listEl = document.getElementById("module-list");
    listEl.innerHTML = ""; // Clear previous

    modules.forEach((mod) => {
      // Create <li>
      const li = document.createElement("li");

      // Create <span> for module name
      const titleSpan = document.createElement("span");
      titleSpan.className = "module-title";
      titleSpan.textContent = mod.name;

      // Create Hide/Show button
      const btn = document.createElement("button");
      btn.className = "tidy-toggle-btn";
      btn.title = "Hide this module";
      btn.textContent = "Hide";

      let hidden = false; // Track local state

      btn.onclick = function () {
        hidden = !hidden;
        if (hidden) {
          btn.textContent = "Show";
          btn.title = "Show this module";
          titleSpan.classList.add("dim");
          btn.classList.remove("hide-btn");
          btn.classList.add("show-btn");
          sendToggle(tabId, mod.id, "hide");
        } else {
          btn.textContent = "Hide";
          btn.title = "Hide this module";
          titleSpan.classList.remove("dim");
          btn.classList.remove("show-btn");
          btn.classList.add("hide-btn");
          sendToggle(tabId, mod.id, "show");
        }
      };

      // Set initial button style
      btn.classList.add("hide-btn");

      li.appendChild(titleSpan);
      li.appendChild(btn);
      listEl.appendChild(li);
    });
  });

  // Optionally, add handler for "Show All Modules" button
  const showAllBtn = document.getElementById("show-all");
  if (showAllBtn) {
    showAllBtn.onclick = function () {
      const lis = document.querySelectorAll("#module-list li");
      lis.forEach((li, i) => {
        const btn = li.querySelector(".tidy-toggle-btn");
        const titleSpan = li.querySelector(".module-title");
        if (btn && btn.textContent === "Show") {
          btn.textContent = "Hide";
          btn.title = "Hide this module";
          titleSpan.classList.remove("dim");
          btn.classList.remove("show-btn");
          btn.classList.add("hide-btn");
          // Optionally update on page as well:
          // sendToggle(tabId, moduleId, "show");
        }
      });
    };
  }
});
