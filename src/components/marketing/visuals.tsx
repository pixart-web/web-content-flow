import {
  CalendarDays,
  FileOutput,
  Library,
  Megaphone,
  PanelsTopLeft,
  PlaySquare,
  ScrollText,
  Share2,
  Orbit,
} from "lucide-react";
import Image from "next/image";

import { canonicalFlow } from "@/content/marketing";

const icons = {
  Brief: ScrollText,
  "Brand Profile": Orbit,
  Website: PanelsTopLeft,
  Social: Share2,
  "Social Media": Share2,
  Ads: Megaphone,
  Video: PlaySquare,
  Copy: FileOutput,
  Calendar: CalendarDays,
  "Content Calendar": CalendarDays,
  Library,
  "Content Library": Library,
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
  const modules = [
    ["Brand Profile", "Your brand, always consistent", "brand"],
    ["Website", "Pages & SEO", "website"],
    ["Social Media", "Posts & campaigns", "social"],
    ["Ads", "Copy & creatives", "ads"],
    ["Video", "Scripts & direction", "video"],
    ["Content Calendar", "Plan & organise", "calendar"],
    ["Content Library", "Assets & versions", "library"],
  ] as const;
  return (
    <div
      className="constellation"
      aria-label="One Brief flowing into connected content modules"
    >
      <div className="constellation-core">
        <Image
          alt=""
          aria-hidden
          height={54}
          src="/brand/symbol/flow-mark.svg"
          width={54}
        />
        <span>One brief</span>
      </div>
      <div className="constellation-orbit" aria-hidden />
      <div className="constellation-lines" aria-hidden />
      <div className="constellation-modules">
        {modules.map(([name, description, position]) => {
          const Icon = icons[name];
          return (
            <div className={`ecosystem-node node-${position}`} key={name}>
              <span className="ecosystem-icon">
                <Icon aria-hidden size={20} strokeWidth={1.7} />
              </span>
              <span>
                <strong>{name}</strong>
                <small>{description}</small>
              </span>
            </div>
          );
        })}
      </div>
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
