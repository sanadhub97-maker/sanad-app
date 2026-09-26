// The alert cards' stylesheet — the one approved in the design preview.
// Sizes are in cqw (percent of the card width), so the same card renders at
// 1080px for WhatsApp and at any width for the preview in Settings.
export const CARD_CSS = `
*, *::before, *::after { box-sizing: border-box; }
.cardbox { container-type: inline-size; width: 100%; }
/* clip, not hidden: a watermark past the edge must not make the card a scroll box. */
.card { width: 100%; aspect-ratio: 4 / 5; border-radius: 5px; overflow: clip; position: relative; direction: rtl; font-family: var(--font); line-height: 1.35; isolation: isolate; -webkit-font-smoothing: antialiased; }
.card * { margin: 0; }
.ltr { direction: ltr; unicode-bidi: isolate; }
/* Apple-style squircle icon: vertical gradient, white glyph, soft coloured shadow. */
.tile { --s: 8cqw; width: var(--s); height: var(--s); border-radius: calc(var(--s) * .2237); display: grid; place-items: center; color: #fff; flex: none;
  background: linear-gradient(180deg, var(--a), var(--b)); box-shadow: inset 0 .25cqw 0 rgba(255, 255, 255, .28), 0 .8cqw 1.8cqw -.8cqw var(--b); }
.tile svg { width: 56%; height: 56%; }
.t-blue { --a: #3a9bff; --b: #0055d4; } .t-green { --a: #4cd964; --b: #1c9e45; } .t-indigo { --a: #7b7cf5; --b: #4b3fd0; }
.t-teal { --a: #43c4d9; --b: #0e8f9e; } .t-purple { --a: #cc73f8; --b: #8e2fc9; } .t-gray { --a: #a1a1a6; --b: #636366; }
.t-brand { --a: #2cc3f7; --b: #0079b8; } .t-sev { --a: var(--sev-a); --b: var(--sev-b); }

/* 1 — Wallet pass */
.c-pass { background: linear-gradient(165deg, #18c0f7 0%, #00a3e0 42%, #0a6cb4 100%); color: #fff; padding: 6.5cqw 6.5cqw 5cqw; display: flex; flex-direction: column; }
.c-pass .wm { position: absolute; left: -14cqw; bottom: 12cqw; width: 78cqw; opacity: .09; filter: brightness(0) invert(1); z-index: -1; }
.c-pass .top { display: flex; align-items: center; justify-content: space-between; gap: 4cqw; }
.c-pass .plate { background: #fff; border-radius: 3cqw; padding: 1.4cqw 2cqw; flex: none; display: block; box-shadow: 0 1cqw 3cqw -1cqw rgba(0, 40, 80, .45); }
.c-pass .plate img { height: 12.5cqw; width: auto; display: block; }
.c-pass .kind { text-align: left; }
.c-pass .kind small { display: block; font-size: 2.7cqw; opacity: .8; letter-spacing: .02em; }
.c-pass .kind b { font-size: 4.2cqw; font-weight: 700; }
.c-pass .primary { margin-top: 7cqw; }
.c-pass .lbl { font-size: 2.7cqw; opacity: .78; font-weight: 500; }
.c-pass .primary .v { font-size: 7.6cqw; font-weight: 700; line-height: 1.2; margin-top: .6cqw; }
.c-pass .primary .en { font-size: 3.2cqw; opacity: .82; margin-top: .6cqw; text-align: right; }
.c-pass .fields { display: grid; grid-template-columns: 1fr 1fr 1.15fr; gap: 3cqw; margin-top: 6cqw; }
.c-pass .fields .v { font-size: 3.9cqw; font-weight: 600; margin-top: .5cqw; }
.c-pass .perf { margin-top: auto; border-top: .45cqw dashed rgba(255, 255, 255, .45); margin-inline: -6.5cqw; }
.c-pass .status { margin-top: 4cqw; background: #fff; color: #1d1d1f; border-radius: 3.6cqw; padding: 3.6cqw 4cqw; display: flex; align-items: center; gap: 3.4cqw; box-shadow: 0 1.2cqw 3cqw -1.4cqw rgba(0, 30, 70, .5); }
.c-pass .status .tx b { display: block; font-size: 5.2cqw; font-weight: 700; color: var(--sev-text); line-height: 1.2; }
.c-pass .status .tx small { font-size: 3cqw; color: #6e6e73; }
.c-pass .status .ring { margin-right: auto; width: 13cqw; height: 13cqw; }
.c-pass .foot { text-align: center; font-size: 2.5cqw; opacity: .8; margin-top: 3cqw; }

/* 2 — iOS grouped list (light) */
.c-ios { background: #f2f2f7; color: #1d1d1f; padding: 5cqw 5cqw 4cqw; display: flex; flex-direction: column; gap: 3cqw; }
.c-ios .top { display: flex; align-items: center; justify-content: space-between; }
.c-ios .top img { height: 11cqw; width: auto; }
.c-ios .top small { font-size: 2.9cqw; color: #6e6e73; font-weight: 500; }
.c-ios h4 { font-size: 7.2cqw; font-weight: 700; letter-spacing: -.01em; line-height: 1.15; margin-top: -.6cqw; }
.c-ios .hero { background: #fff; border-radius: 3.8cqw; padding: 3.6cqw 4.2cqw; display: flex; align-items: center; gap: 4.5cqw; }
.c-ios .hero .ring { width: 22cqw; height: 22cqw; flex: none; position: relative; }
.c-ios .hero .ring > div { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; }
.c-ios .hero .ring b { font-size: 8.4cqw; font-weight: 700; line-height: 1; }
.c-ios .hero .ring small { font-size: 2.6cqw; color: #6e6e73; }
.c-ios .hero .ring b.word { font-size: 4.6cqw; }
.c-ios .hero .sev { font-size: 3cqw; font-weight: 700; color: var(--sev-text); display: flex; align-items: center; gap: 1.4cqw; }
.c-ios .hero .big { font-size: 5.6cqw; font-weight: 700; line-height: 1.25; margin-top: .6cqw; }
.c-ios .hero .sub { font-size: 3cqw; color: #6e6e73; margin-top: .6cqw; }
.c-ios .list { background: #fff; border-radius: 3.8cqw; padding-inline: 3.8cqw; }
.c-ios .row { display: flex; align-items: center; gap: 3cqw; min-height: 11cqw; }
.c-ios .row .tile { --s: 7.4cqw; }
.c-ios .row .in { flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 3cqw; align-self: stretch; }
.c-ios .row + .row .in { border-top: .3cqw solid #e5e5ea; }
.c-ios .row .in span { font-size: 3.3cqw; }
.c-ios .row .in b { font-size: 3.2cqw; font-weight: 500; color: #6e6e73; text-align: left; max-width: 62%; line-height: 1.3; }
.c-ios .foot { text-align: center; font-size: 2.5cqw; color: #8e8e93; margin-top: auto; }

/* 3 — Dark bento */
.c-bento { background: #000; color: #f5f5f7; padding: 5cqw 5cqw 4cqw; display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: min-content; gap: 2.6cqw; align-content: start; }
.c-bento .top { grid-column: 1 / -1; display: flex; align-items: center; gap: 3cqw; }
.c-bento .plate { background: #fff; border-radius: 2.6cqw; height: 13cqw; width: 13cqw; display: grid; place-items: center; flex: none; }
.c-bento .plate img { width: 76%; }
.c-bento .top b { display: block; font-size: 3.5cqw; font-weight: 600; line-height: 1.3; }
.c-bento .top small { font-size: 2.8cqw; color: #98989d; }
.c-bento .box { background: #1c1c1e; border-radius: 4cqw; padding: 3.4cqw; }
.c-bento .hero { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 4cqw; padding-block: 4cqw; }
.c-bento .hero .num { display: flex; align-items: baseline; gap: 2cqw; }
.c-bento .hero .num b { font-size: 20cqw; font-weight: 700; line-height: .8; color: var(--sev); letter-spacing: -.03em; }
.c-bento .hero .num b.word { font-size: 10cqw; line-height: 1; }
.c-bento .hero .num span { font-size: 4.2cqw; color: #98989d; font-weight: 500; }
.c-bento .hero .side { display: grid; gap: 2cqw; justify-items: start; max-width: 44%; }
.c-bento .hero .side .tile { --s: 9cqw; }
.c-bento .hero .side p { font-size: 3.6cqw; font-weight: 600; line-height: 1.3; }
.c-bento .hero .side small { font-size: 2.8cqw; color: #98989d; }
.c-bento .segs { grid-column: 1 / -1; display: flex; gap: .9cqw; margin-top: -1cqw; }
.c-bento .segs i { flex: 1; height: 1.6cqw; border-radius: 1cqw; background: #2c2c2e; }
.c-bento .segs i.on { background: var(--sev); }
.c-bento .cell { display: grid; gap: 1.1cqw; align-content: start; }
.c-bento .cell .tile { --s: 6.6cqw; }
.c-bento .cell small { font-size: 2.7cqw; color: #98989d; }
.c-bento .cell b { font-size: 3.3cqw; font-weight: 600; line-height: 1.3; }
.c-bento .foot { grid-column: 1 / -1; text-align: center; font-size: 2.5cqw; color: #636366; margin-top: .6cqw; }

/* 4 — Health-style highlight */
.c-health { background: #fff; color: #1d1d1f; padding: 6cqw 6cqw 5cqw; display: flex; flex-direction: column; }
.c-health .cat { display: flex; align-items: center; gap: 2.4cqw; }
.c-health .cat .tile { --s: 7.6cqw; }
.c-health .cat b { font-size: 3.8cqw; font-weight: 700; color: var(--sev-text); }
.c-health .cat small { margin-right: auto; font-size: 3cqw; color: #8e8e93; }
.c-health h4 { font-size: 6.2cqw; font-weight: 700; line-height: 1.3; margin-top: 5cqw; letter-spacing: -.005em; }
.c-health .metric { display: flex; align-items: baseline; gap: 2.4cqw; margin-top: 5cqw; }
.c-health .metric b { font-size: 22cqw; font-weight: 700; line-height: .85; letter-spacing: -.03em; }
.c-health .metric b.word { font-size: 11cqw; line-height: 1; color: var(--sev-text); }
.c-health .metric span { font-size: 4.4cqw; color: #8e8e93; font-weight: 500; }
.c-health .track { position: relative; height: 3.2cqw; border-radius: 2cqw; background: #f2f2f7; margin-top: 6cqw; overflow: hidden; }
.c-health .track i { position: absolute; inset-block: 0; right: 0; border-radius: 2cqw; background: var(--sev); }
.c-health .scale { display: flex; justify-content: space-between; font-size: 2.6cqw; color: #8e8e93; margin-top: 1.4cqw; }
.c-health .rows { margin-top: 5.5cqw; display: grid; gap: 2.8cqw; }
.c-health .r { display: flex; align-items: center; gap: 2.8cqw; font-size: 3.3cqw; }
.c-health .r .tile { --s: 6.8cqw; }
.c-health .r span { color: #6e6e73; }
.c-health .r b { font-weight: 600; margin-right: auto; text-align: left; }
.c-health .foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; padding-top: 3.4cqw; border-top: .3cqw solid #e5e5ea; }
.c-health .foot img { height: 9cqw; }
.c-health .foot small { font-size: 2.5cqw; color: #8e8e93; }

/* 5 — Lock screen notification */
.c-lock { color: #fff; padding: 7cqw 5cqw 5cqw; display: flex; flex-direction: column; align-items: center;
  background: radial-gradient(90% 60% at 80% 10%, #3cd3ff 0%, transparent 60%), radial-gradient(80% 70% at 10% 60%, #2d5bff 0%, transparent 65%), radial-gradient(90% 60% at 70% 100%, #7a3cf0 0%, transparent 60%), #0a2f8a; }
.c-lock .wm { position: absolute; width: 96cqw; left: 2cqw; top: 26cqw; opacity: .08; filter: brightness(0) invert(1); z-index: -1; }
.c-lock .lock { width: 5cqw; height: 5cqw; opacity: .9; }
.c-lock .date { font-size: 3.8cqw; font-weight: 600; opacity: .92; margin-top: 1.6cqw; }
.c-lock .time { font-size: 22cqw; font-weight: 600; line-height: 1; letter-spacing: -.02em; margin-top: .4cqw; text-shadow: 0 .4cqw 2cqw rgba(0, 0, 0, .15); }
.c-lock .stack { margin-top: auto; width: 100%; position: relative; }
.c-lock .stack::after { content: ""; position: absolute; left: 4cqw; right: 4cqw; bottom: -2.2cqw; height: 6cqw; border-radius: 0 0 4cqw 4cqw; background: rgba(255, 255, 255, .38); z-index: -1; }
.c-lock .note { background: rgba(245, 245, 247, .86); color: #1d1d1f; border-radius: 4.4cqw; padding: 3.4cqw 3.8cqw 3.8cqw; box-shadow: 0 2cqw 6cqw -2cqw rgba(0, 0, 0, .35); }
.c-lock .note .hd { display: flex; align-items: center; gap: 2.2cqw; }
.c-lock .note .app { width: 7.6cqw; height: 7.6cqw; border-radius: 1.7cqw; background: #fff; display: grid; place-items: center; box-shadow: 0 0 0 .2cqw rgba(0, 0, 0, .06); }
.c-lock .note .app img { width: 72%; }
.c-lock .note .hd span { font-size: 2.9cqw; color: #6e6e73; font-weight: 600; letter-spacing: .02em; }
.c-lock .note .hd small { margin-right: auto; font-size: 2.7cqw; color: #8e8e93; }
.c-lock .note h4 { font-size: 3.9cqw; font-weight: 700; margin-top: 2.2cqw; display: flex; align-items: center; gap: 1.6cqw; }
.c-lock .note p { font-size: 3.4cqw; color: #3a3a3c; margin-top: .8cqw; line-height: 1.45; }
.c-lock .qa { width: 100%; display: flex; justify-content: space-between; margin-top: 6cqw; padding-inline: 3cqw; }
.c-lock .qa span { width: 10.5cqw; height: 10.5cqw; border-radius: 50%; background: rgba(255, 255, 255, .18); display: grid; place-items: center; }
.c-lock .qa svg { width: 45%; height: 45%; }

/* 6 — Official letterhead */
.c-letter { background: #fff; color: #1d1d1f; display: flex; flex-direction: column; }
.c-letter .head { padding: 5cqw 7cqw 0; text-align: center; }
.c-letter .head img { height: 16cqw; }
.c-letter .head .en { font-size: 2.6cqw; color: #8e8e93; margin-top: 1cqw; letter-spacing: .01em; }
.c-letter .rule { height: .6cqw; margin: 3cqw 7cqw 0; border-radius: 1cqw; background: linear-gradient(90deg, transparent, #00b1ef 20%, #0a6cb4 50%, #00b1ef 80%, transparent); }
.c-letter h4 { text-align: center; font-size: 5.4cqw; font-weight: 700; margin-top: 3.4cqw; }
.c-letter .chip { align-self: center; margin-top: 2cqw; background: var(--sev-soft); color: var(--sev-text); font-weight: 700; font-size: 3.2cqw; padding: 1cqw 3.4cqw; border-radius: 99px; display: inline-flex; align-items: center; gap: 1.4cqw; }
.c-letter .tbl { margin: 3.4cqw 6cqw 0; border: .3cqw solid #e5e5ea; border-radius: 3.4cqw; overflow: hidden; }
.c-letter .tr { display: flex; align-items: center; gap: 2.6cqw; padding: 1.9cqw 3cqw; }
.c-letter .tr + .tr { border-top: .3cqw solid #e5e5ea; }
.c-letter .tr:nth-child(odd) { background: #fafafc; }
.c-letter .tr .tile { --s: 6cqw; }
.c-letter .tr > span:not(.tile) { font-size: 3cqw; color: #6e6e73; min-width: 19cqw; }
.c-letter .tr b { font-size: 3.2cqw; font-weight: 600; line-height: 1.3; }
.c-letter .band { margin-top: auto; background: linear-gradient(90deg, #0a6cb4, #00b1ef); color: #fff; padding: 2.6cqw 7cqw; display: flex; justify-content: space-between; font-size: 2.6cqw; }

/* ================= Luxury set ================= */
.etched { filter: brightness(0) invert(1); }
.silver-txt { background: linear-gradient(180deg, #ffffff 0%, #d9dbde 55%, #a9acb1 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }

/* 7 — Titanium */
.c-ti { color: #f2f2f4; padding: 7cqw 7cqw 6cqw; display: flex; flex-direction: column;
  background: linear-gradient(135deg, #62666c 0%, #92959a 20%, #50545a 42%, #7d8086 66%, #3c3f44 100%); }
.c-ti::before { content: ""; position: absolute; inset: 0; z-index: -1;
  background: repeating-linear-gradient(90deg, rgba(255, 255, 255, .045) 0 .22cqw, rgba(0, 0, 0, .05) .22cqw .5cqw),
              radial-gradient(120% 60% at 20% 0%, rgba(255, 255, 255, .28), transparent 55%); }
.c-ti::after { content: ""; position: absolute; inset: 1.6cqw; border-radius: 3.4cqw; border: .3cqw solid rgba(255, 255, 255, .16); box-shadow: inset 0 .3cqw 0 rgba(255, 255, 255, .12); pointer-events: none; }
.c-ti .top { display: flex; align-items: center; justify-content: space-between; }
.c-ti .top img { width: 13cqw; opacity: .9; filter: brightness(0) invert(1) drop-shadow(0 .3cqw .2cqw rgba(0, 0, 0, .35)); }
.c-ti .top span { font-size: 2.6cqw; letter-spacing: .35em; opacity: .62; font-weight: 600; }
.c-ti .kick { margin-top: 12cqw; font-size: 3cqw; opacity: .66; }
.c-ti h4 { font-size: 10cqw; font-weight: 600; line-height: 1.12; margin-top: .8cqw; letter-spacing: -.01em; }
.c-ti .led { display: inline-flex; align-items: center; gap: 1.8cqw; margin-top: 2.6cqw; font-size: 3.1cqw; font-weight: 600; background: rgba(0, 0, 0, .22); padding: 1cqw 3cqw; border-radius: 99px; align-self: flex-start; box-shadow: inset 0 0 0 .25cqw rgba(255, 255, 255, .1); }
.c-ti .led i { width: 2cqw; height: 2cqw; border-radius: 50%; background: var(--sev); box-shadow: 0 0 1.6cqw var(--sev), 0 0 .4cqw var(--sev); }
.c-ti .rule { height: .25cqw; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .35), transparent); margin-top: auto; }
.c-ti .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 3.4cqw 4cqw; margin-top: 4.4cqw; }
.c-ti .grid2 small { display: block; font-size: 2.5cqw; opacity: .58; letter-spacing: .04em; }
.c-ti .grid2 b { font-size: 3.5cqw; font-weight: 600; line-height: 1.3; }
.c-ti .foot { display: flex; justify-content: space-between; margin-top: 5cqw; font-size: 2.5cqw; opacity: .6; }

/* 8 — White card (Apple Card style) */
.c-card { color: #1d1d1f; padding: 7.5cqw; display: flex; flex-direction: column;
  background: radial-gradient(110% 70% at 15% 0%, #ffffff 0%, transparent 60%), linear-gradient(150deg, #fdfdfd 0%, #f0f0f2 55%, #e3e3e7 100%); }
.c-card::after { content: ""; position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 .3cqw rgba(0, 0, 0, .05); pointer-events: none; }
.c-card .top { display: flex; align-items: flex-start; justify-content: space-between; }
.c-card .top img { height: 16cqw; }
.c-card .top .mk { width: 10cqw; filter: grayscale(1) brightness(1.35) contrast(.9); opacity: .55; }
.c-card .mid { margin-top: auto; }
.c-card .mid small { font-size: 3cqw; color: #8e8e93; }
.c-card .num { display: flex; align-items: baseline; gap: 2.4cqw; margin-top: 1cqw; }
.c-card .num b { font-size: 25cqw; font-weight: 300; line-height: .82; letter-spacing: -.04em; color: #1d1d1f; }
.c-card .num b.word { font-size: 12cqw; font-weight: 400; line-height: 1; color: var(--sev-text); }
.c-card .num span { font-size: 4.4cqw; color: #8e8e93; }
.c-card .pill { display: inline-flex; align-items: center; gap: 1.6cqw; margin-top: 3.4cqw; font-size: 3cqw; font-weight: 600; color: var(--sev-text); }
.c-card .pill i { width: 2cqw; height: 2cqw; border-radius: 50%; background: var(--sev); }
.c-card .holder { margin-top: 9cqw; font-size: 4.6cqw; font-weight: 500; color: #6e6e73; letter-spacing: .01em; }
.c-card .meta2 { display: flex; gap: 5cqw; margin-top: 1.6cqw; font-size: 3cqw; color: #8e8e93; }

/* 9 — Watch Ultra dial */
.c-dial { background: radial-gradient(70% 50% at 50% 40%, #0d2530 0%, #000 72%); color: #fff; padding: 6cqw 6cqw 5.5cqw; display: flex; flex-direction: column; align-items: center; }
.c-dial .top { width: 100%; display: flex; align-items: center; justify-content: space-between; font-size: 2.8cqw; color: #8e8e93; }
.c-dial .top img { width: 8.5cqw; }
.c-dial .dial { position: relative; width: 74cqw; height: 74cqw; margin-top: 2cqw; }
.c-dial .dial > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.c-dial .dial .ctr { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; text-align: center; }
.c-dial .dial .ctr small { font-size: 2.7cqw; color: var(--sev); font-weight: 700; letter-spacing: .08em; }
.c-dial .dial .ctr b { font-size: 21cqw; font-weight: 600; line-height: .95; letter-spacing: -.03em; }
.c-dial .dial .ctr b.word { font-size: 10cqw; color: var(--sev); }
.c-dial .dial .ctr span { font-size: 3.4cqw; color: #aeaeb2; }
.c-dial .who { margin-top: auto; text-align: center; }
.c-dial .who b { display: block; font-size: 4.8cqw; font-weight: 600; }
.c-dial .who span { font-size: 3cqw; color: #98989d; }
.c-dial .comps { display: flex; gap: 3cqw; margin-top: 3.4cqw; }
.c-dial .comps div { display: flex; align-items: center; gap: 1.6cqw; background: #1c1c1e; border-radius: 99px; padding: 1.2cqw 3cqw 1.2cqw 1.4cqw; font-size: 2.9cqw; font-weight: 600; }
.c-dial .comps .tile { --s: 5.6cqw; border-radius: 50%; }

/* 10 — Vision glass */
.c-vision { color: #fff; padding: 6cqw; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(60% 45% at 85% 12%, rgba(0, 177, 239, .9), transparent 70%), radial-gradient(55% 45% at 8% 45%, rgba(94, 92, 230, .85), transparent 70%),
    radial-gradient(70% 50% at 70% 95%, rgba(48, 176, 199, .8), transparent 70%), linear-gradient(180deg, #0b1630, #101a3a); }
.c-vision .win { width: 100%; background: linear-gradient(160deg, rgba(255, 255, 255, .24), rgba(255, 255, 255, .08)); border-radius: 6cqw; padding: 5cqw;
  box-shadow: inset 0 .3cqw 0 rgba(255, 255, 255, .45), inset 0 0 0 .3cqw rgba(255, 255, 255, .18), 0 3cqw 8cqw -3cqw rgba(0, 0, 20, .6); backdrop-filter: blur(3cqw) saturate(160%); }
.c-vision .hd { display: flex; align-items: center; gap: 3cqw; }
.c-vision .orn { width: 13cqw; height: 13cqw; border-radius: 50%; background: #fff; display: grid; place-items: center; box-shadow: 0 1cqw 3cqw -1cqw rgba(0, 0, 0, .5); flex: none; }
.c-vision .orn img { width: 70%; }
.c-vision .hd b { display: block; font-size: 4.6cqw; font-weight: 700; line-height: 1.25; }
.c-vision .hd small { font-size: 2.8cqw; opacity: .78; }
.c-vision .status { margin-top: 4.4cqw; display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, .16); border-radius: 4cqw; padding: 3.4cqw 4cqw; box-shadow: inset 0 0 0 .25cqw rgba(255, 255, 255, .1); }
.c-vision .status b { font-size: 6.4cqw; font-weight: 700; }
.c-vision .status small { display: block; font-size: 2.8cqw; opacity: .78; }
.c-vision .status .ring { width: 14cqw; height: 14cqw; }
.c-vision .pills { display: grid; gap: 2cqw; margin-top: 3.4cqw; }
.c-vision .pills div { display: flex; align-items: center; gap: 2.6cqw; background: rgba(255, 255, 255, .1); border-radius: 99px; padding: 1.4cqw 1.6cqw; box-shadow: inset 0 0 0 .2cqw rgba(255, 255, 255, .12); }
.c-vision .pills .tile { --s: 7cqw; border-radius: 50%; }
.c-vision .pills span { font-size: 2.8cqw; opacity: .75; min-width: 14cqw; }
.c-vision .pills b { font-size: 3.3cqw; font-weight: 600; }
.c-vision .bar { width: 22cqw; height: 1.4cqw; border-radius: 1cqw; background: rgba(255, 255, 255, .45); margin-top: 3cqw; }

/* 11 — Pearl */
.c-pearl { color: #1d1d1f; padding: 6cqw; display: flex; flex-direction: column;
  background: conic-gradient(from 210deg at 28% 22%, #e3f4ff, #efe6ff, #ffeef0, #fff5e2, #e4fbef, #e3f4ff); }
.c-pearl::before { content: ""; position: absolute; inset: 0; z-index: -1; background: radial-gradient(80% 50% at 80% 90%, rgba(0, 177, 239, .22), transparent 70%), radial-gradient(60% 40% at 10% 10%, rgba(255, 255, 255, .9), transparent 70%); }
.c-pearl .sheet { flex: 1; background: rgba(255, 255, 255, .72); border-radius: 5cqw; padding: 5.5cqw 5cqw 4.5cqw; display: flex; flex-direction: column;
  box-shadow: inset 0 0 0 .3cqw rgba(255, 255, 255, .9), 0 2cqw 6cqw -2cqw rgba(60, 60, 120, .25); }
.c-pearl .top { display: flex; align-items: center; justify-content: space-between; }
.c-pearl .top img { height: 13cqw; }
.c-pearl .top small { font-size: 2.7cqw; color: #8e8e93; }
.c-pearl h4 { font-size: 3.4cqw; color: #6e6e73; font-weight: 600; margin-top: 5cqw; }
.c-pearl .big { font-size: 8.4cqw; font-weight: 700; line-height: 1.2; margin-top: .6cqw; background: linear-gradient(90deg, var(--sev-b), var(--sev-a)); -webkit-background-clip: text; background-clip: text; color: transparent; }
.c-pearl .nm { font-size: 4.6cqw; font-weight: 600; margin-top: 1.6cqw; }
.c-pearl .rows { margin-top: auto; display: grid; gap: 2.4cqw; }
.c-pearl .r { display: flex; align-items: center; gap: 2.6cqw; font-size: 3.2cqw; }
.c-pearl .r .tile { --s: 6.8cqw; }
.c-pearl .r span { color: #6e6e73; }
.c-pearl .r b { font-weight: 600; margin-right: auto; text-align: left; }
.c-pearl .foot { text-align: center; font-size: 2.4cqw; color: #8e8e93; margin-top: 3cqw; }
`;
