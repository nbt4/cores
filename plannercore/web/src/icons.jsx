// Schlanke Inline-SVG-Icons im Fluent-Stil
const paths = {
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  bell: <><path d="M18 9a6 6 0 1 0-12 0c0 7-2 8-2 8h16s-2-1-2-8" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  sun: <><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19" /></>,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  calendar: <><rect x="3.5" y="5" width="17" height="16" rx="2" /><path d="M3.5 9.5h17M8 3v4M16 3v4" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  circle: <circle cx="12" cy="12" r="8.5" />,
  half: <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" /></>,
  checkCircle: <><circle cx="12" cy="12" r="8.5" /><path d="M8 12.5l2.8 2.8L16.5 9.5" /></>,
  urgent: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5.5M12 16.4v.2" /></>,
  important: <path d="M6 21V4.5c4-2.5 8 2.5 12 0V14c-4 2.5-8-2.5-12 0" />,
  low: <path d="M12 5v13M6.5 13.5L12 19l5.5-5.5" />,
  medium: <path d="M5 9h14M5 15h14" />,
  trash: <path d="M4.5 6.5h15M9.5 6V4.5h5V6M6.5 6.5l1 13h9l1-13M10 10.5v5M14 10.5v5" />,
  edit: <path d="M4 20h4l11-11-4-4L4 16v4zM13.5 6.5l4 4" />,
  dots: <><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.7" fill="currentColor" stroke="none" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 20.5c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" /></>,
  users: <><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 19.5c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5" /><path d="M15.5 5.5a3.5 3.5 0 0 1 0 6.7M17.5 15.2c2 .6 3.3 2 4 4.3" /></>,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />,
  starFill: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" fill="currentColor" />,
  board: <><rect x="3.5" y="4" width="5" height="16" rx="1" /><rect x="9.5" y="4" width="5" height="11" rx="1" /><rect x="15.5" y="4" width="5" height="7" rx="1" /></>,
  grid: <><path d="M3.5 5.5h17M3.5 10h17M3.5 14.5h17M3.5 19h17" /></>,
  chart: <><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7" y="11" width="3" height="6" rx=".5" /><rect x="12" y="7" width="3" height="10" rx=".5" /><rect x="17" y="13" width="3" height="4" rx=".5" /></>,
  filter: <path d="M4 5.5h16l-6.2 7v5l-3.6 2v-7z" />,
  comment: <path d="M21 11.5a8.5 8.5 0 0 1-12.7 7.4L3 20.5l1.6-5.3A8.5 8.5 0 1 1 21 11.5z" />,
  attach: <path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7-7l8.4-8.5a3.3 3.3 0 0 1 4.7 4.7L10 16.8a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />,
  checklist: <path d="M4 6.5l1.5 1.5L8 5.5M4 12.5l1.5 1.5L8 11.5M4 18.5l1.5 1.5L8 17.5M11 7h9M11 13h9M11 19h9" />,
  label: <><path d="M3.5 12.5v-8a1 1 0 0 1 1-1h8L21 12l-8.5 8.5z" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" /></>,
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  chevronDown: <path d="M6 9.5l6 6 6-6" />,
  chevronLeft: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  chevronRight: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  logout: <><path d="M14.5 8V5.5a1.5 1.5 0 0 0-1.5-1.5H6a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 6 20h7a1.5 1.5 0 0 0 1.5-1.5V16" /><path d="M9.5 12H21M17.5 8.5L21 12l-3.5 3.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8l1.2 2.4 2.6.5 1.9-1.9 1.7 1.7-1.9 1.9.5 2.6 2.4 1.2-1.2 2.4-2.6.5-.5 2.6 1.9 1.9-1.7 1.7-1.9-1.9-2.6.5-1.2 2.4-1.2-2.4-2.6-.5-1.9 1.9-1.7-1.7 1.9-1.9-.5-2.6L2.8 12l2.4-1.2.5-2.6-1.9-1.9 1.7-1.7 1.9 1.9 2.6-.5z" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="1.5" /><path d="M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3" /></>,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  home: <path d="M4 11.5L12 4l8 7.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" />,
  inbox: <><path d="M3.5 13.5h5l1.5 2.5h4l1.5-2.5h5" /><path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7A1.5 1.5 0 0 1 5 5.5z" /></>,
  alert: <><path d="M12 3.5L22 20H2z" /><path d="M12 9.5v4.5M12 17.2v.2" /></>,
};

export default function Icon({ name, size = 18, className = '', style }) {
  return (
    <svg
      className={`icon ${className}`}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.circle}
    </svg>
  );
}
