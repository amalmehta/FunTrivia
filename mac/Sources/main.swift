// FunTrivia for Mac: a native window, menu bar and Settings menu around the
// same game the website runs. The game's files are bundled in
// Contents/Resources/web and served to WebKit through a private
// funtrivia:// scheme, so ES modules and saved progress work offline.

import AppKit
import UniformTypeIdentifiers
import WebKit

let scheme = "funtrivia"
let startURL = URL(string: "\(scheme)://app/index.html")!
let helpURL = URL(string: "https://github.com/amalmehta/FunTrivia/blob/main/docs/INSTRUCTIONS.md")!

// Headless self-test (used by mac/test.sh): FUNTRIVIA_SELFTEST=<snapshot.png>
// loads the game, checks it booted, prints a JSON report, saves a snapshot and quits.
// FUNTRIVIA_DEMO=1 additionally loads a demo save into a throwaway data store.
let env = ProcessInfo.processInfo.environment
let selfTestSnapshot = env["FUNTRIVIA_SELFTEST"]
let demoMode = env["FUNTRIVIA_DEMO"] == "1"

// MARK: - Serving the bundled game

final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
  private let root: URL
  private static let types = [
    "html": "text/html", "js": "text/javascript", "css": "text/css", "svg": "image/svg+xml",
    "json": "application/json", "png": "image/png", "jpg": "image/jpeg", "md": "text/markdown",
  ]

  init(root: URL) { self.root = root.standardizedFileURL }

  func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
    guard let url = task.request.url else { return }
    let path = url.path.isEmpty || url.path == "/" ? "index.html" : String(url.path.dropFirst())
    let file = root.appendingPathComponent(path).standardizedFileURL
    // Only serve files inside the bundled web folder.
    guard file.path.hasPrefix(root.path + "/"), let data = try? Data(contentsOf: file) else {
      task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!)
      task.didFinish()
      return
    }
    let ext = file.pathExtension.lowercased()
    let mime = Self.types[ext] ?? UTType(filenameExtension: ext)?.preferredMIMEType ?? "application/octet-stream"
    let headers = ["Content-Type": mime, "Content-Length": String(data.count), "Cache-Control": "no-store"]
    task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers)!)
    task.didReceive(data)
    task.didFinish()
  }

  func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}

