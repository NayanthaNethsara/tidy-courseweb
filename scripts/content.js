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

function getAllModules() {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return [];
  const moduleLinks = getModuleLinks(coursesMenu);
  return Array.from(moduleLinks).map((link) => ({
    id: link.getAttribute("href"),
    name: link.textContent.trim(),
  }));
}

function applyHiddenModules(modules) {
  const coursesMenu = getCoursesMenu();
  if (!coursesMenu) return;
  const moduleLinks = getModuleLinks(coursesMenu);

  moduleLinks.forEach((link) => {
    const id = link.getAttribute("href");
    const module = modules.find((m) => m.id === id);
    link.parentElement.style.display = module?.hidden ? "none" : "";
  });
}

function saveModules(modules) {
  chrome.storage.local.set({ modules });
  chrome.storage.sync.set({ modules });
}

function syncModulesWithStorage() {
  const modulesFromPage = getAllModules();

  // First try from local
  chrome.storage.local.get({ modules: [] }, (localData) => {
    let storedModules = localData.modules;

    // If local empty, try from sync (backup restore)
    if (!storedModules.length) {
      chrome.storage.sync.get({ modules: [] }, (syncData) => {
        storedModules = syncData.modules || [];
        mergeAndSave(storedModules, modulesFromPage);
      });
    } else {
      mergeAndSave(storedModules, modulesFromPage);
    }
  });
}

function mergeAndSave(storedModules, modulesFromPage) {
  const hiddenMap = {};
  storedModules.forEach((m) => (hiddenMap[m.id] = m.hidden));

  const merged = modulesFromPage.map((m) => ({
    ...m,
    hidden: hiddenMap[m.id] || false,
  }));

  saveModules(merged);
  applyHiddenModules(merged);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_MODULES") {
    sendResponse({ modules: getAllModules() });
    return true;
  }
  if (request.type === "TOGGLE_MODULE") {
    chrome.storage.local.get({ modules: [] }, (data) => {
      const updated = data.modules.map((m) =>
        m.id === request.id ? { ...m, hidden: request.action === "hide" } : m
      );
      saveModules(updated);
      applyHiddenModules(updated);
    });
    sendResponse({ status: "ok" });
    return true;
  }
  if (request.type === "SYNC_MODULES") {
    chrome.storage.local.get({ modules: [] }, (data) => {
      applyHiddenModules(data.modules);
    });
    sendResponse({ status: "ok" });
  }
});

window.addEventListener("load", () => {
  setTimeout(() => {
    syncModulesWithStorage();
    chrome.storage.local.get({ modules: [] }, (data) => {
      console.table(data.modules);
    });
  }, 1200);
});
