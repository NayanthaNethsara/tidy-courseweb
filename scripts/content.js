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

// Apply hidden state from modules array
function applyHiddenModules(modules) {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return;
  const moduleLinks = getModuleLinks(coursesMenu);

  moduleLinks.forEach((link) => {
    const id = link.getAttribute("href");
    const module = modules.find((m) => m.id === id);
    if (module && module.hidden) {
      link.parentElement.style.display = "none";
    } else {
      link.parentElement.style.display = "";
    }
  });
}

// Merge storage with fresh DOM, update storage, apply hidden state
function syncModulesWithStorage() {
  const modulesFromPage = getAllModules();

  chrome.storage.sync.get({ modules: [] }, (data) => {
    const oldList = data.modules;
    // Fast lookup for hidden state
    const hiddenMap = {};
    oldList.forEach((m) => (hiddenMap[m.id] = m.hidden));

    const merged = modulesFromPage.map((m) => ({
      ...m,
      hidden: hiddenMap[m.id] || false,
    }));

    chrome.storage.sync.set({ modules: merged }, () => {
      applyHiddenModules(merged);
    });
  });
}

// function addToggleButtons() {
//   const coursesMenu = getCoursesMenu();
//   if (!coursesMenu) return;
//   const moduleLinks = getModuleLinks(coursesMenu);

//   moduleLinks.forEach((link) => {
//     // Avoid adding the toggle multiple times
//     if (link.parentElement.querySelector(".tidy-toggle-btn")) return;

//     const li = link.parentElement;
//     li.style.display = "flex";
//     li.style.alignItems = "center";
//     li.style.justifyContent = "space-between";

//     // Create the toggle button
//     const toggleBtn = document.createElement("button");
//     toggleBtn.textContent = "Hide";
//     toggleBtn.className = "tidy-toggle-btn";
//     toggleBtn.style.marginLeft = "12px";
//     toggleBtn.style.fontSize = "12px";
//     toggleBtn.style.cursor = "pointer";
//     toggleBtn.style.border = "none";
//     toggleBtn.style.background = "#ff6b6b";
//     toggleBtn.style.color = "white";
//     toggleBtn.style.padding = "4px 12px";
//     toggleBtn.style.borderRadius = "5px";
//     toggleBtn.style.transition = "background 0.2s";
//     toggleBtn.onmouseenter = () => (toggleBtn.style.background = "#ee5a52");
//     toggleBtn.onmouseleave = () => (toggleBtn.style.background = "#ff6b6b");

//     toggleBtn.onclick = function (e) {
//       e.preventDefault();
//       const id = link.getAttribute("href");
//       // Toggle hidden state in storage
//       chrome.storage.sync.get({ modules: [] }, (data) => {
//         const modules = data.modules.map((m) =>
//           m.id === id ? { ...m, hidden: !m.hidden } : m
//         );
//         chrome.storage.sync.set({ modules }, () => {
//           applyHiddenModules(modules);
//         });
//       });
//     };

//     li.appendChild(toggleBtn);
//   });
// }

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MODULES") {
    // Not used for UI, but keeps API available
    const coursesMenu = getCoursesMenu();
    const moduleLinks = getModuleLinks(coursesMenu);
    const modules = Array.from(moduleLinks).map((link) => ({
      id: link.getAttribute("href"),
      name: link.textContent.trim(),
    }));
    sendResponse({ modules });
    return true;
  }
  if (request.type === "TOGGLE_MODULE") {
    const coursesMenu = getCoursesMenu();
    const moduleLinks = getModuleLinks(coursesMenu);
    moduleLinks.forEach((link) => {
      if (link.getAttribute("href") === request.id) {
        if (request.action === "hide") {
          link.parentElement.style.display = "none";
        } else {
          link.parentElement.style.display = "";
        }
      }
    });
    sendResponse({ status: "ok" });
    return true;
  }
  if (request.type === "SYNC_MODULES") {
    chrome.storage.sync.get({ modules: [] }, (data) => {
      applyHiddenModules(data.modules);
    });
    sendResponse({ status: "ok" });
  }
});

window.addEventListener("load", () => {
  setTimeout(() => {
    syncModulesWithStorage();
  }, 1200);
});