// MARK: - App

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
  private var window: NSWindow!
  private var webView: WKWebView!

  func applicationDidFinishLaunching(_ note: Notification) {
    NSApp.mainMenu = buildMenu()

    let config = WKWebViewConfiguration()
    let web = Bundle.main.resourceURL!.appendingPathComponent("web")
    config.setURLSchemeHandler(BundleSchemeHandler(root: web), forURLScheme: scheme)
    // Progress (localStorage) persists between launches; demo self-tests use a throwaway store.
    config.websiteDataStore = demoMode ? .nonPersistent() : .default()
    config.userContentController.add(self, name: "clipboard")
    // Lets the game know it runs inside the Mac app.
    config.userContentController.addUserScript(WKUserScript(
      source: "document.documentElement.dataset.host = 'mac';",
      injectionTime: .atDocumentStart, forMainFrameOnly: true))
    if selfTestSnapshot != nil {
      config.userContentController.addUserScript(WKUserScript(
        source: "window.__errors = []; addEventListener('error', e => __errors.push(String(e.message))); addEventListener('unhandledrejection', e => __errors.push(String(e.reason)));",
        injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }
    if demoMode {
      config.userContentController.addUserScript(WKUserScript(source: demoSaveScript, injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    webView = WKWebView(frame: .zero, configuration: config)
    webView.navigationDelegate = self
    webView.uiDelegate = self
    webView.setValue(false, forKey: "drawsBackground") // no white flash while loading
    webView.allowsMagnification = true
    if #available(macOS 13.3, *) { webView.isInspectable = true }

    window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1280, height: 820),
      styleMask: [.titled, .closable, .miniaturizable, .resizable],
      backing: .buffered, defer: false)
    window.title = "FunTrivia"
    window.minSize = NSSize(width: 900, height: 620)
    window.backgroundColor = NSColor(name: nil) { appearance in
      appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
        ? NSColor(srgbRed: 0.055, green: 0.071, blue: 0.125, alpha: 1)
        : NSColor(srgbRed: 0.957, green: 0.937, blue: 0.894, alpha: 1)
    }
    window.contentView = webView
    window.center()
    window.setFrameAutosaveName("FunTrivia Main Window")
    window.tabbingMode = .disallowed
    webView.load(URLRequest(url: startURL))
    if selfTestSnapshot != nil {
      // An invisible window counts as hidden, and WebKit stops painting hidden windows; keep it painting.
      webView.setValue(false, forKey: "_windowOcclusionDetectionEnabled")
      window.alphaValue = 0 // self-tests render invisibly and never take focus
      window.orderBack(nil)
    } else {
      window.makeKeyAndOrderFront(nil)
      NSApp.activate(ignoringOtherApps: true)
    }
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ app: NSApplication) -> Bool { true }

  // MARK: Self-test

  func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
    guard let snapshot = selfTestSnapshot else { return }
    DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { self.runSelfTest(snapshot: snapshot) }
  }

  private func runSelfTest(snapshot: String) {
    let js = """
    (() => {
      const KEY = 'funtrivia.selftest';
      const previous = localStorage.getItem(KEY);
      localStorage.setItem(KEY, String(Date.now()));
      return JSON.stringify({
        booted: !document.body.classList.contains('booting'),
        appObject: typeof window.funTrivia === 'object',
        settingsHook: typeof window.funTrivia?.openSettings === 'function',
        view: document.querySelector('.onboard-card') ? 'onboarding' : (document.querySelector('#view')?.className || ''),
        host: document.documentElement.dataset.host,
        storageWorks: localStorage.getItem(KEY) !== null,
        previousRun: previous,
        errors: window.__errors || []
      });
    })()
    """
    webView.evaluateJavaScript(js) { result, error in
      let report = (result as? String) ?? "{\"error\": \"\(error?.localizedDescription ?? "no result")\"}"
      print(report)
      let ok = report.contains("\"booted\":true") && report.contains("\"errors\":[]")
      // Never hang the test on the snapshot.
      DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
        FileHandle.standardError.write("selftest: snapshot timed out\n".data(using: .utf8)!)
        exit(ok ? 0 : 1)
      }
      self.webView.takeSnapshot(with: nil) { image, _ in
        if let image, let tiff = image.tiffRepresentation, let png = NSBitmapImageRep(data: tiff)?.representation(using: .png, properties: [:]) {
          try? png.write(to: URL(fileURLWithPath: snapshot))
        }
        exit(ok ? 0 : 1)
      }
    }
  }

  // MARK: Menu actions

  @objc func openSettings(_ sender: Any?) {
    webView.evaluateJavaScript("window.funTrivia && window.funTrivia.openSettings()")
  }

  @objc func openHelp(_ sender: Any?) { NSWorkspace.shared.open(helpURL) }

  @objc func reloadGame(_ sender: Any?) { webView.reload() }

  private func buildMenu() -> NSMenu {
    let main = NSMenu()

    let app = NSMenu(title: "FunTrivia")
    app.addItem(withTitle: "About FunTrivia", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
    app.addItem(.separator())
    app.addItem(NSMenuItem(title: "Settings…", action: #selector(openSettings(_:)), keyEquivalent: ","))
    app.addItem(.separator())
    app.addItem(withTitle: "Hide FunTrivia", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
    let hideOthers = app.addItem(withTitle: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
    hideOthers.keyEquivalentModifierMask = [.command, .option]
    app.addItem(withTitle: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
    app.addItem(.separator())
    app.addItem(withTitle: "Quit FunTrivia", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")

    let edit = NSMenu(title: "Edit")
    edit.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
    let redo = edit.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "z")
    redo.keyEquivalentModifierMask = [.command, .shift]
    edit.addItem(.separator())
    edit.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
    edit.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
    edit.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
    edit.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")

    let view = NSMenu(title: "View")
    view.addItem(withTitle: "Reload", action: #selector(reloadGame(_:)), keyEquivalent: "r")
    view.addItem(.separator())
    let full = view.addItem(withTitle: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
    full.keyEquivalentModifierMask = [.command, .control]

    let windowMenu = NSMenu(title: "Window")
    windowMenu.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
    windowMenu.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
    windowMenu.addItem(.separator())
    windowMenu.addItem(withTitle: "Bring All to Front", action: #selector(NSApplication.arrangeInFront(_:)), keyEquivalent: "")

    let help = NSMenu(title: "Help")
    help.addItem(withTitle: "FunTrivia Help", action: #selector(openHelp(_:)), keyEquivalent: "?")

    for menu in [app, edit, view, windowMenu, help] {
      let item = NSMenuItem()
      item.submenu = menu
      main.addItem(item)
    }
    NSApp.windowsMenu = windowMenu
    NSApp.helpMenu = help
    return main
  }

  // MARK: WebKit delegates

  /// Web links (http/https) open in the default browser; the game stays in the app.
  func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
    if let url = action.request.url, url.scheme != scheme, action.targetFrame?.isMainFrame ?? true {
      NSWorkspace.shared.open(url)
      decisionHandler(.cancel)
    } else {
      decisionHandler(.allow)
    }
  }

  /// The game uses confirm() before leaving a round or resetting progress.
  func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
    let alert = NSAlert()
    alert.messageText = message
    alert.addButton(withTitle: "OK")
    alert.addButton(withTitle: "Cancel")
    alert.beginSheetModal(for: window) { completionHandler($0 == .alertFirstButtonReturn) }
  }

  func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
    let alert = NSAlert()
    alert.messageText = message
    alert.beginSheetModal(for: window) { _ in completionHandler() }
  }

  /// Clipboard bridge for "Copy all" feedback (the web clipboard API isn't available on a custom scheme).
  func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
    guard message.name == "clipboard", let text = message.body as? String else { return }
    NSPasteboard.general.clearContents()
    NSPasteboard.general.setString(text, forType: .string)
  }
}

/// A save with some progress, used only by FUNTRIVIA_DEMO=1 to snapshot a lived-in world.
let demoSaveScript = """
if (!localStorage.getItem('funtrivia.save.v1')) localStorage.setItem('funtrivia.save.v1', JSON.stringify({
  version: 1, onboarded: true, player: { name: 'Traveler' },
  prefs: { favorites: ['cosmos', 'history'], pace: 'standard', theme: 'system', sound: false, reduceMotion: true, showFacts: true },
  xp: 2600, gems: 145,
  progress: { cosmos: [3,3,2,1,0], history: [3,2,2,0,0], lab: [3,1,0,0,0], wilds: [2,0,0,0,0] },
  buildings: { telescope: 3, keep: 2, alembic: 1, greenhouse: 1 },
  streak: { count: 4, lastDay: null }
}));
"""

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
