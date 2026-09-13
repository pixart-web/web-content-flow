import {
  CalendarDays,
  FileOutput,
  Library,
  Megaphone,
  PanelsTopLeft,
  PlaySquare,
  ScrollText,
  Share2,
  Sparkles,
} from "lucide-react";

import { canonicalFlow } from "@/content/marketing";

const icons = {
  Brief: ScrollText,
  "Brand Profile": Sparkles,
  Website: PanelsTopLeft,
  Social: Share2,
  Ads: Megaphone,
  Video: PlaySquare,
  Copy: FileOutput,
  Calendar: CalendarDays,
  Library,
  Export: FileOutput,
} as const;

export function FlowDiagram() {
  return (
    <ol className="flow-diagram" aria-label="Connected content workflow">
      {canonicalFlow.map(([name, description], index) => {
        const Icon = icons[name];
        return (
          <li key={name}>
            <div className="flow-index">
              {String(index + 1).padStart(2, "0")}
            </div>
            <Icon aria-hidden size={22} strokeWidth={1.5} />
            <div>
              <h3>{name}</h3>
              <p>{description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ContentConstellation() {
  return (
    <div
      className="constellation"
      aria-label="One Brief flowing into connected content modules"
    >
      <div className="constellation-card brief-card">
        <span>Brief</span>
        <strong>Campaign direction</strong>
        <i />
        <i />
      </div>
      <div className="flow-path" aria-hidden />
      <div className="constellation-core">
        <span>Brand Profile</span>
        <strong>One source of truth</strong>
        <div className="token-row">
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="output-grid">
        {["Website", "Social", "Ads", "Video", "Calendar", "Library"].map(
          (name) => (
            <div className="output-card" key={name}>
              <span>{name}</span>
              <i />
              <i />
            </div>
          ),
        )}
      </div>
      <p className="visual-caption">
        One strategy · connected outputs · retained context
      </p>
    </div>
  );
}

export function ProductMockup({ name = "Brand Profile" }: { name?: string }) {
  return (
    <div className="browser-frame">
      <div className="browser-bar" aria-hidden>
        <i />
        <i />
        <i />
        <span>Project / {name}</span>
      </div>
      <div className="mockup-body">
        <aside aria-hidden>
          {["Overview", "Brief", "Brand", "Content", "Calendar"].map((item) => (
            <i key={item}>{item}</i>
          ))}
        </aside>
        <div className="mockup-content">
          <span className="eyebrow">CURRENT VERSION · MOCK</span>
          <h3>{name}</h3>
          <div className="mockup-field">
            <b>Strategic direction</b>
            <span />
            <span />
          </div>
          <div className="mockup-columns">
            <div />
            <div />
          </div>
        </div>
      </div>
    </div>
  );
}
