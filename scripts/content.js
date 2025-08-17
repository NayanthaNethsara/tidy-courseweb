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

console.log("[TidyCourseweb] content.js loaded");

// Apply saved mode on load
chrome.storage.sync.get("darkMode", ({ darkMode }) => {
  if (darkMode) {
    document.body.classList.add("moodle-dark");
    console.log("[TidyCourseweb] Dark mode applied on load");
  }
});

// Listen for popup toggle
chrome.runtime.onMessage.addListener((message) => {
  console.log("[TidyCourseweb] Message received:", message);
  if (message.action === "enable-dark") {
    document.body.classList.add("moodle-dark");
    console.log("[TidyCourseweb] Dark mode enabled");
  } else if (message.action === "disable-dark") {
    document.body.classList.remove("moodle-dark");
    console.log("[TidyCourseweb] Dark mode disabled");
  }
});

// const navbarInner = document.querySelector(".navbar-inner");
// if (navbarInner) {
//   navbarInner.style.backgroundColor = "#1e1e1e";
//   navbarInner.style.color = "#f1f1f1";

//   // Update all links inside navbar
//   const links = navbarInner.querySelectorAll("a");
//   links.forEach((link) => {
//     link.style.color = "#f1f1f1";
//   });

//   // Update dropdown menus
//   const dropdowns = navbarInner.querySelectorAll(".dropdown-menu");
//   dropdowns.forEach((menu) => {
//     menu.style.backgroundColor = "#1e1e1e";
//     const menuLinks = menu.querySelectorAll("a");
//     menuLinks.forEach((link) => (link.style.color = "#f1f1f1"));
//   });
// }
