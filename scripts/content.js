// ===== Helper Functions =====
function getCoursesMenu() {
  const dropdown = document.querySelector(
    'li.dropdown > a.dropdown-toggle[title="My courses"]'
  );
  if (!dropdown) return null;
  const parentLi = dropdown.closest("li.dropdown");
  return parentLi.querySelector("ul.dropdown-menu");
}

function getModuleLinks(coursesMenu) {
  if (!coursesMenu) return [];
  return coursesMenu.querySelectorAll("li > a");
}

// Get all module objects {id, name}
function getAllModules() {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return [];
  const moduleLinks = getModuleLinks(coursesMenu);
  return Array.from(moduleLinks).map((link) => ({
    id: link.getAttribute("href"),
    name: link.textContent.trim(),
  }));
}

// Apply hidden modules by IDs
function applyHiddenModules(hiddenIds) {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return;

  const moduleLinks = getModuleLinks(coursesMenu);
  moduleLinks.forEach((link) => {
    const id = link.getAttribute("href");
    link.parentElement.style.display = hiddenIds.includes(id) ? "none" : "";
  });
}

// Sync hidden state on page load
function syncModulesWithStorage() {
  chrome.storage.local.get({ hiddenModules: [] }, (data) => {
    applyHiddenModules(data.hiddenModules);
  });
}

// ===== Message Listener =====
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MODULES") {
    const modules = getAllModules();
    sendResponse({ modules });
    return true;
  }

  if (request.type === "TOGGLE_MODULE") {
    chrome.storage.local.get({ hiddenModules: [] }, (data) => {
      let updated = data.hiddenModules;

      if (request.action === "hide") {
        if (!updated.includes(request.id)) updated.push(request.id);
      } else if (request.action === "show") {
        updated = updated.filter((id) => id !== request.id);
      }

      chrome.storage.local.set({ hiddenModules: updated }, () => {
        applyHiddenModules(updated);
        sendResponse({ status: "ok" });
      });
    });
    return true; // async response
  }

  if (request.type === "SYNC_MODULES") {
    syncModulesWithStorage();
    sendResponse({ status: "ok" });
  }
});

// ===== Run on page load =====
window.addEventListener("load", () => {
  // Delay to allow async DOM loading (if needed)
  setTimeout(syncModulesWithStorage, 1200);
});

// Apply saved mode on load
chrome.storage.sync.get("darkMode", ({ darkMode }) => {
  if (darkMode) {
    enableDarkMode();
  }
});

// Listen for popup toggle messages
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "enable-dark") {
    enableDarkMode();
  } else if (message.action === "disable-dark") {
    disableDarkMode();
  }
});

// Functions to add/remove dark mode
function enableDarkMode() {
  document.body.classList.add("moodle-dark");
  observeDOM(); // Start observing new elements
}

function disableDarkMode() {
  document.body.classList.remove("moodle-dark");
}

// Observe DOM changes to apply dark mode to newly added elements
let observer;
function observeDOM() {
  if (observer) return; // Already observing
  observer = new MutationObserver(() => {
    document.body.classList.add("moodle-dark");
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
