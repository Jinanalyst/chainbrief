import Svg, { Circle, Path, Polyline, Rect, Polygon } from "react-native-svg";

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const base = (size = 22, color = "currentColor", strokeWidth = 1.8) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function HomeIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <Polyline points="9 22 9 12 15 12 15 22" />
    </Svg>
  );
}

export function ChartIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </Svg>
  );
}

export function BoltIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </Svg>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Circle cx="12" cy="12" r="9" />
      <Polyline points="12 7 12 12 15 14" />
    </Svg>
  );
}

export function PlayCircleIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Circle cx="12" cy="12" r="9" />
      <Polygon points="10 8 16 12 10 16 10 8" />
    </Svg>
  );
}

export function ChatIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </Svg>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </Svg>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Circle cx="11" cy="11" r="7" />
      <Path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

export function MenuIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Path d="M4 7h16" />
      <Path d="M4 12h16" />
      <Path d="M4 17h16" />
    </Svg>
  );
}

export function GiftIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Rect x="3" y="8" width="18" height="4" rx="1" />
      <Path d="M12 8v13" />
      <Path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <Path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </Svg>
  );
}

export function FireIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color ?? "#F4A93C", p.strokeWidth)}>
      <Path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-3-2 1-4 3-4 7a7 7 0 0 0 14 0c0-6-7-12-7-12z" fill={p.color ?? "#F4A93C"} stroke="none" />
    </Svg>
  );
}

export function PencilIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Path d="M12 20h9" />
      <Path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
    </Svg>
  );
}

export function RefreshIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Polyline points="23 4 23 10 17 10" />
      <Path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </Svg>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Polyline points="6 9 12 15 18 9" />
    </Svg>
  );
}

export function CommentIcon(p: IconProps) {
  return (
    <Svg {...base(p.size, p.color, p.strokeWidth)}>
      <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </Svg>
  );
}
