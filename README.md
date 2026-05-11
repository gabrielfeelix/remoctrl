# Remoctrl

> One tap. Every screen.

Universal smart TV remote — fast, honest, beautiful. Built with Tauri 2.0 (Rust + WebView), one codebase for desktop (Windows / macOS / Linux) and mobile (Android / iOS).

> Remoctrl is not affiliated with Roku, Samsung, LG, or any other TV manufacturer. All trademarks belong to their respective owners.

---

## Why

- **Floating modal always-on-top** on desktop (no competitor has it)
- **Global hotkey** to summon the remote (`Ctrl+Shift+N`)
- **Auto discovery** (SSDP / mDNS) — no IP typing
- **Clean UX** — zero ads, zero hostile paywall
- **One codebase** for 5 platforms via Tauri 2

## Stack

| Layer | Tech |
|---|---|
| Shell | Tauri 2.0 (Rust + WebView) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS + custom design system |
| State | Zustand |
| Discovery | `ssdp-client` (Rust) |
| TV protocols | Roku ECP (HTTP :8060) · Samsung Tizen (WSS :8002) · LG webOS (WS :3000) |
| Bundling | Tauri bundler (desktop + mobile) |

## Setup (first time)

### 1. Prereqs

- **Node.js** ≥ 20 (`node --version`)
- **Rust** stable (`rustc --version`) — install via [rustup](https://rustup.rs/)
- **System deps (Linux only)**:
  ```bash
  sudo apt-get install -y \
    libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev \
    libssl-dev libayatana-appindicator3-dev librsvg2-dev pkg-config libsoup-3.0-dev
  ```
- **macOS**: Xcode CLT (`xcode-select --install`)
- **Windows**: MSVC build tools + WebView2 (vem com Windows 10/11 atualizado)

### 2. Install

```bash
npm install
```

### 3. Generate icons (one-shot)

Tauri precisa dos ícones nas resoluções certas. Existe um SVG fonte em `src-tauri/icons/icon.svg` — gerar os PNGs/ICO/ICNS:

```bash
npm run tauri icon ./src-tauri/icons/icon.svg
```

### 4. Run dev

```bash
npm run tauri:dev
```

Abre uma janela 380×600 com o app. HMR ativo no React; mudanças no Rust recompilam o backend.

### 5. Build

```bash
npm run tauri:build
```

Bundles em `src-tauri/target/release/bundle/`.

---

## Project layout

```
system/                       # repo do app
├── src/                      # React + TS
│   ├── components/
│   │   ├── Remote/           # D-pad, botões, type-on-TV
│   │   ├── TVList/           # chips de TVs salvas
│   │   └── Onboarding/       # tutoriais por marca
│   ├── pages/
│   ├── hooks/                # useTV, useDiscovery
│   ├── stores/               # Zustand stores
│   ├── styles/               # globals.css (Tailwind)
│   └── App.tsx
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── main.rs           # entry desktop
│   │   ├── lib.rs            # entry shared (mobile + desktop)
│   │   ├── tv/               # adapters por marca
│   │   │   ├── mod.rs        # tipos comuns + (Sprint 1) trait TvController
│   │   │   ├── roku.rs       # ECP HTTP :8060
│   │   │   ├── samsung.rs    # Tizen WSS :8002
│   │   │   └── lg.rs         # webOS WS :3000
│   │   ├── discovery.rs      # SSDP / mDNS
│   │   └── tray.rs           # System tray
│   ├── capabilities/         # Tauri 2 permissions
│   ├── icons/                # ícones (gerar com `tauri icon`)
│   ├── tauri.conf.json
│   └── Cargo.toml
├── public/
├── package.json
└── README.md
```

A landing page mora em `../site/` (não faz parte deste pacote).
A referência de UI completa está em `../roku.html` (1531 linhas, será portada na Sprint 1).

---

## Roadmap

### Sprint 0 — scaffold ✅
Projeto inicializado, deps instaladas, config base pronta.

### Sprint 1 — Desktop Roku-only
- [ ] Janela principal modo "controle" (380×600)
- [ ] Modal flutuante always-on-top + toggle
- [ ] Atalho global `Ctrl+Shift+N`
- [ ] System tray com menu (Show / Hide / Settings / Quit)
- [ ] SSDP discovery automático
- [ ] Chips de TVs salvas
- [ ] Modal "Adicionar TV" + tutorial Permissive Mode
- [ ] D-pad + Home/Back/Vol/Mute/Play-Pause/Power
- [ ] Type-on-TV
- [ ] Atalhos de teclado
- [ ] Indicador de conexão

### Sprint 2 — Multi-TV
- [ ] Trait `TvController` em Rust (interface comum)
- [ ] Implementação Samsung (WebSocket + token)
- [ ] Implementação LG (handshake + client_key)
- [ ] Onboarding específico por marca
- [ ] Mensagens claras de erro

### Sprint 3 — Power features
- [ ] Atalhos de apps (Netflix, YouTube, Prime, Spotify)
- [ ] Macros (sequência de comandos com 1 clique)
- [ ] Atalhos de teclado customizáveis
- [ ] Tema claro + escuro
- [ ] Animações sutis

### Sprint 6 — monetização (Free vs Pro)
Ver tabela no spec interno.

---

## Privacy

- **Zero telemetry** without consent
- **Zero data** sent to third parties
- TV IPs stay local (no cloud)
- Crash reports opt-in only

## License

TBD.
