# Dictionary Extension

A lightweight browser extension that lets you quickly look up word definitions from **Wiktionary** without leaving the page.  
Just double-click on any word (or press `Ctrl/⌘ + K` with a word selected) and a clean popup will show you the definition.

---

## ✨ Features

- 🔎 **Instant lookup**: Double-click a word or use the keyboard shortcut.  
- 📚 **Wiktionary integration**: Uses the official [Wikimedia API](https://www.mediawiki.org/wiki/API:REST_API) for Spanish definitions.  
- 🖼 **Minimal UI**: A small tooltip box appears on the page, styled for readability.  
- 🖱 **Non-intrusive**: Works on any website without interfering with normal browsing.  
- 🌍 **Language support**: Currently Spanish (`es`), with English planned.

---

## 🚀 Usage

1. Install the extension in your browser (Chrome / Edge / Firefox).  
2. Open any webpage.  
3. **Double-click** a word to see its definition.  
   - Alternatively, **select a word** and press `Ctrl + K` (Windows/Linux) or `⌘ + K` (Mac).  
4. A tooltip will appear with up to 4 definitions.  
5. Click **✕** to close the popup.

---

## ⚙️ Tech stack

- [React](https://react.dev/) + [Plasmo](https://plasmo.com/) for extension development.  
- Wiktionary (via Wikimedia API) as the dictionary source.  
- Custom HTML parsing and cleanup for better readability.  

---

## 📦 Installation (Development)

1. Clone this repo:
   ```bash
   git clone https://github.com/your-username/dictionary-extension.git
   cd dictionary-extension
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

4. Load the extension in your browser:
   - For **Chrome/Edge**: Go to `chrome://extensions/`, enable Developer Mode, click **Load unpacked**, and select the `build/chrome-mv3-dev` folder.  
   - For **Firefox**: Go to `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select the `manifest.json` from the `build/firefox-mv3-dev` folder.  

---

## 📖 Roadmap

- [ ] Add English definitions  
- [ ] Support synonyms and translations  
- [ ] Improve styling for mobile  
- [ ] Optional dark/light theme toggle  

---

## 📝 License

This project is for **educational and personal use only**.  
It uses definitions from **Wiktionary** (CC BY-SA 3.0).  

---

## 🙌 Acknowledgments

- [Wiktionary](https://www.wiktionary.org/) contributors.  
- [Plasmo Framework](https://plasmo.com/) for making extension development easier.
