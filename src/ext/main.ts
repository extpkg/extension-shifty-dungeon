type Instance = {
  tabId: string;
  windowId: string;
  websessionId: string;
  webviewId: string;
};

let instance: Instance | null = null;
let lock = false;

const title = "Shifty Dungeon";

const focusInstance = async () => {
  if (instance) {
    await ext.windows.restore(instance.windowId);
    await ext.windows.focus(instance.windowId);
  }
};

const destroyInstance = async () => {
  if (instance) {
    await ext.webviews.remove(instance.webviewId);
    await ext.websessions.remove(instance.websessionId);
    await ext.windows.remove(instance.windowId);
    await ext.tabs.remove(instance.tabId);
    instance = null;
  }
};

ext.runtime.onExtensionClick.addListener(async () => {
  if (instance || lock) {
    await focusInstance();
    return;
  }

  lock = true;

  let tab: ext.tabs.Tab | null = null;
  let window: ext.windows.Window | null = null;
  let websession: ext.websessions.Websession | null = null;
  let webview: ext.webviews.Webview | null = null;

  try {
    tab = await ext.tabs.create({
      text: title,
      icon: "./assets/128.png",
      mutable: true,
    });

    const width = 1066;
    const height = 600;
    const aspectRatio = width / height;
    const minWidth = 1066;
    const minHeight = minWidth / aspectRatio;

    window = await ext.windows.create({
      center: true,
      fullscreenable: true,
      title,
      icon: "./assets/128.png",
      darkMode: true,
      vibrancy: false,
      frame: false,
      titleBarStyle: "inset",
      width,
      height,
      minWidth,
      minHeight,
      aspectRatio,
    });

    const contentSize = await ext.windows.getContentSize(window.id);

    const permissions = await ext.runtime.getPermissions();
    const persistent =
      (permissions["websessions"] ?? {})["create.persistent"]?.granted ?? false;

    websession = await ext.websessions.create({
      partition: title,
      persistent,
      global: false,
    });
    await ext.websessions.setWebRequestFilter(
      websession.id,
      "beforeReceiveHeaders",
    );

    webview = await ext.webviews.create({
      window,
      websession,
      autoResize: { horizontal: true, vertical: true },
      bounds: { ...contentSize, x: 0, y: 0 },
    });

    await ext.webviews.loadFile(webview.id, "index.html");
    // await ext.webviews.openDevTools(webview.id, {
    //   mode: "detach",
    //   activate: true,
    // });

    await ext.windows.focus(window.id);
    await ext.webviews.focus(webview.id);

    instance = {
      tabId: tab.id,
      windowId: window.id,
      websessionId: websession.id,
      webviewId: webview.id,
    };
    lock = false;
  } catch (error) {
    console.error("ext.runtime.onExtensionClick", JSON.stringify(error));

    if (window) await ext.windows.remove(window.id);
    if (tab) await ext.tabs.remove(tab.id);
    if (websession) await ext.websessions.remove(websession.id);
    if (webview) await ext.webviews.remove(webview.id);
  }
});

ext.tabs.onClicked.addListener(async () => {
  try {
    await focusInstance();
  } catch (error) {
    console.log(error, "ext.tabs.onClicked");
  }
});

ext.tabs.onClickedMute.addListener(async () => {
  try {
    if (instance) {
      const muted = await ext.webviews.isAudioMuted(instance.webviewId);
      await ext.webviews.setAudioMuted(instance.webviewId, !muted);
      await ext.tabs.update(instance.tabId, { muted: !muted });
    }
  } catch (error) {
    console.log(error, "ext.tabs.onClickedMute");
  }
});

ext.tabs.onClickedClose.addListener(async () => {
  try {
    await destroyInstance();
  } catch (error) {
    console.log(error, "ext.tabs.onClickedClose");
  }
});

ext.tabs.onRemoved.addListener(async () => {
  try {
    await destroyInstance();
  } catch (error) {
    console.log(error, "ext.tabs.onRemoved");
  }
});

ext.windows.onClosed.addListener(async () => {
  try {
    await destroyInstance();
  } catch (error) {
    console.log(error, "ext.windows.onClosed");
  }
});

ext.windows.onRemoved.addListener(async () => {
  try {
    await destroyInstance();
  } catch (error) {
    console.log(error, "ext.windows.onRemoved");
  }
});

ext.runtime.onMessage.addListener(async (_event, details) => {
  if (details === "quit") await destroyInstance();
});

ext.websessions.onBeforeWebReceiveHeaders.addListener(
  async (event, details) => {
    await ext.websessions.webReceiveHeadersResponse(event.id, details.id, {
      responseHeaders: {
        ...details.responseHeaders,
        "Cross-Origin-Embedder-Policy": ["require-corp"],
        "Cross-Origin-Opener-Policy": ["same-origin"],
      },
    });
  },
);
