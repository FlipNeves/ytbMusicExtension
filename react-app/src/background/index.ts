let ytmWindowId: number | null = null;

const openYTMWindow = (url: string = "https://music.youtube.com") => {
  if (ytmWindowId !== null) {
    chrome.windows.get(ytmWindowId, {}, (window) => {
      if (chrome.runtime.lastError || !window) {
        ytmWindowId = null;
        createYTMWindow(url);
      } else {
        chrome.tabs.query({ windowId: ytmWindowId! }, (tabs) => {
          if (tabs.length > 0 && tabs[0].id) {
            chrome.tabs.update(tabs[0].id, { url: url });
          }
        });
        chrome.windows.update(ytmWindowId!, { focused: true });
      }
    });
  } else {
    createYTMWindow(url);
  }
};

const createYTMWindow = (url: string) => {
  chrome.windows.create({
    url: url,
    type: "popup",
    state: "maximized"
  }, (window) => {
    if (window) {
      ytmWindowId = window.id ?? null;
    }
  });
};

chrome.action.onClicked.addListener(() => {
  openYTMWindow();
});

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.pendingUrl?.includes("music.youtube.com") || tab.url?.includes("music.youtube.com")) {
    const url = tab.pendingUrl || tab.url;

    if (tab.windowId !== ytmWindowId && ytmWindowId !== null && url) {
      if (tab.id) {
        chrome.tabs.remove(tab.id);
      }
      openYTMWindow(url);
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url?.includes("music.youtube.com")) {
    if (tab.windowId !== ytmWindowId && ytmWindowId !== null) {
      chrome.tabs.remove(tabId);
      openYTMWindow(changeInfo.url);
    }
  }
});

chrome.windows.onRemoved.addListener((windowId) => {
  if (windowId === ytmWindowId) {
    ytmWindowId = null;
  }
});