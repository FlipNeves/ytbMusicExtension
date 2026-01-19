const getStoredWindowId = (): Promise<number | null> =>
  new Promise(resolve => {
    chrome.storage.local.get(["ytmWindowId"], (result: { ytmWindowId?: number }) => {
      resolve(result.ytmWindowId ?? null);
    });
  });

const setStoredWindowId = (windowId: number | null): Promise<void> =>
  new Promise(resolve => {
    if (windowId === null) {
      chrome.storage.local.remove("ytmWindowId", () => resolve());
    } else {
      chrome.storage.local.set({ ytmWindowId: windowId }, () => resolve());
    }
  });

const openYTMWindow = async (url: string = "https://music.youtube.com") => {
  const storedWindowId = await getStoredWindowId();

  if (storedWindowId !== null) {
    chrome.windows.get(storedWindowId, {}, (window) => {
      if (chrome.runtime.lastError || !window) {
        createYTMWindow(url);
      } else {
        chrome.tabs.query({ windowId: storedWindowId }, (tabs) => {
          if (tabs.length > 0 && tabs[0].id) {
            chrome.tabs.update(tabs[0].id, { url });
          }
        });
        chrome.windows.update(storedWindowId, { focused: true });
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
  }, async (window) => {
    if (window?.id) {
      await setStoredWindowId(window.id);
    }
  });
};

chrome.action.onClicked.addListener(() => {
  openYTMWindow();
});

chrome.tabs.onCreated.addListener(async (tab) => {
  if (tab.pendingUrl?.includes("music.youtube.com") || tab.url?.includes("music.youtube.com")) {
    const url = tab.pendingUrl || tab.url;
    const storedWindowId = await getStoredWindowId();

    if (storedWindowId !== null && tab.windowId !== storedWindowId && url) {
      if (tab.id) {
        chrome.tabs.remove(tab.id);
      }
      openYTMWindow(url);
    }
  }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url?.includes("music.youtube.com")) {
    const storedWindowId = await getStoredWindowId();

    if (storedWindowId !== null && tab.windowId !== storedWindowId) {
      chrome.tabs.remove(tabId);
      openYTMWindow(changeInfo.url);
    }
  }
});

chrome.windows.onRemoved.addListener(async (windowId) => {
  const storedWindowId = await getStoredWindowId();

  if (windowId === storedWindowId) {
    await setStoredWindowId(null);
  }
});